/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/always-return */
/* eslint-disable import/prefer-default-export */

import { useEffect } from 'react';

export const useMicStream = (onData: (pcm: ArrayBuffer) => void) => {
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          pcm[i] = input[i] * 32767;
        }
        onData(pcm.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    });
  }, []);
};
