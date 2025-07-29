// ConfirmModal.tsx
import React from 'react';
import styled from 'styled-components';

type ConfirmModalProps = {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = '확인',
  message = '이 작업을 계속하시겠습니까?',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <Overlay>
      <ModalBox>
        <Title>{title}</Title>
        <Message>{message}</Message>
        <ButtonRow>
          <CancelButton onClick={onCancel}>취소</CancelButton>
          <ConfirmButton onClick={onConfirm}>확인</ConfirmButton>
        </ButtonRow>
      </ModalBox>
    </Overlay>
  );
};

export default ConfirmModal;

// ConfirmModal.tsx 하단에 붙이거나 따로 분리
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
`;

const ModalBox = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const Title = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 12px;
`;

const Message = styled.p`
  font-size: 1rem;
  color: #333;
  margin-bottom: 20px;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const CancelButton = styled.button`
  background: #eee;
  color: #333;
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;

  &:hover {
    background: #ddd;
  }
`;

const ConfirmButton = styled.button`
  background: #007bff;
  color: white;
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;

  &:hover {
    background: #0069d9;
  }
`;
