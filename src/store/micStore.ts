/* eslint-disable import/prefer-default-export */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type State = {
  lastSentence: string;
  setLastSentence: (lastSentence: string) => void;

  myTranscripts: string[];
  setMyTranscripts: (myTranscripts: string[]) => void;

  myTranslates: string[];
  setMyTranslates: (myTranslates: string[]) => void;
};

export const useMicStore = create<State>()(
  persist(
    (set) => ({
      lastSentence: '',
      myTranscripts: [],
      myTranslates: [],
      setLastSentence: (s) => set({ lastSentence: s }),
      setMyTranscripts: (t) => set({ myTranscripts: t }),
      setMyTranslates: (t) => set({ myTranslates: t }),
    }),
    {
      name: 'mic-store', // localStorage key
    },
  ),
);
