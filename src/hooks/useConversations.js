import { useState, useEffect, useMemo } from 'react';

export default function useConversations() {
  const [conversations, setConversations] = useState(() => {
    const stored = localStorage.getItem('gpt-threads-conversations');
    let parsed = stored ? JSON.parse(stored) : [];

    // Remove any duplicate "New Conversation" entries (keep only the first one)
    const seen = new Set();
    parsed = parsed.filter(conv => {
      // If it's a "New Conversation" with no messages, check for duplicates
      if (conv.title === 'New Conversation' &&
        conv.threads?.root?.messages?.length === 0) {
        if (seen.has('new-convo')) {
          return false; // Skip duplicate
        }
        seen.add('new-convo');
      }
      return true;
    });

    // If no conversations exist, create one immediately in the initial state
    if (parsed.length === 0) {
      const newConvo = {
        id: `conv-${Date.now()}`,
        title: 'New Conversation',
        threads: {
          root: {
            id: 'root',
            parentThreadId: null,
            parentHighlightId: null,
            messages: [],
            highlights: []
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      return [newConvo];
    }
    return parsed;
  });

  const [activeConversationId, setActiveConversationId] = useState(null);

  // Save conversations to localStorage, excluding drafts
  useEffect(() => {
    const stripDrafts = (convos) => convos.map(conv => {
      const threads = { ...conv.threads };
      const draftThreadIds = Object.values(threads)
        .filter(t => t && t.isDraft)
        .map(t => t.id);

      // Remove draft threads
      for (const id of draftThreadIds) {
        delete threads[id];
      }

      // Remove draft highlights and highlights pointing to removed draft threads
      for (const [tid, thread] of Object.entries(threads)) {
        if (!thread || !thread.highlights) continue;
        threads[tid] = {
          ...thread,
          highlights: thread.highlights.filter(h => !h?.isDraft && !draftThreadIds.includes(h?.threadId))
        };
      }

      return { ...conv, threads };
    });

    const persisted = stripDrafts(conversations);
    localStorage.setItem('gpt-threads-conversations', JSON.stringify(persisted));
  }, [conversations]);

  // Get active conversation
  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  // Set initial active conversation after state is initialized
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  // Utility: update only the active conversation
  const updateActiveConversation = (updater) => {
    setConversations(prev => prev.map(conv => (
      conv.id !== activeConversationId ? conv : updater(conv)
    )));
  };

  // Create a new conversation
  const createNewConversation = () => {
    const timestamp = Date.now();
    const newConvo = {
      id: `conv-${timestamp}`,
      title: `Conversation ${conversations.length + 1}`,  // Give unique names
      threads: {
        root: {
          id: 'root',
          parentThreadId: null,
          parentHighlightId: null,
          messages: [],
          highlights: []
        }
      },
      createdAt: timestamp,
      updatedAt: timestamp
    };

    setConversations(prev => [...prev, newConvo]);
    setActiveConversationId(newConvo.id);
    return newConvo;
  };

  // Handle selecting a conversation
  const selectConversation = (convId) => {
    setActiveConversationId(convId);
  };

  const deleteConversation = (convId) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== convId);
      // Adjust active conversation if needed
      if (activeConversationId === convId) {
        if (next.length > 0) {
          // Prefer first remaining conversation
          setActiveConversationId(next[0].id);
        } else {
          // Create a new conversation if none remain
          const created = {
            id: `conv-${Date.now()}`,
            title: 'New Conversation',
            threads: {
              root: {
                id: 'root',
                parentThreadId: null,
                parentHighlightId: null,
                messages: [],
                highlights: []
              }
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          setActiveConversationId(created.id);
          return [created];
        }
      }
      return next;
    });
  };

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    updateActiveConversation,
    createNewConversation,
    selectConversation,
    deleteConversation
  };
}
