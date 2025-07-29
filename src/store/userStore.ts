/* eslint-disable import/prefer-default-export */
import { create } from 'zustand';

type State = {
  userId: string | null;
  context: string;
  fontSize: number;
  reference: string;

  setUserId: (userId: string) => void;
  setContext: (context: string) => void;
  setFontSize: (fontSize: number) => void;
  setReference: (reference: string) => void;
};

export const useUserStore = create<State>((set) => ({
  userId: null,
  context: '',
  fontSize: 15,
  reference: '',

  setUserId: (userId) => set(() => ({ userId })),
  setContext: (context) => set(() => ({ context })),
  setFontSize: (fontSize) => set(() => ({ fontSize })),
  setReference: (reference) => set(() => ({ reference })),
}));
