import { OpenAI } from 'openai';

export type GPTStreamChunkHandler = (chunk: string) => void;

export enum OpenAIResponse {
  DELTA = 'response.output_text.delta',
  DONE = 'response.content_part.done',
}

export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export const openKey = '';

export const client = new OpenAI({
  apiKey: openKey,
  dangerouslyAllowBrowser: true,
});

export type OnToken = (token: string) => void;
