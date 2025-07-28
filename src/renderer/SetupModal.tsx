/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Bolt, CircleUserRound, X } from 'lucide-react';
import sb from '../lib/\bsupabase';
import { glass } from './App';

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
      loadData(uid);
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
                <div>Convenience</div>
                {/* 글씨 크기 조절, 플마 */}
                {/* 위치 세팅 */}
                {/* 원어 토글 */}
              </div>
            )}
            {selected === SetOptions.ACCOUNT && <div></div>}
          </div>
        </div>
      </SetupContainer>
    </SetupOuter>
  );
};

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
  width: 100%;
  height: 100%;
  max-height: 80vh;
  padding: 8px 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: row;
  gap: 16px;
  background: white;
  display: flex;
  flex-direction: column;
  font-family: Pretendard;

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
    width: 30%;
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    gap: 4px;
    padding-top: 20px;

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
    width: 60%;
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: start;
    background: rgba(0, 0, 0, 0.04);

    .form {
      width: 100%;
      display: flex;
      flex-direction: column;
      font-family: Pretendard;
      padding-top: 8px;

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
