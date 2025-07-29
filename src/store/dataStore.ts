/* eslint-disable import/prefer-default-export */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type State = {
  lastSentence: string;
  setLastSentence: (lastSentence: string) => void;

  transcripts: string[];
  setTranscripts: (transcripts: string[]) => void;

  translates: string[];
  setTranslates: (translates: string[]) => void;
};

export const useDataStore = create<State>()(
  persist(
    (set) => ({
      transcripts: [],
      lastSentence: '',
      translates: [],
      setTranscripts: (t) => set({ transcripts: t }),
      setLastSentence: (s) => set({ lastSentence: s }),
      setTranslates: (t) => set({ translates: t }),
    }),
    {
      name: 'data-store', // localStorage key
    },
  ),
);
