/* eslint-disable import/prefer-default-export */
import { create } from 'zustand';

type State = {
  userId: string | null;
  context: string;
  persona: string;
  reference: string;

  setUserId: (userId: string) => void;
  setContext: (context: string) => void;
  setPersona: (persona: string) => void;
  setReference: (reference: string) => void;
};

export const useUserStore = create<State>((set) => ({
  userId: null,
  context: '',
  persona: '',
  reference: '',

  setUserId: (userId) => set(() => ({ userId })),
  setContext: (context) => set(() => ({ context })),
  setPersona: (persona) => set(() => ({ persona })),
  setReference: (reference) => set(() => ({ reference })),
}));
