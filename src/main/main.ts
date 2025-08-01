/* eslint-disable prefer-destructuring */
/* eslint-disable object-shorthand */
/* eslint-disable no-multi-assign */
/* eslint-disable promise/always-return */
/* eslint-disable no-plusplus */
/* eslint-disable no-undef */
/* eslint-disable promise/catch-or-return */
import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  screen,
  globalShortcut,
} from 'electron';
import path from 'path';
import WebSocket from 'ws';
import { spawn } from 'child_process';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import fs from 'fs';
import os from 'os';

import { client, openKey } from '../lib/openai';
import { resolveHtmlPath } from './util';
import MenuBuilder from './menu';

let sttSocket: WebSocket | null = null;
let heartbeat: NodeJS.Timeout | null = null;

let mainWin: BrowserWindow | null = null;
let scriptWindow: BrowserWindow | null = null;
let settingWindow: BrowserWindow | null = null;
let micWindow: BrowserWindow | null = null;

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}
ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
});

const startWindow = async () => {
  // if (isDebug) await installExtensions();
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const width = 320;
  const height = 56;

  mainWin = new BrowserWindow({
    width: width,
    height: height,
    x: screenWidth,
    // x: screenWidth / 2 - width / 2,
    y: 10,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,

    webPreferences: {
      preload: app.isPackaged // preload 스크립트는 renderer에 안전한 API를 전달하기 위한 브릿지
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWin.loadURL(resolveHtmlPath('index.html'));
  mainWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // mainWin.setIgnoreMouseEvents(true, { forward: true });

  mainWin.on('ready-to-show', () => {
    if (!mainWin) {
      throw new Error('"mainWin" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWin.minimize();
    } else {
      mainWin.show();
    }
  });

  mainWin.on('closed', () => {
    mainWin = null; // 창이 닫히면 변수 초기화 -> garbage collector 유도
  });

  const menuBuilder = new MenuBuilder(mainWin);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWin.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

async function openOverlayWindow() {
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const width = 640;
  const height = 380;

  scriptWindow = new BrowserWindow({
    width: width,
    height: height,
    x: screenWidth / 2 - width / 2,
    y: 88,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  scriptWindow.loadURL('http://localhost:1212/index.html?overlay=1');
  scriptWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // scriptWindow.setIgnoreMouseEvents(true, { forward: true });
  scriptWindow.webContents.openDevTools({ mode: 'detach' });

  scriptWindow.on('closed', () => {
    scriptWindow = null; // 창이 닫히면 변수 초기화 -> garbage collector 유도
  });
}

async function openMicWindow() {
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const width = 640;
  const height = 380;

  micWindow = new BrowserWindow({
    width: width,
    height: height,
    x: screenWidth / 2 - width / 2,
    y: 88,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  micWindow.loadURL('http://localhost:1212/index.html?mic=1');
  micWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // scriptWindow.setIgnoreMouseEvents(true, { forward: true });
  micWindow.webContents.openDevTools({ mode: 'detach' });

  micWindow.on('closed', () => {
    micWindow = null; // 창이 닫히면 변수 초기화 -> garbage collector 유도
  });
}

async function openSetupWindow() {
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const width = 810;
  const height = 560;

  settingWindow = new BrowserWindow({
    width: width,
    height: height,
    x: screenWidth / 2 + 200,
    // x: screenWidth / 2 - width / 2,
    y: screenHeight / 2 - height / 2 + 100,
    // y: screenHeight / 2 - height / 2,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  settingWindow.loadURL('http://localhost:1212/index.html?setup=1');
  settingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  settingWindow.on('closed', () => {
    settingWindow = null; // 창이 닫히면 변수 초기화 -> garbage collector 유도
  });
}

const connectSocket = async (typed: 'speaker' | 'mic') => {
  if (sttSocket && sttSocket.readyState === WebSocket.OPEN) return;
  const apiKey = openKey || '';
  const url = 'wss://api.openai.com/v1/realtime?intent=transcription';
  sttSocket = new WebSocket(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  sttSocket.binaryType = 'arraybuffer';
  console.log('!Connect Socket');

  sttSocket.on('open', () => {
    const initMsg = {
      type: 'transcription_session.update',
      session: {
        input_audio_format: 'pcm16',
        input_audio_transcription: {
          model:
            typed === 'speaker'
              ? 'gpt-4o-mini-transcribe'
              : 'gpt-4o-mini-transcribe',
          prompt: '',
          language: typed === 'speaker' ? 'en' : 'ko',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 200,
          silence_duration_ms: 100,
        },
        input_audio_noise_reduction: {
          type: typed === 'speaker' ? 'near_field' : 'near_field',
        },
      },
    };

    sttSocket?.send(JSON.stringify(initMsg));

    console.log('\n\nSocket setting update\n\n');
    // Heartbeat 30s
    heartbeat = setInterval(() => {
      if (sttSocket?.readyState === WebSocket.OPEN) sttSocket.ping();
    }, 30 * 1000);
  });

  // 예: delta를 100ms 안에 모아서 전달
  let inactivityTimer: NodeJS.Timeout | null = null;

  const TIMEOUT_INACTIVITY = 2000;

  // sttSocket.onmessage;
  sttSocket.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('delta : ', msg);

    if (msg.delta) {
      if (typed === 'speaker' && scriptWindow)
        scriptWindow?.webContents.send('send-transcript', {
          type: 'delta',
          text: msg.delta,
        });
      else if (typed === 'mic' && micWindow)
        micWindow?.webContents.send('send-transcript', {
          type: 'delta',
          text: msg.delta,
        });
      else console.log('\n\n\nError Connecting Socket \n\n\n');

      // 비활성 타이머도 리셋
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (typed === 'speaker' && scriptWindow)
          scriptWindow?.webContents.send('send-transcript', {
            type: 'finalize', // 혹은 'inactivity-end' 등 원하는 타입
            text: '',
          });
        else if (typed === 'mic' && micWindow)
          micWindow?.webContents.send('send-transcript', {
            type: 'finalize', // 혹은 'inactivity-end' 등 원하는 타입
            text: '',
          });
      }, TIMEOUT_INACTIVITY);
    }
  });
};

const startOrStopSpeakerScripting = async () => {
  // 여기에는 browser를 열고 닫는 로직만 있다. 현재 구현은 시작-종료는 client 단에서 버튼으로 호출하도록 함.
  if (scriptWindow === null) {
    // script 시작 + Open.
    console.log('Start scripting of speaker');
    openOverlayWindow();
    if (mainWin) mainWin.webContents.send('start-record');
  } else if (scriptWindow !== null) {
    // scripting 중지 + Close. 창은 열려있게 하려다 창을 끄는 것과 scripting을 중지하고 시작하는 로직이 또 분리되면 더 헷갈릴 것 같아서 합침
    console.log('Stop/End scripting of speaker');
    if (mainWin) mainWin.webContents.send('stop-record');
    scriptWindow.close();
  }
};

const startOrStopMicScripting = async () => {
  if (micWindow === null) {
    console.log('Start scripting of speaker');
    openMicWindow();
    if (mainWin) mainWin.webContents.send('start-record-mic');
  } else if (micWindow !== null) {
    console.log('Stop/End scripting of speaker');
    if (mainWin) mainWin.webContents.send('stop-record-mic');
    micWindow.close();
  }
};

app
  .whenReady()
  .then(() => {
    startWindow();

    // Cmd + ] : 앱을 열었다 닫았다
    globalShortcut.register('CommandOrControl+]', () => {
      if (mainWin) {
        if (mainWin.isVisible()) {
          mainWin.webContents.send('animate-out');
          mainWin.webContents.send('end-record');

          setTimeout(() => {
            mainWin?.hide();
          }, 100); // 애니메이션이 시작된 후 show (선택적)

          globalShortcut.unregister('CommandOrControl+Right');
          globalShortcut.unregister('CommandOrControl+Left');
        } else {
          mainWin.webContents.send('animate-in');
          setTimeout(() => {
            mainWin?.show();
          }, 100); // 애니메이션이 시작된 후 show (선택적)
          // mainWin.focus();
        }
        // mainWin.webContents.send('shortcut-pressed'); // renderer에 이벤트 전달
      }
      if (settingWindow) settingWindow.close();
      if (scriptWindow) scriptWindow.close();
      if (micWindow) micWindow.close();
    });

    globalShortcut.register('CommandOrControl+L', () => {
      startOrStopSpeakerScripting();
    });

    ipcMain.on('open-mic-window', async () => {
      startOrStopMicScripting();
    });

    ipcMain.on('open-setup', async () => {
      console.log('오픈');
      openSetupWindow();
    });

    ipcMain.handle('toggle-speaker-scripting', async (_event) => {
      startOrStopSpeakerScripting();
    });
  })
  .catch(console.log);

// IPC: Receive audio buffer from renderer
ipcMain.on('stt-audio-realtime', (event, audioBuffer: string) => {
  if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
    // const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const msg = {
      type: 'input_audio_buffer.append',
      audio: audioBuffer,
    };
    sttSocket.send(JSON.stringify(msg));
  }
});
// // IPC: Receive audio buffer from renderer
// ipcMain.on('stt-audio-realtime', (event, audioBuffer: ArrayBuffer) => {
//   if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
//     const base64Audio = Buffer.from(audioBuffer).toString('base64');
//     const msg = {
//       type: 'input_audio_buffer.append',
//       audio: base64Audio,
//     };
//     sttSocket.send(JSON.stringify(msg));
//   }
// });

// IPC: Receive audio buffer from renderer
ipcMain.on('stt-audio', async (event, audioBuffer: ArrayBuffer) => {
  const pcmBuffer = Buffer.from(audioBuffer);

  const header = Buffer.alloc(44);
  header.write('RIFF', 0); // ChunkID
  header.writeUInt32LE(36 + pcmBuffer.length, 4); // ChunkSize
  header.write('WAVE', 8); // Format
  header.write('fmt ', 12); // Subchunk1ID
  header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(1, 22); // NumChannels
  header.writeUInt32LE(16000, 24); // SampleRate
  header.writeUInt32LE(16000 * 1 * 2, 28); // ByteRate = SampleRate * NumChannels * BitsPerSample/8
  header.writeUInt16LE(1 * 2, 32); // BlockAlign = NumChannels * BitsPerSample/8
  header.writeUInt16LE(16, 34); // BitsPerSample
  header.write('data', 36); // Subchunk2ID
  header.writeUInt32LE(pcmBuffer.length, 40); // Subchunk2Size

  // 헤더 + PCM 버퍼 합치기
  const wavBuffer = Buffer.concat([header, pcmBuffer]);

  // 임시 WAV 파일로 저장
  const tmpPath = path.join(os.tmpdir(), `chunk-${Date.now()}.wav`);
  fs.writeFileSync(tmpPath, wavBuffer);

  try {
    console.time('scripting');
    const res = await client.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'gpt-4o-mini-transcribe',
      response_format: 'json',
      // prompt: '',
    });
    console.log(' +++ ', res);
    const text = res.text;
    if (!text || text === undefined)
      throw new Error('Wrong transcription return');
    console.timeEnd('scripting');
    micWindow?.webContents.send('send-transcript', {
      type: 'delta',
      text: text,
      input_tokens: res.usage?.input_tokens,
      output_tokens: res.usage?.output_tokens,
    });
  } catch (err: any) {
    console.error('Transcription error', err);
    micWindow?.webContents.send('send-transcript', {
      type: 'delta',
      text: '(transcription error)',
      input_tokens: 0,
      output_tokens: 0,
    });
  } finally {
    fs.unlinkSync(tmpPath);
  }

  // if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
  //   const base64Audio = Buffer.from(audioBuffer).toString('base64');
  //   const msg = {
  //     type: 'input_audio_buffer.append',
  //     audio: base64Audio,
  //   };
  //   sttSocket.send(JSON.stringify(msg));
  // }
});

// IPC: Start STT session
ipcMain.handle('stt-start', async () => {
  await connectSocket('mic');
  if (!sttSocket) return;

  sttSocket.on('close', () => {
    if (heartbeat) clearInterval(heartbeat);
    sttSocket = null;
  });

  sttSocket.on('error', (err) => console.error('STT socket error:', err));
});

// IPC: Stop STT session
ipcMain.handle('stt-stop', () => {
  if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
    sttSocket.send(JSON.stringify({ type: 'session.close' }));
    sttSocket.close();
    sttSocket = null;
  }
});

// This is for speaker audio capture
let systemAudioProc: ReturnType<typeof spawn> | null = null;

ipcMain.on('start-system-audio', async () => {
  if (process.platform !== 'darwin') return;

  const systemAudioPath = app.isPackaged
    ? path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'assets',
        'SystemAudioDump',
      )
    : path.join(app.getAppPath(), 'assets', 'SystemAudioDump');

  systemAudioProc = spawn(systemAudioPath);
  const SAMPLE_RATE = 24000;
  const BYTES_PER_SAMPLE = 2;
  const CHANNELS = 2;
  const CHUNK_DURATION = 0.1;
  const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

  let audioBuffer = Buffer.alloc(0);

  await connectSocket('speaker');

  if (!sttSocket) {
    console.log('소켓이 안열림');
    return;
  }

  systemAudioProc.stdout?.on('data', (data) => {
    audioBuffer = Buffer.concat([audioBuffer, data]);

    while (audioBuffer.length >= CHUNK_SIZE) {
      const chunk = audioBuffer.slice(0, CHUNK_SIZE);
      audioBuffer = audioBuffer.slice(CHUNK_SIZE);

      const monoBuffer = convertStereoToMono(chunk);
      const base64Audio = monoBuffer.toString('base64');

      if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
        const msg = {
          type: 'input_audio_buffer.append',
          audio: base64Audio,
        };
        // console.log('보내긴 보냅니다.');
        sttSocket.send(JSON.stringify(msg));
      }
    }
  });

  systemAudioProc.stderr.on('data', (data) => {
    console.error('[SystemAudioDump]', data.toString());
  });

  systemAudioProc.on('close', () => {
    systemAudioProc = null;
    if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
      // sttSocket.send(JSON.stringify({ type: 'session.close' }));
      sttSocket.onmessage = sttSocket.onerror = () => {};
      sttSocket.close(1000, 'Client initiated close.');
      sttSocket = null;
    }
  });
});

ipcMain.on('stop-system-audio', () => {
  systemAudioProc?.kill('SIGTERM');
  systemAudioProc = null;
  if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
    // sttSocket.send(JSON.stringify({ type: 'session.close' }));
    sttSocket.onmessage = sttSocket.onerror = () => {};
    sttSocket.close(1000, 'Client initiated close.');
    sttSocket = null;
  }
});

const convertStereoToMono = (stereo: Buffer) => {
  const samples = stereo.length / 4;
  const mono = Buffer.alloc(samples * 2);

  for (let i = 0; i < samples; i++) {
    const left = stereo.readInt16LE(i * 4);
    mono.writeInt16LE(left, i * 2);
  }
  return mono;
};

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
