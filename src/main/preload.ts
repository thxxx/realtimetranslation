/* eslint-disable no-undef */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

contextBridge.exposeInMainWorld('electronAPI', {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  toggleSpeakerScripting: () => ipcRenderer.invoke('toggle-speaker-scripting'),
  startSTT: () => ipcRenderer.invoke('stt-start'),
  stopSTT: () => ipcRenderer.invoke('stt-stop'),
  sendAudio: (buffer: ArrayBuffer) => ipcRenderer.send('stt-audio', buffer),
  sendAudioStream: (buffer: string) =>
    ipcRenderer.send('stt-audio-realtime', buffer),
  onTranscript: (callback: (msg: { type: string; text: string }) => void) =>
    ipcRenderer.on('send-transcript', (_, msg) => {
      callback(msg);
    }),

  // 시스템 오디오 캡처 시작/종료
  startSystemAudio: () => ipcRenderer.send('start-system-audio'),
  stopSystemAudio: () => ipcRenderer.send('stop-system-audio'),
  startMicAudio: () => ipcRenderer.send('start-mic-audio'),
  stopMicAudio: () => ipcRenderer.send('stop-mic-audio'),

  openMicWindow: () => {
    ipcRenderer.send('open-mic-window');
  },
  openSetup: () => {
    ipcRenderer.send('open-setup');
  },
});
