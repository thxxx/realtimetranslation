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

import { openKey } from '../lib/openai';
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
    x: screenWidth / 2 - width / 2,
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

  micWindow.loadURL('http://localhost:1212/index.html?overlay=1');
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

  const width = 660;
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

const connectSocket = async () => {
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
          model: 'gpt-4o-mini-transcribe',
          prompt: '',
          language: 'en',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 200,
          silence_duration_ms: 80,
        },
        input_audio_noise_reduction: { type: 'near_field' },
      },
    };

    sttSocket?.send(JSON.stringify(initMsg));
    console.log('\n\nSocket setting update\n\n');
    // Heartbeat
    heartbeat = setInterval(() => {
      if (sttSocket?.readyState === WebSocket.OPEN) sttSocket.ping();
    }, 30000);
  });

  // 예: delta를 100ms 안에 모아서 전달
  let deltaBuffer: string[] = [];
  let deltaTimeout: NodeJS.Timeout | null = null;
  let inactivityTimer: NodeJS.Timeout | null = null;

  const TIMEOUT_DELTA = 100;
  const TIMEOUT_INACTIVITY = 2000;
  const STOP_WORDS = ['.', '?', '!'];

  const sendBuffer = (buf: string[]) => {
    scriptWindow?.webContents.send('send-transcript', {
      type: 'delta',
      text: buf.join(''),
    });
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      if (deltaBuffer.length > 0) {
        sendBuffer(deltaBuffer);
        deltaBuffer = [];
      }
    }, TIMEOUT_INACTIVITY);
  };

  // sttSocket.onmessage;
  sttSocket.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('delta : ', msg);

    if (msg.delta) {
      // 바로 보내기
      scriptWindow?.webContents.send('send-transcript', {
        type: 'delta',
        text: msg.delta,
      });

      // 비활성 타이머도 리셋
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        scriptWindow?.webContents.send('send-transcript', {
          type: 'finalize', // 혹은 'inactivity-end' 등 원하는 타입
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
    if (mainWin) mainWin.webContents.send('start-speaker-scripting');
  } else if (scriptWindow !== null) {
    // scripting 중지 + Close. 창은 열려있게 하려다 창을 끄는 것과 scripting을 중지하고 시작하는 로직이 또 분리되면 더 헷갈릴 것 같아서 합침
    console.log('Stop/End scripting of speaker');
    if (mainWin) mainWin.webContents.send('stop-speaker-scripting');
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

// IPC: Start STT session
ipcMain.handle('stt-start', async () => {
  await connectSocket();
  if (!sttSocket) return;

  sttSocket.on('close', () => {
    if (heartbeat) clearInterval(heartbeat);
    sttSocket = null;
  });

  sttSocket.on('error', (err) => console.error('STT socket error:', err));
});

// IPC: Receive audio buffer from renderer
ipcMain.on('stt-audio', (event, audioBuffer: ArrayBuffer) => {
  if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const msg = {
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    };
    sttSocket.send(JSON.stringify(msg));
  }
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

  await connectSocket();

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
