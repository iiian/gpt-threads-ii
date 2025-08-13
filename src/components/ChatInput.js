import React, { useEffect, useRef, useState } from 'react';

export default function ChatInput({
  threadId,
  isLoading,
  onSendMessage,
  focusInput,
  onInputFocus,
  prefillText,
  prefillStamp,
  quoteText,
  quoteStamp
}) {
  const textareaRef = useRef(null);
  const [localInput, setLocalInput] = useState('');
  const [quotedSnippet, setQuotedSnippet] = useState('');

  // Auto-focus input when focusInput prop is true
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 200; // px
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
  };

  useEffect(() => {
    if (focusInput && textareaRef.current) {
      textareaRef.current.focus();
      autoResize();
    }
  }, [focusInput]);

  // When a new prefill arrives (identified by prefillStamp), tee it up in the input.
  // This will overwrite whatever is currently typed, which is intended for the demo walkthrough.
  useEffect(() => {
    if (prefillStamp && typeof prefillText === 'string') {
      setLocalInput(prefillText);
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Wait a tick for value to be set before measuring
        requestAnimationFrame(autoResize);
      }
    }
  }, [prefillStamp, prefillText]);

  // Receive a new quote and show a pill above the textarea
  useEffect(() => {
    if (!quoteText) return;
    const trimmed = quoteText.trim();
    console.debug('[Quote] ChatInput received quote', { threadId, quoteStamp, len: trimmed.length });
    setQuotedSnippet(trimmed);
    if (textareaRef.current) {
      textareaRef.current.focus();
      requestAnimationFrame(autoResize);
    }
  }, [quoteStamp, quoteText]);

  const handleSend = async () => {
    const userText = localInput.trim();
    const hasQuote = !!quotedSnippet;
    if (!userText && !hasQuote) return;
    const formatQuote = (text) => text.split('\n').map(line => `> ${line}`).join('\n');
    const toSend = hasQuote
      ? `${formatQuote(quotedSnippet)}${userText ? '\n\n' + userText : ''}`
      : userText;
    setLocalInput('');
    setQuotedSnippet('');
    console.debug('[Quote] Sent message with quote?', { hasQuote, userLen: userText.length });
    if (textareaRef.current) {
      // Reset height after sending
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(threadId, toSend);
  };

  return (
    <div className="chat-input-container">
      {quotedSnippet && (
        <div className="quote-pill">
          <span className="quote-icon" aria-hidden="true">❝</span>
          <div className="quote-text" title={quotedSnippet}>{quotedSnippet}</div>
          <button
            className="quote-remove"
            title="Remove quote"
            onClick={() => setQuotedSnippet('')}
          >
            ×
          </button>
        </div>
      )}
      <div className="chat-input-row">
        <textarea
          ref={textareaRef}
          className="chat-input"
          placeholder="Type a message..."
          value={localInput}
          rows={1}
          onChange={e => {
            setLocalInput(e.target.value);
            autoResize();
          }}
          onFocus={() => onInputFocus?.(threadId)}
          onInput={autoResize}
          onKeyDown={async e => {
            // Enter sends when not using Shift and not composing text via IME
            if (e.key === 'Enter' && !e.shiftKey) {
              if (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing)) return;
              // Always prevent default to avoid stray blank lines
              e.preventDefault();
              if (localInput.trim() || quotedSnippet) {
                await handleSend();
              }
            }
          }}
          disabled={isLoading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={isLoading || !(localInput.trim() || quotedSnippet)}
        >
          Send
        </button>
      </div>
    </div>
  );
}
