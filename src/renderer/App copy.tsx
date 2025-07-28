/* eslint-disable no-plusplus */
/* eslint-disable jsx-a11y/media-has-caption */
/* eslint-disable prefer-template */
/* eslint-disable promise/always-return */
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import React, { useEffect, useRef, useState } from 'react';

import './App.css';

function Hello() {
  const [transcript, setTranscript] = useState('');
  const wsRef = useRef<WebSocket>(null);

  const handleStart = async () => {
    wsRef.current = new WebSocket(
      'wss://api.openai.com/v1/realtime?intent=transcription',
    );
    wsRef.current.onopen = () => {
      wsRef.current!.send(
        JSON.stringify({
          op: 'session_update',
          model: 'gpt-4o-transcribe',
        }),
      );
    };
    wsRef.current.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.text) setTranscript((prev) => prev + d.text);
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (ev) => wsRef.current?.send(ev.data);
    recorder.start(200);
  };

  const handleStop = () => {
    wsRef.current?.close();
  };

  return (
    <div>
      <button onClick={handleStart}>시작</button>
      <button onClick={handleStop}>중지</button>
      <div>전사 결과: {transcript}</div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}

const slideFadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const slideFadeOut = keyframes`
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.5);
  }
`;
