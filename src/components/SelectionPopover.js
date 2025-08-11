import React from 'react';

export default function SelectionPopover({
  selectionPopover,
  onDiscuss
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
    </div>
  );
}
