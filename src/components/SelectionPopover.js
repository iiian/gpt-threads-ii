import React from 'react';

export default function SelectionPopover({
  selectionPopover,
  onDiscuss,
  onQuote
}) {
  if (!selectionPopover) return null;

  return (
    <div
      className="selection-popover"
      style={{
        left: `${selectionPopover.x}px`,
        top: `${selectionPopover.y}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onMouseDown={(e) => {
            // Prevent default to avoid clearing selection
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (selectionPopover.messageId) {
              onDiscuss(
                selectionPopover.threadId,
                selectionPopover.text,
                selectionPopover.range,
                selectionPopover.messageId
              );
            }
          }}
        >
          Discuss
        </button>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof onQuote === 'function') {
              console.debug('[Quote] Clicked Quote button', {
                threadId: selectionPopover.threadId,
                textLen: (selectionPopover.text || '').length
              });
              onQuote(selectionPopover.threadId, selectionPopover.text);
            }
          }}
        >
          Quote
        </button>
      </div>
    </div>
  );
}
