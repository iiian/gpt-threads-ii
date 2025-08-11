import React, { useRef, useEffect, useState } from 'react';

export default function ChatInput({
  threadId,
  isLoading,
  onSendMessage,
  focusInput,
  onInputFocus,
  prefillText,
  prefillStamp
}) {
  const inputRef = useRef(null);
  const [localInput, setLocalInput] = useState('');

  // Auto-focus input when focusInput prop is true
  useEffect(() => {
    if (focusInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focusInput]);

  // When a new prefill arrives (identified by prefillStamp), tee it up in the input.
  // This will overwrite whatever is currently typed, which is intended for the demo walkthrough.
  useEffect(() => {
    if (prefillStamp && typeof prefillText === 'string') {
      setLocalInput(prefillText);
      if (inputRef.current) inputRef.current.focus();
    }
  }, [prefillStamp, prefillText]);

  const handleSend = async () => {
    if (localInput.trim()) {
      const toSend = localInput;
      setLocalInput('');
      await onSendMessage(threadId, toSend);
    }
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          placeholder="Type a message..."
          value={localInput}
          onChange={e => setLocalInput(e.target.value)}
          onFocus={() => onInputFocus?.(threadId)}
          onKeyDown={async e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              await handleSend();
            }
          }}
          disabled={isLoading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={isLoading || !localInput.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
