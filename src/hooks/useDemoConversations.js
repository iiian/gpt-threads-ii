import { useEffect, useMemo, useState } from 'react';
import { demoScript } from '../demoScript';

function buildInitialMessages(now) {
  const msgs = [];
  if (Array.isArray(demoScript)) {
    let lastThread = 'root';
    for (let i = 0; i < demoScript.length; i++) {
      const step = demoScript[i];
      if (!step || step.type !== 'assistant') break;
      const targetThread = step.thread === 'same' || !step.thread ? lastThread : step.thread;
      if (targetThread !== 'root') break;
      msgs.push({
        id: `msg-script-${i}`,
        role: 'assistant',
        content: step.text || '',
        timestamp: now,
      });
      lastThread = targetThread;
    }
  }
  if (msgs.length === 0) {
    msgs.push({
      id: 'msg-welcome',
      role: 'assistant',
      content:
        'Welcome to the GPT Threads demo!\n\nSelect any text in a message and click "Discuss" to spawn a side thread without losing your place. Try highlighting a phrase in this message to see it in action.\n\nYou can also type a message to see a scripted reply (there is no LLM here).',
      timestamp: now,
    });
  }
  return msgs;
}

export default function useDemoConversations() {
  const [conversations, setConversations] = useState(() => {
    const now = Date.now();
    const demoConvo = {
      id: 'conv-demo',
      title: 'Demo Conversation',
      threads: {
        root: {
          id: 'root',
          parentThreadId: null,
          parentHighlightId: null,
          messages: buildInitialMessages(now),
          highlights: [],
        },
      },
      createdAt: now,
      updatedAt: now,
    };
    return [demoConvo];
  });

  const [activeConversationId, setActiveConversationId] = useState('conv-demo');

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  const updateActiveConversation = (updater) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id !== activeConversationId ? conv : updater(conv)))
    );
  };

  const createNewConversation = () => {
    const timestamp = Date.now();
    const newConvo = {
      id: `conv-${timestamp}`,
      title: `Conversation ${conversations.length + 1}`,
      threads: {
        root: {
          id: 'root',
          parentThreadId: null,
          parentHighlightId: null,
          messages: [],
          highlights: [],
        },
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setConversations((prev) => [...prev, newConvo]);
    setActiveConversationId(newConvo.id);
    return newConvo;
  };

  const selectConversation = (convId) => {
    setActiveConversationId(convId);
  };

  const deleteConversation = (convId) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== convId);
      if (activeConversationId === convId) {
        if (next.length > 0) {
          setActiveConversationId(next[0].id);
        } else {
          const now = Date.now();
          const created = {
            id: `conv-${now}`,
            title: 'New Conversation',
            threads: {
              root: {
                id: 'root',
                parentThreadId: null,
                parentHighlightId: null,
                messages: [],
                highlights: [],
              },
            },
            createdAt: now,
            updatedAt: now,
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
    deleteConversation,
  };
}
