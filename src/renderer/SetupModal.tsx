/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Bolt, CircleUserRound, X } from 'lucide-react';
import sb from '../lib/\bsupabase';
import { glass } from './App';
import { useUserStore } from '../store/userStore';
import ToggleSwitch, { SwitchType } from './component/Switch';

enum SetOptions {
  CONVENIENCE = 'Convenience',
  ACCOUNT = 'Account',
}

const SetupModal = () => {
  const [selected, setSelected] = useState<SetOptions>(SetOptions.CONVENIENCE);
  const [userId, setUserId] = useState<string>('');
  const [tempContext, setTempContext] = useState<string>('');
  const [tempPersona, setTempPersona] = useState<string>('');
  const [tempReference, setTempReference] = useState<string>('');
  const { fontSize, setFontSize } = useUserStore();

  const loadData = async (uid: String) => {
    const res = await sb.from('user_context').select('*').eq('user_id', uid);

    if (res.data) {
      setTempContext(res.data[0].context);
      setTempPersona(res.data[0].persona);
      setTempReference(res.data[0].reference);
    }
  };

  useEffect(() => {
    // renderer에서는 zustand로 전역 상태 관리가 안된다... localStorage는 공유하는 듯
    const uid = localStorage.getItem('userid');

    if (uid) {
      if (uid) setUserId(uid);
      // loadData(uid);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.close();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const onSave = async () => {
    console.log(`userid - ${userId}`);
    if (!userId) return;
    console.log('Save');

    const body = {
      context: tempContext ?? '',
      persona: tempPersona ?? '',
      reference: tempReference ?? '',
      user_id: userId,
    };

    await sb.from('user_context').upsert(body, { onConflict: 'user_id' });

    window.close();
  };

  return (
    <SetupOuter>
      <SetupContainer>
        <div className="top-cont">
          <div className="title">Settings</div>
          <div
            className="cancel"
            onClick={() => {
              window.close();
            }}
          >
            <X strokeWidth={2} />
          </div>
        </div>
        <div className="bottom-cont">
          <div className="left-cont">
            <ListItem
              icon={<Bolt size={18} strokeWidth={2} />}
              text={SetOptions.CONVENIENCE}
              onClick={() => setSelected(SetOptions.CONVENIENCE)}
              chosen={selected === SetOptions.CONVENIENCE}
            />
            <ListItem
              icon={<CircleUserRound size={18} strokeWidth={2} />}
              text={SetOptions.ACCOUNT}
              onClick={() => setSelected(SetOptions.ACCOUNT)}
              chosen={selected === SetOptions.ACCOUNT}
            />
          </div>
          <div className="right-cont">
            {selected === SetOptions.CONVENIENCE && (
              <div className="form">
                <div className="set-title">Convenience</div>
                {/* 글씨 크기 조절, 플마 */}
                <OptionBox>
                  <div className="left">
                    <div className="title">Font size</div>
                    <div className="desc">
                      You can set font size by shortcut
                    </div>
                  </div>
                  <div className="right">
                    <div
                      className="item"
                      onClick={() => setFontSize(fontSize + 1)}
                    >
                      +
                    </div>
                    <div
                      className="item"
                      onClick={() => setFontSize(fontSize - 1)}
                    >
                      -
                    </div>
                    <div style={{ marginLeft: '8px', marginRight: '8px' }}>
                      {fontSize}
                    </div>
                  </div>
                </OptionBox>
                {/* 위치 세팅 */}
                {/* 원어 토글 */}
                <OptionBox>
                  <div className="left">
                    <div className="title">Font size</div>
                    <div className="desc">
                      You can set font size by shortcut
                    </div>
                  </div>
                  <div className="right">
                    <ToggleSwitch type={SwitchType.Rounded} />
                  </div>
                </OptionBox>
              </div>
            )}
            {selected === SetOptions.ACCOUNT && <div></div>}
          </div>
        </div>
      </SetupContainer>
    </SetupOuter>
  );
};

const OptionBox = styled.div`
  padding: 12px 2px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-direction: row;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title {
    font-size: 0.93em;
    font-weight: 600;
  }
  .desc {
    font-size: 0.9em;
    margin-top: 4px;
    color: rgba(0, 0, 0, 0.6);
  }

  .right {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;

    .item {
      min-width: 28px;
      min-height: 28px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      border: 1px solid rgba(0, 0, 0, 0.06);
      margin-right: 4px;

      &:hover {
        background: rgba(0, 0, 0, 0.06);
      }
    }
  }
`;

const ListItem = ({
  icon = null,
  text,
  onClick,
  chosen = false,
}: {
  icon?: any;
  text: string;
  onClick: () => void;
  chosen?: boolean;
}) => {
  return (
    <ListItemBox onClick={() => onClick()} chosen={chosen}>
      <div
        style={{
          color: chosen ? 'black' : 'gray',
        }}
      >
        {icon && icon}
      </div>
      <div
        style={{
          color: chosen ? 'black' : 'gray',
          marginBottom: '1px',
        }}
      >
        {text}
      </div>
    </ListItemBox>
  );
};

export default React.memo(SetupModal);

const ListItemBox = styled.div<{ chosen: boolean }>`
  cursor: pointer;
  border-radius: 8px;
  padding: 10px 10px;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: start;
  font-size: 0.95em;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
  }
  background: ${(props) =>
    props.chosen ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.0)'};

  div {
    display: flex;
    align-items: center;
  }
`;

const SetupOuter = styled.div`
  display: flex;
  align-items: center;
  justify-content: end;
  position: fixed;
  inset: 0;
  user-select: none;
`;

const SetupContainer = styled.div`
  width: 98%;
  height: 100%;
  max-height: 80vh;
  padding: 8px 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: white;
  display: flex;
  flex-direction: column;
  font-family: Pretendard;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0px 0px 4px 2px rgba(0, 0, 0, 0.1);

  .top-cont {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;

    .title {
      font-weight: 600;
      font-size: 1.2em;
    }

    .cancel {
      display: flex;
      border-radius: 8px;
      padding: 4px;
      cursor: pointer;

      &:hover {
        background: rgba(0, 0, 0, 0.06);
      }
    }
  }

  .bottom-cont {
    display: flex;
    flex-direction: row;
    align-items: start;
    justify-content: space-between;
    padding: 4px 8px;
  }

  .left-cont {
    width: 25%;
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    gap: 4px;
    padding-top: 28px;

    .option {
      cursor: pointer;
      ${glass}
      background: rgba(255,255,255,0.0);
      padding: 8px 12px;
      font-size: 0.9em;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }

  .right-cont {
    width: 71%;
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: start;

    .set-title {
      font-size: 1.2em;
      font-weight: 700;
    }

    .form {
      width: 100%;
      display: flex;
      flex-direction: column;
      font-family: Pretendard;

      p {
        margin: 0px;
        font-size: 0.9em;
        font-weight: 600;
      }
      textarea {
        margin-bottom: 18px;
        margin-top: 12px;
        font-family: Pretendard;
        width: 90%;
        ${glass}
        align-items:center;
        display: flex;
        resize: none;
        padding: 8px 12px;
      }

      .rows {
        border-radius: 16px;
      }
    }
  }
`;
