/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-nested-ternary */
/* eslint-disable react/no-array-index-key */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable prefer-template */
/* eslint-disable no-undef */
/* eslint-disable no-plusplus */
// === RealTimeTranscriber.tsx (Renderer · React) ===
import React, { useState, useRef, useEffect } from 'react';
import {
  isFirstCharUppercase,
  ScriptContainer,
  SPACE,
  Transcripts,
} from './MicWindow';
import { useMicStore } from '../store/micStore';
import { END_SIGNAL, translateOnce, translateToEnglish } from '../lib/chat';
import ConfirmModal from './component/Modal';
import { useUserStore } from '../store/userStore';

export default function Mics() {
  const [recording, setRecording] = useState(false);
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

  // ★ 새로 추가
  const CHUNK_DURATION_SEC = 2;
  const SAMPLE_RATE = 16000;
  const CHUNK_SIZE = SAMPLE_RATE * CHUNK_DURATION_SEC; // 32000 샘플

  // Int16Array 조각을 쌓아두는 배열
  const chunkBufferRef = useRef<Int16Array[]>([]);
  // 누적 샘플 수
  const chunkSampleCountRef = useRef<number>(0);

  const [lastTranslation, setLastTranslation] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);

  const tempSentence = useRef('');
  const onToken = async (token: string) => {
    if (token === END_SIGNAL) {
      setMyTranslates([...myTranslates, tempSentence.current]);
      setLastTranslation('');
      setIsTranslating(false);
    } else {
      tempSentence.current += token;
      setLastTranslation(`${tempSentence.current}`);
    }
  };

  const audioCtxRef = useRef<AudioContext>(null);
  const procRef = useRef<ScriptProcessorNode>(null);
  const streamRef = useRef<MediaStream>(null);

  useEffect(() => {
    window.electronAPI.onTranscript((msg) => {
      const { myTranscripts: t, lastSentence: l } = useMicStore.getState();
      console.log('리턴입니다. ', msg);

      if (msg.type === 'delta') {
        const { text } = msg;

        if (['.', '?', '!'].includes(text[text.length - 1]) && l.length > 5) {
          const last = l.trim() + text[text.length - 1];

          setMyTranscripts([...t, last]);
          setLastSentence('');
        } else {
          const isUpper = isFirstCharUppercase(text);

          if (isUpper && text[0] !== SPACE) setLastSentence(l + SPACE + text);
          else setLastSentence(l + text);
        }
      } else if (msg.type === 'finalize' && l.length > 5) {
        const last = l.trim() + '.';
        setMyTranscripts([...t, last]);
        setLastSentence('');
      }
    });
    return () => {
      stop();
    };
  }, []);

  function computePeak(samples: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > peak) peak = abs;
    }
    return peak; // 값 범위: 0 ~ 1
  }

  function computeRMS(samples: Float32Array): number {
    const sumSquares = samples.reduce((sum, s) => sum + s * s, 0);
    return Math.sqrt(sumSquares / samples.length); // 값 범위: 0 ~ 1
  }

  const start = async () => {
    if (recording) return;
    // 버퍼 초기화
    chunkBufferRef.current = [];
    chunkSampleCountRef.current = 0;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx({ sampleRate: SAMPLE_RATE });
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    procRef.current = processor;

    const rmsThreshold = 0.005; // 적당히 말소리만 감지되는 수준

    processor.onaudioprocess = (e) => {
      const data = e.inputBuffer.getChannelData(0);

      // === 볼륨 분석 ===
      const rms = computeRMS(data);
      const peak = computePeak(data);
      console.log(`RMS: ${rms.toFixed(4)}, Peak: ${peak.toFixed(4)}`);

      let int16: Int16Array;

      if (rms < rmsThreshold || peak < 0.08) {
        // 🎯 무음으로 대체 (0으로 채운 Int16Array)
        int16 = new Int16Array(data.length); // 자동 0으로 채워짐
      } else {
        // 🎧 실제 음성 데이터 변환
        int16 = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) {
          const s = Math.max(-1, Math.min(1, data[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
      }

      // 청크 버퍼에 추가
      chunkBufferRef.current.push(int16);
      chunkSampleCountRef.current += int16.length;

      console.log('저장');

      // 충분히 모였으면 한번에 전송
      if (chunkSampleCountRef.current >= CHUNK_SIZE) {
        // 모든 조각 합치기
        const all = new Int16Array(chunkSampleCountRef.current);
        let offset = 0;
        for (const piece of chunkBufferRef.current) {
          all.set(piece, offset);
          offset += piece.length;
        }
        // 첫 48000 샘플만 전송
        console.log('보내기');
        const chunkToSend = all.subarray(0, CHUNK_SIZE);

        window.electronAPI.sendAudio(chunkToSend.buffer);

        // 남은 샘플을 다시 버퍼에 담기
        const leftover = all.subarray(CHUNK_SIZE);
        if (leftover.length > 0) {
          chunkBufferRef.current = [leftover];
          chunkSampleCountRef.current = leftover.length;
        } else {
          chunkBufferRef.current = [];
          chunkSampleCountRef.current = 0;
        }
      }
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);

    setRecording(true);
  };

  const BUFFER_SIZE = 4096;
  const AUDIO_CHUNK_DURATION = 0.1;
  const SAMPLE_RATED = 24000;
  const samplesPerChunk = SAMPLE_RATED * AUDIO_CHUNK_DURATION; // 32000 샘플

  function convertFloat32ToInt16(float32Array: any) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Improved scaling to prevent clipping
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  function arrayBufferToBase64(buffer: any) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  const startRealtime = async () => {
    if (recording) return;
    await window.electronAPI.startSTT();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATED,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    streamRef.current = stream;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx({ sampleRate: SAMPLE_RATED });
    await audioCtx.resume();
    const micSource = audioCtx.createMediaStreamSource(stream);
    const micProcessor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);

    let audioBuffer: any[] = [];

    micProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      audioBuffer.push(...inputData);

      // samplesPerChunk(=2400) 만큼 모이면 전송
      while (audioBuffer.length >= samplesPerChunk) {
        let chunk = audioBuffer.splice(0, samplesPerChunk);
        let processedChunk = new Float32Array(chunk); // 기본값

        const pcm16 = convertFloat32ToInt16(processedChunk);
        const b64 = arrayBufferToBase64(pcm16.buffer);
        window.electronAPI.sendAudioStream(b64);
      }

      // const int16 = new Int16Array(data.length);
      // for (let i = 0; i < data.length; i++) {
      //   const s = Math.max(-1, Math.min(1, data[i]));
      //   int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      // }
      // window.electronAPI.sendAudioStream(int16.buffer);
    };

    micSource.connect(micProcessor);
    micProcessor.connect(audioCtx.destination);

    audioCtxRef.current = audioCtx;
    procRef.current = micProcessor;

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

  const translationQueueRef = useRef<string[]>([]);

  useEffect(() => {
    if (
      myTranscripts.length > myTranslates.length &&
      myTranscripts.length > 0
    ) {
      const lastScript = myTranscripts[myTranscripts.length - 1];
      if (lastScript !== undefined) {
        translationQueueRef.current.push(lastScript);
        runTranslationLoop();
      }
    }
  }, [myTranscripts]);

  useEffect(() => {
    if (!isTranslating) {
      runTranslationLoop();
    }
  }, [isTranslating]);

  const runTranslationLoop = async () => {
    if (isTranslating) return;
    if (translationQueueRef.current.length === 0) return;

    setIsTranslating(true);
    tempSentence.current = '';

    const nextScript = translationQueueRef.current.shift(); // pop
    if (!nextScript) return;

    try {
      if (myTranslates.length > 0) {
        const leftKoreanInput = myTranscripts[myTranslates.length - 1];
        const leftEnglishOutput = myTranslates[myTranslates.length - 1];
      }
      await translateToEnglish(nextScript, onToken);
    } catch (e) {
      const { myTranslates: trans } = useMicStore.getState();
      setMyTranslates([...trans, '(translation error)']);
      setIsTranslating(false);
    } finally {
      // runTranslationLoop(); // 다음 작업
    }
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
          {/* <div onClick={() => setFontSize(fontSize + 1)}>+</div>
          <div onClick={() => setFontSize(fontSize - 1)}>-</div> */}
          <div onClick={() => setIsDeleteModalOpen(true)}>delete</div>
        </div>
      </div>
      <div>
        <button
          style={{
            background: recording ? 'red' : 'green',
          }}
          onClick={() => (recording ? stop() : startRealtime())}
        >
          {recording ? 'Stop' : 'Start'}
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
              {index < myTranslates.length ? (
                <div key={`trans_${index}`} className="translated">
                  {myTranslates[index] ? myTranslates[index] : 'translating...'}
                </div>
              ) : index === myTranslates.length ? (
                <div>{lastTranslation}</div>
              ) : (
                <div>not translated yet</div>
              )}
            </div>
          );
        })}
        <div className="tag">Speaking</div>
        <div className="sent-origin">{lastSentence}</div>
      </Transcripts>
      <div className="mt-4 p-3 bg-gray-100 h-40 overflow-auto">
        {lastSentence || (
          <span className="text-gray-400">Waiting for speech...</span>
        )}
      </div>

      <br />
      <br />
    </ScriptContainer>
  );
}
