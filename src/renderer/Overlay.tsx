/* eslint-disable react/button-has-type */
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { chatVision, END_SIGNAL } from '../lib/chat';
import { glass } from './App';
import logo from '../../assets/logo.svg';
import { v4 } from 'uuid';
import sb from '../lib/\bsupabase';

export default function Overlay() {
  const [rect, setRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [conversationId, setConversationId] = useState<string>('');

  const start = useRef<{ x: number; y: number } | null>(null);
  const [isDoneSelecting, setIsDoneSelecting] = useState(false);
  const textRef = useRef(null);
  const [text, setText] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [histories, setHistories] = useState<
    {
      type: 'user' | 'assistant';

      content: string;
    }[]
  >([
    {
      type: 'user',
      content: 'test',
    },
    {
      type: 'assistant',
      content:
        '이 이미지는 파란색의 유리관이나 네온 튜브로 만들어진 듯한 나선형 구조와, 그 중심에 투명한 구슬(혹은 액체가 담긴 구체)이 있는 모습으로 보입니다. 전체적으로 미래적이고 디지털스러운 느낌이 강하며, 빛 반사와 색상 그라데이션이 강조되어 있습니다.형태적으로는 다음과 같이 해석할 수 있습니다: 특정 사물로 딱 떨어지게 보이진 않지만, NVIDIA의 로고와 유사한 느낌도 있습니다. 혹시 의도하신 게 있다면 알려주시면 더 자세히 설명드릴 수 있습니다!\n\n\n\n\n\n이 이미지는 파란색의 유리관이나 네온 튜브로 만들어진 듯한 나선형 구조와, 그 중심에 투명한 구슬(혹은 액체가 담긴 구체)이 있는 모습으로 보입니다. 전체적으로 미래적이고 디지털스러운 느낌이 강하며, 빛 반사와 색상 그라데이션이 강조되어 있습니다.형태적으로는 다음과 같이 해석할 수 있습니다: 특정 사물로 딱 떨어지게 보이진 않지만, NVIDIA의 로고와 유사한 느낌도 있습니다. 혹시 의도하신 게 있다면 알려주시면 더 자세히 설명드릴 수 있습니다!\n\n\n\n\n\n이 이미지는 파란색의 유리관이나 네온 튜브로 만들어진 듯한 나선형 구조와, 그 중심에 투명한 구슬(혹은 액체가 담긴 구체)이 있는 모습으로 보입니다. 전체적으로 미래적이고 디지털스러운 느낌이 강하며, 빛 반사와 색상 그라데이션이 강조되어 있습니다.형태적으로는 다음과 같이 해석할 수 있습니다: 특정 사물로 딱 떨어지게 보이진 않지만, NVIDIA의 로고와 유사한 느낌도 있습니다. 혹시 의도하신 게 있다면 알려주시면 더 자세히 설명드릴 수 있습니다!\n\n\n\n\n\n이 이미지는 파란색의 유리관이나 네온 튜브로 만들어진 듯한 나선형 구조와, 그 중심에 투명한 구슬(혹은 액체가 담긴 구체)이 있는 모습으로 보입니다. 전체적으로 미래적이고 디지털스러운 느낌이 강하며, 빛 반사와 색상 그라데이션이 강조되어 있습니다.형태적으로는 다음과 같이 해석할 수 있습니다: 특정 사물로 딱 떨어지게 보이진 않지만, NVIDIA의 로고와 유사한 느낌도 있습니다. 혹시 의도하신 게 있다면 알려주시면 더 자세히 설명드릴 수 있습니다!\n\n\n\n\n\n이 이미지는 파란색의 유리관이나 네온 튜브로 만들어진 듯한 나선형 구조와, 그 중심에 투명한 구슬(혹은 액체가 담긴 구체)이 있는 모습으로 보입니다. 전체적으로 미래적이고 디지털스러운 느낌이 강하며, 빛 반사와 색상 그라데이션이 강조되어 있습니다.형태적으로는 다음과 같이 해석할 수 있습니다: 특정 사물로 딱 떨어지게 보이진 않지만, NVIDIA의 로고와 유사한 느낌도 있습니다. 혹시 의도하신 게 있다면 알려주시면 더 자세히 설명드릴 수 있습니다!\n\n\n\n\n\n',
    },
  ]);
  const [area, setArea] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [capturedURL, setCapturedURL] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isTakingScreen, setIsTakingScreen] = useState(false);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const takeScreenshot = async (selected: boolean) => {
    const { buffer: pngBuffer, base64: base64String } =
      await window.electron?.sendCoords(rect);

    const blob = new Blob([pngBuffer], { type: 'image/png' });

    if (selected && rect) {
      const bitmap = await createImageBitmap(blob);

      // 3) Canvas로 크롭
      const canvas = document.createElement('canvas');
      canvas.width = rect.w;
      canvas.height = rect.h;

      // 일반적으로 받는 픽셀 좌표는 디바이스에 따른 크기 비율에 영향을 받음
      const scaleX = bitmap.width / window.innerWidth;
      const scaleY = bitmap.height / window.innerHeight;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        bitmap,
        Math.round(rect.x * scaleX) * 1.0,
        Math.round(rect.y * scaleY) + 50,
        Math.round(rect.w * scaleX) * 1.01,
        Math.round(rect.h * scaleY),
        0,
        0,
        rect.w,
        rect.h,
      );

      // 4) Blob → ArrayBuffer → 저장 요청
      canvas.toBlob(async (croppedBlob) => {
        if (!croppedBlob) return;
        // const ab = await croppedBlob.arrayBuffer();
        const url = URL.createObjectURL(croppedBlob);
        setCapturedURL(url);

        // 현재는 잘린 부분만 들어가도록
        const bs = await blobToBase64(croppedBlob);
        const dataUrl = `data:image/png;base64,${bs}`;
        setImageDataUrl(dataUrl);
      }, 'image/png');
    } else {
      // 전체 화면 스크린샷 사용시. base64 인코딩
      const dataUrl = `data:image/png;base64,${base64String}`;
      setImageDataUrl(dataUrl);
    }
  };

  useEffect(() => {
    if (textRef.current) textRef.current.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.close();
        window.electron?.endRecord();
      }

      window.electron?.ipcRenderer.onResetArea(() => {
        setRect(null); // 네모 없애거나 초기화
        setArea(null); // 네모 없애거나 초기화
        setIsDoneSelecting(false);

        start.current = null;
      });
    };

    const onMouseDown = (e: MouseEvent) => {
      start.current = { x: e.clientX, y: e.clientY };

      setRect(null);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!start.current) return;

      const x1 = start.current.x;
      const y1 = start.current.y;
      const x2 = e.clientX;
      const y2 = e.clientY;

      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);

      setRect({ x, y, w, h });
    };

    // MouseUp = 영역 지정 완료
    const onMouseUp = async () => {
      setIsTakingScreen(true);
      if (rect) {
        // 너무 작게 지정하면 취소(실수로 클릭만 했을 가능성 높음)
        if (rect.w + rect.h < 20) {
          setIsTakingScreen(false);
          return;
        }

        setArea({
          x1: rect.x,
          y1: rect.y,
          x2: rect.x + rect.w,
          y2: rect.y + rect.h,
        });

        await takeScreenshot(true);

        setIsDoneSelecting(true);

        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }

      setIsTakingScreen(false);
      // window.close();
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [rect]);

  const tempSentence = useRef('');

  const onToken = async (token: string) => {
    if (token === END_SIGNAL) {
      console.log('끝!', token);
      const userId = localStorage.getItem('userId');

      const mbody = {
        user_id: userId,
        type: 1,
        content: tempSentence.current,
        conversation_id: conversationId,
      };
      await sb.from('messages').insert(mbody);

      return;
    }

    tempSentence.current += token;

    setLastResponse(`${tempSentence.current}`);
  };

  /**
   * 만약 영역을 지정하지 않고 보냈다면, 전체 스크린을 기준으로.
   */
  const sendText = async (input: string) => {
    if (!input) return;
    if (input.length < 2) return;
    if (!isDoneSelecting) {
      takeScreenshot(false);
    }

    setText('');

    if (!lastResponse) {
      setHistories([
        ...histories,
        {
          type: 'user',
          content: input,
        },
      ]);
    } else {
      setHistories([
        ...histories,
        {
          type: 'assistant',
          content: lastResponse,
        },
        {
          type: 'user',
          content: input,
        },
      ]);
    }
    tempSentence.current = '';
    setLastResponse('');

    console.log(imageDataUrl?.slice(0, 30));

    let cid = conversationId;
    if (!cid) {
      cid = v4();
      setConversationId(cid);
    }
    const userId = localStorage.getItem('userId');

    const cbody = {
      id: cid,
      user_id: userId,
    };
    await sb.from('conversations').insert(cbody);

    const mbody = {
      user_id: userId,
      type: 0,
      content: input,
      conversation_id: cid,
    };
    await sb.from('messages').insert(mbody);

    if (imageDataUrl) {
      await chatVision(input, imageDataUrl, onToken);
    } else {
      console.log('Error!');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        // backgroundColor: 'rgba(0, 0, 0, 0.1)',
        cursor: isDoneSelecting ? 'auto' : `crosshair`,
        userSelect: 'none',
      }}
    >
      {/* Display when dragging */}
      {rect && !area && (
        <div
          style={{
            position: 'absolute',
            border: '1px solid #AAAAAA99',
            backgroundColor: 'rgba(255,255,255,0.15)',
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
          }}
        />
      )}

      {area && (
        <div
          style={{
            position: 'absolute',
            border: '1px solid #AAAAAA99',
            backgroundColor: isTakingScreen
              ? 'rgba(0,0,0,0)'
              : 'rgba(255,255,255,0.0)',
            left: area.x1,
            top: area.y1,
            width: area.x2 - area.x1,
            height: area.y2 - area.y1,
          }}
        />
      )}

      {area && !isTakingScreen && isDoneSelecting && (
        <DefaultActions
          style={{
            left: area.x1,
            top: area.y2 + 6,
            width: area.x2 - area.x1,
          }}
        >
          <button className="btn" onClick={() => sendText('Persona Feedback')}>
            Persona Feedback
          </button>

          <button
            className="btn"
            onClick={() => sendText('What do you think about this design?')}
          >
            What do you think about this design?
          </button>

          <button className="btn" onClick={() => sendText('Draw me options')}>
            Draw me options
          </button>
        </DefaultActions>
      )}

      <ChatBox
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div className="chat-top">
          <div className="head">
            <div></div>
            <div>
              <img src={logo} width={30} alt="logo" />
            </div>
            <div></div>
          </div>

          {capturedURL && (
            <div className="screenshot-container">
              <img
                src={capturedURL}
                width={120}
                height={100}
                alt="captuedimage"
              />
              {/* <div className="cancel">X</div> */}
            </div>
          )}
          {histories && (
            <Chattings>
              {histories.map((item) => {
                if (item.type === 'assistant') {
                  return (
                    <div className="oneline assistant">{item.content}</div>
                  );
                }

                if (item.type === 'user') {
                  return <div className="oneline user">{item.content}</div>;
                }
              })}

              {lastResponse && (
                <div className="oneline assistant">{lastResponse}</div>
              )}
            </Chattings>
          )}
        </div>

        <ChatSendBox>
          <textarea
            rows={4}
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            placeholder="Enter to send, Escape to close."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // 줄바꿈 방지

                sendText(text);
              }
            }}
          />
          <div className="send">{'>'}</div>
        </ChatSendBox>
      </ChatBox>
    </div>
  );
}

const ChatBox = styled.div`
  display: flex;
  flex-direction: column;
  position: fixed;
  right: 8px;
  bottom: 16px;
  padding: 8px;
  width: 300px;
  font-family: Pretendard;
  user-select: text;

  ${glass}
  border-radius:4px;

  .chat-top {
    max-height: 86vh;
    overflow: scroll;
    padding: 2px;
  }

  .head {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 4px;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .screenshot-container {
    display: inline-flex;
    position: relative;

    img {
      object-fit: cover;

      ${glass}
      border-radius: 4px;
    }

    .cancel {
      width: 16px;
      height: 16px;
      border-radius: 20px;
      background: red;
      opacity: 0.8;
      position: absolute;
      top: -6px;
      right: -6px;
      color: white;

      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
`;

const Chattings = styled.div`
  display: flex;
  flex-direction: column;

  .oneline {
    margin: 4px 0px;
  }

  .assistant {
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 0.85em;
    padding: 0px 8px;
    line-height: 1.4em;
  }

  .user {
    margin-bottom: 12px;
    ${glass}
    border-radius:16px;
    padding: 16px;
    font-weight: 400;
    font-size: 0.9em;
  }
`;

const ChatSendBox = styled.div`
  display: flex;
  position: relative;

  textarea {
    padding: 8px;
    width: 100%;
    margin-top: 8px;
    font-family: Pretendard;

    ${glass}
    border-radius:4px;

    &:focus {
      outline: black;
    }
  }

  .send {
    display: flex;
    position: absolute;
    bottom: 6px;
    right: 6px;
    width: 24px;
    height: 24px;

    align-items: center;
    justify-content: center;

    ${glass};

    background: #3f92db;
  }
`;

const DefaultActions = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: end;
  width: 100%;
  position: absolute;
  gap: 2px;
  margin: 4px;

  .btn {
    display: inline-block;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 0.9em;
    opacity: 0;
    transform: translateY(-10px);
    animation: slideIn 0.3s forwards;

    ${glass}

    &:hover {
      background: (255, 255, 255, 1);
    }
  }

  .btn:nth-child(1) {
    animation-delay: 0s;
  }

  .btn:nth-child(2) {
    animation-delay: 0.05s;
  }

  .btn:nth-child(3) {
    animation-delay: 0.1s;
  }

  @keyframes slideIn {
    to {
      opacity: 1;

      transform: translateY(0);
    }
  }
`;
