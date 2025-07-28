/* eslint-disable no-undef */
/* eslint-disable no-plusplus */
// === RealTimeTranscriber.tsx (Renderer · React) ===
import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  const [recording, setRecording] = useState(false);
  const [gettingSpeaker, setGettingSpeaker] = useState(false);
  const [transcript, setTranscript] = useState('');

  const audioCtxRef = useRef<AudioContext>(null);
  const procRef = useRef<ScriptProcessorNode>(null);
  const streamRef = useRef<MediaStream>(null);

  useEffect(() => {
    window.electronAPI.onTranscript((text) => {
      console.log('text ', text);
      setTranscript((prev) => prev + text);
    });
    return () => {
      stop();
    };
  }, []);

  const start = async () => {
    if (recording) return;
    await window.electronAPI.startSTT();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    procRef.current = processor;

    processor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(data.length);
      for (let i = 0; i < data.length; i++) {
        const s = Math.max(-1, Math.min(1, data[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      console.log('buffer 단위로 보냄. int16');
      window.electronAPI.sendAudio(int16.buffer);
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);

    setTranscript('');
    setRecording(true);
  };

  const stop = async () => {
    if (!recording) return;
    await window.electronAPI.stopSTT();
    procRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  return (
    <div className="p-4">
      <button
        onClick={() => (recording ? stop() : start())}
        className={`px-4 py-2 rounded text-white ${recording ? 'bg-red-600' : 'bg-green-600'}`}
      >
        {recording ? 'Stop STT' : 'Start STT'}
      </button>
      <div className="mt-4 p-3 bg-gray-100 h-40 overflow-auto">
        {transcript || (
          <span className="text-gray-400">Waiting for speech...</span>
        )}
      </div>

      <br />
      <br />
      <button
        onClick={() => (gettingSpeaker ? stop() : start())}
        className={`px-4 py-2 rounded text-white ${gettingSpeaker ? 'bg-red-600' : 'bg-green-600'}`}
      >
        {recording ? 'Stop Getting Speaker STT' : 'Start Getting Speaker STT'}
      </button>
    </div>
  );
}
