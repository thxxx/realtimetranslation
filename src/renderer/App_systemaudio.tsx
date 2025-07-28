/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable prefer-template */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

export {}; // to make file a module

function ScriptWindow() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    window.electronAPI.onTranscript((text) => {
      setTranscript((prev) => prev + text);
    });
    return () => {
      stop();
    };
  }, []);

  const start = () => {
    setIsRecording(true);
    window.electronAPI.startSystemAudio();
  };
  const stop = () => {
    setIsRecording(false);
    window.electronAPI.stopSystemAudio();
  };

  return (
    <ScriptContainer>
      <div>System Audio STT</div>
      <div>
        <button
          style={{
            background: isRecording ? 'green' : 'gray',
          }}
          onClick={() => start()}
        >
          {isRecording ? 'Listening...' : 'Start'}
        </button>
        <button
          style={{
            background: isRecording ? 'red' : 'gray',
          }}
          onClick={() => stop()}
        >
          Stop
        </button>
      </div>
      <div>script</div>
      <pre>{transcript}</pre>
    </ScriptContainer>
  );
}

export default ScriptWindow;

const ScriptContainer = styled.div`
  background: white;
  width: 440px;
  height: 200px;
  color: black;
  border-radius: 8px;
  padding: 8px;
  border: 1px solid rgba(0, 0, 0, 0.06);
`;
