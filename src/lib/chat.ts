/* eslint-disable consistent-return */
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

export const translateOnce = async (prompted: string) => {
  if (prompted === undefined) return null;

  const res = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content:
          'You are a helpful assistant, translator, expert at english and korean.',
      },
      {
        role: 'user',
        content: `
Translate below english to korean. The input English sentence may have typos or spacing issues, but try to translate it into Korean as accurately as possible anyway. The translation should sound more like spoken language than written text, with a natural tone—not too casual, but still conversational.
Please translate it using polite/formal Korean. 존댓말로 번역해달라는 뜻이야.

-- Example English --
I was wondering if you had a chance to review the proposal I sent last week. If there’s anything unclear or if you'd like to discuss it further, I’d be happy to talk.

-- Example Korean --
지난주에 제가 보내드린 제안서 혹시 한번 검토해보셨나요? 혹시라도 잘 안 보이거나 더 얘기 나눠보고 싶으신 부분 있으시면, 언제든 편하게 말씀 주세요.

-- Input English --
${prompted}

-- Korean --
`,
      },
    ],
  });

  console.log('Res : ', res);
  if (res.output_text) return res.output_text;
  return null;
};

export const translateToEnglish = async (
  prompted: string,
  onToken: OnToken,
) => {
  if (prompted === undefined) return null;

  const stream = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content:
          'You are a helpful assistant, translator, expert at english and korean.',
      },
      {
        role: 'user',
        content: `
Translate below korean to english. The input Korean sentence may have typos or spacing issues, but try to translate it into English as accurately as possible anyway. The translation should sound more like spoken language than written text, with a natural tone—not too casual, but still conversational.
!Important! : Only return the translated English result. Do not include anything else in the response.
If the input Korean sentence is too incomplete to translate into English, just return a filler sound like "uhm" or "mm".
Don't include asking for a longer sentence or say that the translation is difficult in your response.

-- Example Korean --
지난주에 제가 보내드린 제안서 혹시 한번 검토해보셨나요? 혹시라도 잘 안 보이거나 더 얘기 나눠보고 싶으신 부분 있으시면, 언제든 편하게 말씀 주세요.

-- Example English --
I was wondering if you had a chance to review the proposal I sent last week. If there’s anything unclear or if you'd like to discuss it further, I’d be happy to talk.

-- Input Korean --
${prompted}

-- English --
`,
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
