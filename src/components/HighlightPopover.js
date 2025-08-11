import React from 'react';

export default function HighlightPopover({
  highlightPopover,
  onDeleteHighlight
}) {
  if (!highlightPopover) return null;

  return (
    <div
      className="highlight-popover"
      style={{
        left: `${highlightPopover.x}px`,
        top: `${highlightPopover.y}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDeleteHighlight(highlightPopover.highlightId);
        }}
      >
        Delete highlight
      </button>
    </div>
  );
}
