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
  onTranscript: (callback: (text: string) => void) =>
    ipcRenderer.on('send-transcript', (_, text) => {
      callback(text);
    }),

  // 시스템 오디오 캡처 시작/종료
  startSystemAudio: () => ipcRenderer.send('start-system-audio'),
  stopSystemAudio: () => ipcRenderer.send('stop-system-audio'),
  openSetup: () => {
    console.log('오픈 셋업');
    ipcRenderer.send('open-setup');
  },
});
