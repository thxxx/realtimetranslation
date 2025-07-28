/* eslint-disable no-restricted-syntax */
import { client, OpenAIResponse, type OnToken } from './openai';

export const END_SIGNAL = '<END:DONE>';

export const startChat = async (prompted: string, onToken: OnToken) => {
  const stream = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user',
        content: prompted,
      },
    ],
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === OpenAIResponse.DELTA) {
      const token = event.delta;
      if (token) {
        onToken(token);
      }
    } else if (event.type === OpenAIResponse.DONE) {
      onToken(END_SIGNAL);
    }
  }
};

export const chatVision = async (
  prompted: string,
  imagebase64: string,
  onToken: OnToken,
) => {
  const prompt = makePrompt(prompted);

  const stream = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content:
          'You are a helpful assistant. You are a software design expert.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt,
          },
          {
            type: 'input_image',
            image_url: imagebase64,
            detail: 'auto',
          },
        ],
      },
    ],
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === OpenAIResponse.DELTA) {
      const token = event.delta;
      if (token) {
        onToken(token);
      }
    } else if (event.type === OpenAIResponse.DONE) {
      onToken(END_SIGNAL);
    }
  }
};

export const makePrompt = (input: string) => {
  return `${input}`;
};

export const translate = async (prompted: string, onToken: OnToken) => {
  console.log('defw ', prompted);

  const stream = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content:
          'You are a helpful assistant. Translate Koream input to English.',
      },
      {
        role: 'user',
        content: prompted,
      },
    ],
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === OpenAIResponse.DELTA) {
      const token = event.delta;
      if (token) {
        onToken(token);
      }
    } else if (event.type === OpenAIResponse.DONE) {
      onToken(END_SIGNAL);
    }
  }
};
