import axios from 'axios';

const ORIGIN_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}`
  : 'http://localhost';
const PROXY_BASE = `${ORIGIN_BASE}:3001`;

export async function callClaudeAPI(messages, systemPrompt = '') {
  // Now using proxy server to avoid CORS issues
  const PROXY_URL = `${PROXY_BASE}/api/claude`;

  const requestBody = {
    model: 'claude-opus-4-1-20250805',
    max_tokens: 2048,
    messages: messages,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

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

    return response.data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

export async function callClaudeAPIStream(messages, systemPrompt = '', { onDelta, onDone, onError, signal } = {}) {
  const PROXY_URL = `${PROXY_BASE}/api/claude/stream`;

  const requestBody = {
    model: 'claude-opus-4-1-20250805',
    max_tokens: 2048,
    messages: messages,
    stream: true,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

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

        let eventName = '';
        let dataStr = '';
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          if (line.startsWith('data:')) dataStr += line.slice(5).trim();
        }
        if (!dataStr) continue;

        if (eventName === 'content_block_delta') {
          try {
            const data = JSON.parse(dataStr);
            const text = data?.delta?.text || '';
            if (text) onDelta?.(text);
          } catch { }
        } else if (eventName === 'message_stop' || eventName === 'end') {
          console.log("it's done!!");
          onDone?.();
        } else if (eventName === 'error') {
          try {
            const err = JSON.parse(dataStr);
            onError?.(new Error(err?.message || 'Stream error'));
          } catch (e) {
            onError?.(new Error('Stream error'));
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

