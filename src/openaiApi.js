import axios from 'axios';

const ORIGIN_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}`
  : 'http://localhost';
const PROXY_BASE = `${ORIGIN_BASE}:3001`;
const DEFAULT_PROMPT = 'The user is running katex to process math expressions. It is very important that you remember to wrap math expressions with latex cues: $ ... $ or $$ ... $$, depending on the context.';
export async function callOpenAIAPI(messages, systemPrompt = DEFAULT_PROMPT) {
  const PROXY_URL = `${PROXY_BASE}/api/openai`;

  const openaiMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const requestBody = {
    model: 'gpt-5',
    max_tokens: 2048,
    messages: openaiMessages,
    temperature: 0.7,
    stream: false,
  };

  try {
    const response = await axios.post(
      PROXY_URL,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data?.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

export async function callOpenAIAPIStream(messages, systemPrompt = DEFAULT_PROMPT, { onDelta, onDone, onError, signal } = {}) {
  const PROXY_URL = `${PROXY_BASE}/api/openai/stream`;

  const openaiMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const requestBody = {
    model: 'gpt-5',
    max_tokens: 2048,
    messages: openaiMessages,
    temperature: 0.7,
    stream: true,
  };

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`Stream failed: ${res.status} ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        if (!frame) continue;

        // OpenAI streams as "data: <json>" frames
        const lines = frame.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const dataStr = line.slice(5).trim();
          if (!dataStr) continue;
          if (dataStr === '[DONE]') {
            onDone?.();
            return;
          }
          try {
            const data = JSON.parse(dataStr);
            const token = data?.choices?.[0]?.delta?.content;
            if (token) onDelta?.(token);
          } catch (e) {
            // ignore malformed JSON segments
          }
        }
      }
    }
    onDone?.();
  } catch (err) {
    onError?.(err);
  } finally {
    try { reader.releaseLock(); } catch { }
  }
}
