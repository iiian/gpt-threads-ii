import React from 'react';
import ConversationItem from './ConversationItem';

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onCreateNewConversation
}) {
  return (
    <div className="sidebar">
      <h2>Conversations</h2>
      <div className="conversation-list">
        {conversations.map(conv => {
          const isNewEmpty = conv.title === 'New Conversation' && ((conv.threads?.root?.messages?.length || 0) === 0);
          return (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeConversationId}
              isNewEmpty={isNewEmpty}
              onSelect={() => onSelectConversation(conv.id)}
              onDelete={() => onDeleteConversation(conv.id)}
            />
          );
        })}
      </div>
      <button className="new-conversation-btn" onClick={onCreateNewConversation}>
        New Conversation
      </button>
    </div>
  );
}
