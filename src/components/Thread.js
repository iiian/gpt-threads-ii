import React, { useEffect, useRef, useState } from 'react';
import ChatInput from './ChatInput';
import Message from './Message';

export default function Thread({
  thread,
  threadId,
  isLoading,
  sendMessage,
  repaintHighlights,
  handleSelection,
  messageRefs,
  onClose,
  focusInput,
  onInputFocus,
  prefillText,
  prefillStamp,
  quoteText,
  quoteStamp,
  selectedModel,
  swipeHint
}) {
  const messagesEndRef = useRef(null);
  const [justSentMessage, setJustSentMessage] = useState(false);

  useEffect(() => {
    if (justSentMessage && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setJustSentMessage(false);
    }
  }, [justSentMessage, thread.messages]);

  useEffect(() => {
    // Repaint highlights after messages render
    const id = setTimeout(() => repaintHighlights(threadId), 100);
    return () => clearTimeout(id);
  }, [thread.messages, threadId, repaintHighlights]);



  return (
    <div className="chat-thread">
      <div className="chat-header">
        {thread.parentHighlightId ? (
          <>
            <span style={{ color: '#64748b' }}>Fork:</span>
            <span style={{ fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              "{thread.highlightedText?.substring(0, 50)}..."
            </span>
            <button
              className="thread-close-btn"
              title="Close this thread"
              onClick={() => onClose?.(threadId)}
            >
              ×
            </button>
          </>
        ) : (
          <>
            <span>Main Thread</span>
          </>
        )}
      </div>

      <div
        className="chat-messages"
        onPointerUp={(e) => {
          if (e.target.closest('.selection-popover')) return;
          setTimeout(() => {
            handleSelection(threadId);
          }, 50);
        }}
      >
        {thread.messages && thread.messages.length > 0 ? (
          thread.messages.map(msg => (
            <Message
              key={msg.id}
              message={msg}
              messageRefs={messageRefs}
            />
          ))
        ) : (
          <div className="empty-state">
            <div>
              {thread.parentHighlightId ? (
                <p>This thread discusses: "{thread.highlightedText?.substring(0, 100)}..."<br />Start the conversation...</p>
              ) : (
                <p>Start a new conversation...</p>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading">{selectedModel === 'openai' ? 'GPT-5' : 'Claude'} is thinking...</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {swipeHint && (
        <div className="swipe-hint inline">← Swipe to switch threads →</div>
      )}

      <ChatInput
        threadId={threadId}
        isLoading={isLoading}
        onSendMessage={async (tid, message) => {
          // Scroll immediately on send
          setJustSentMessage(true);
          await sendMessage(tid, message);
        }}
        focusInput={focusInput}
        onInputFocus={onInputFocus}
        prefillText={prefillText}
        prefillStamp={prefillStamp}
        quoteText={quoteText}
        quoteStamp={quoteStamp}
      />
    </div>
  );
}


