/* eslint-disable react/no-array-index-key */
/* eslint-disable no-useless-escape */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable prefer-template */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useDataStore } from '../store/dataStore';
import { useUserStore } from '../store/userStore';
import { END_SIGNAL, translateOnce } from '../lib/chat';
import ConfirmModal from './component/Modal';
import { useMicStore } from '../store/micStore';

export {}; // to make file a module
const SPACE = ' ';

function isFirstCharUppercase(text: string): boolean {
  if (!text) return false; // 빈 문자열 처리

  const firstChar = text.charAt(0);
  return (
    firstChar === firstChar.toUpperCase() &&
    firstChar !== firstChar.toLowerCase()
  );
}

function ScriptWindow() {
  const [isRecording, setIsRecording] = useState(false);
  const [isDeleteModalOepn, setIsDeleteModalOpen] = useState(false);
  const { fontSize, setFontSize } = useUserStore();
  const {
    lastSentence,
    myTranscripts,
    myTranslates,
    setLastSentence,
    setMyTranscripts,
    setMyTranslates,
  } = useMicStore();

  // const [lastTranslation, setLastTranslation] = useState<string>('');
  // const tempSentence = useRef('');
  // const onToken = async (token: string) => {
  //   if (token === END_SIGNAL) {
  //     console.log('끝');
  //   }

  //   tempSentence.current += token;

  //   setLastTranslation(`${tempSentence.current}`);
  // };

  useEffect(() => {
    window.electronAPI.onTranscript((msg) => {
      const { transcripts: t, lastSentence: l } = useDataStore.getState();

      if (msg.type === 'delta') {
        const { text } = msg;

        if (['.', '?', '!'].includes(text[text.length - 1]) && l.length > 20) {
          const last = l.trim() + text[text.length - 1];

          setMyTranscripts([...t, last]);
          setLastSentence('');
        } else {
          const isUpper = isFirstCharUppercase(text);
          if (isUpper && text[0] !== SPACE) {
            setLastSentence(l + SPACE + text);
          } else {
            setLastSentence(l + text);
          }
        }
      }
    });
    return () => {
      stop();
    };
  }, []);

  useEffect(() => {
    translateLastScript();
  }, [myTranscripts]);

  const translateLastScript = async () => {
    console.log('transcript : ', myTranscripts);
    if (
      myTranscripts.length > myTranslates.length &&
      myTranscripts.length > 0
    ) {
      const lastScript = myTranscripts[myTranscripts.length - 1];

      // 번역 만들기
      if (lastScript !== undefined) {
        const returnedTranslation = await translateOnce(lastScript);
        if (returnedTranslation) {
          setMyTranslates([...myTranslates, returnedTranslation]);
        } else {
          setMyTranslates([...myTranslates, 'Translation failed.']);
        }
      }
    }
  };

  const start = async () => {
    setIsRecording(true);
    window.electronAPI.startMicAudio();
  };
  const stop = () => {
    setIsRecording(false);
    window.electronAPI.stopMicAudio();
  };

  const reset = () => {
    setMyTranslates([]);
    setMyTranscripts([]);
    setLastSentence('');
  };

  return (
    <ScriptContainer>
      <ConfirmModal
        isOpen={isDeleteModalOepn}
        title="삭제하시겠습니까?"
        message="이 작업은 되돌릴 수 없습니다."
        onConfirm={() => {
          reset();
          setIsDeleteModalOpen(false);
        }}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <div className="titles">
        <div>My Audio STT</div>
        <div className="options">
          <div onClick={() => setFontSize(fontSize + 1)}>+</div>
          <div onClick={() => setFontSize(fontSize - 1)}>-</div>
          <div onClick={() => setIsDeleteModalOpen(true)}>delete</div>
        </div>
      </div>
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
      <Transcripts fontSize={fontSize}>
        {myTranscripts.map((item, index) => {
          return (
            <div className="transcripts">
              <div key={`${item[0]}_${index}`} className="sent">
                {item}
              </div>
              <div key={`trans_${index}`} className="translated">
                {myTranslates[index] ? myTranslates[index] : 'translating...'}
              </div>
            </div>
          );
        })}
        <div className="tag">Speaking</div>
        <div className="sent-origin">{lastSentence}</div>
        {/* <div className="translated">{lastSentence}</div> */}
      </Transcripts>
    </ScriptContainer>
  );
}

export default ScriptWindow;

const ScriptContainer = styled.div`
  background: white;
  width: 620px;
  height: 344px;
  color: black;
  border-radius: 8px;
  padding: 8px;
  border: 1px solid rgba(0, 0, 0, 0.5);
  overflow: scroll;

  background: rgba(255, 255, 255, 0.95);
  box-shadow:
    -1px -1px 1px rgba(0, 0, 0, 0.25),
    1px 1px 1px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.8);

  .titles {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .options {
    display: flex;
    flex-direction: row;
    gap: 2px;

    div {
      min-width: 24px;
      min-height: 24px;
      border-radius: 4px;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      text-align: center;

      &:hover {
        background: rgba(0, 0, 0, 0.06);
      }
    }
  }
`;

const Transcripts = styled.div<{ fontSize: number }>`
  font-size: ${(props) => props.fontSize}px;
  padding: 8px 0px;

  .tag {
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.04);
    display: inline-block;
    padding: 3px 9px;
    font-size: 0.85em;
    font-weight: 550;
    margin-top: 12px;
    margin-bottom: 4px;
  }
  .sent-origin {
    width: 100%;
    font-size: 1.1em;
    color: rgba(0, 0, 0, 0.65);
    margin-top: 2px;
  }
  .translated {
    margin-top: 4px;
    font-weight: 500;
    font-size: 1em;
  }

  .transcripts {
    display: flex;
    flex-direction: column;
    margin-top: 12px;

    .sent {
      width: 100%;
      font-size: 0.95em;
      color: rgba(0, 0, 0, 0.65);
    }
  }
`;
