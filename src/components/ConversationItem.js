import React from 'react';

export default function ConversationItem({
  conversation,
  isActive,
  isNewEmpty,
  onSelect,
  onDelete
}) {
  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
    >
      <span className="conversation-title">{conversation.title}</span>
      {!isNewEmpty && (
        <button
          className="conversation-delete-btn"
          title="Delete conversation"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          🗑
        </button>
      )}
    </div>
  );
}
