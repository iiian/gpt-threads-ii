import { useState, useEffect } from 'react';
import { callClaudeAPI, callClaudeAPIStream } from '../claudeApi';
import { callOpenAIAPI, callOpenAIAPIStream } from '../openaiApi';
import { buildLinearContext } from '../utils/buildLinearContext';

export default function useMessaging(conversations, activeConversationId, updateActiveConversation, selectedModel = 'claude') {
  const [isLoading, setIsLoading] = useState({});
  const [pendingNaming, setPendingNaming] = useState(null); // Track which thread needs naming after state update

  // Handle pending naming after state updates complete
  useEffect(() => {
    const maybeNameConversation = async (activeConversation, currentThreadId, conversations, activeConversationId) => {
      try {
        if (!activeConversation) return;
        if (currentThreadId !== 'root') return;
        const conv = conversations.find(c => c.id === activeConversationId);
        if (!conv || !isDefaultTitle(conv.title)) return;
        const root = conv.threads?.root;
        if (!root || (root.messages?.length || 0) < 2) return; // need at least user + assistant
        const lastMsg = root.messages[root.messages.length - 1];
        if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.content || !lastMsg.content.trim()) return;

        let { messages: contextMessages } = buildLinearContext(conv, 'root');
        // Filter out any empty-content messages (e.g., placeholder during streaming)
        contextMessages = contextMessages.filter(m => m?.content && String(m.content).trim().length > 0);
        const titlePrompt = 'Propose a short, descriptive conversation title (max 6 words). Return only the title.';
        const callSimple = selectedModel === 'openai' ? callOpenAIAPI : callClaudeAPI;
        const response = await callSimple([...contextMessages, { role: 'user', content: titlePrompt }]);
        const raw = (response || '').split('\n')[0].trim();
        const cleaned = raw.replace(/^"|"$/g, '').slice(0, 80);
        if (!cleaned) return;

        // Update conversation title directly through the conversations hook
        updateActiveConversation(conv => ({
          ...conv,
          title: cleaned,
          updatedAt: Date.now()
        }));
      } catch {
        // non-fatal
      }
    };

    if (pendingNaming) {
      const activeConversation = conversations.find(c => c.id === activeConversationId);
      if (activeConversation) {
        // Small delay to ensure conversation state is fully updated
        const timer = setTimeout(() => {
          maybeNameConversation(activeConversation, pendingNaming, conversations, activeConversationId);
          setPendingNaming(null);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [pendingNaming, conversations, activeConversationId, updateActiveConversation, selectedModel]);

  // Helpers for conversation title generation
  const isDefaultTitle = (title) => {
    if (!title) return true;
    return title === 'New Conversation' || /^Conversation\s+\d+$/.test(title);
  };

  // Send message to selected provider
  const sendMessage = async (threadId, message) => {
    const activeConversation = conversations.find(c => c.id === activeConversationId);
    if (!activeConversation || !message.trim()) return;

    setIsLoading(prev => ({ ...prev, [threadId]: true }));

    // Add user message
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now()
    };

    updateActiveConversation(conv => {
      const currentThread = conv.threads[threadId];
      const wasDraft = !!currentThread?.isDraft;
      const updatedThreads = { ...conv.threads };

      // Add the user message to the target thread
      updatedThreads[threadId] = {
        ...currentThread,
        isDraft: wasDraft ? false : currentThread?.isDraft,
        messages: [...(currentThread?.messages || []), userMessage]
      };

      // If this thread was draft, also flip the originating highlight to non-draft
      if (wasDraft) {
        // Find highlight that points to this thread
        for (const [tid, thread] of Object.entries(updatedThreads)) {
          if (!thread?.highlights) continue;
          const newHighlights = thread.highlights.map(h => (
            h?.threadId === threadId ? { ...h, isDraft: false } : h
          ));
          if (newHighlights !== thread.highlights) {
            updatedThreads[tid] = { ...thread, highlights: newHighlights };
          }
        }
      }

      return {
        ...conv,
        threads: updatedThreads,
        updatedAt: Date.now()
      };
    });

    // Prepare context for LLM
    const updatedConvo = conversations.find(c => c.id === activeConversationId);
    const { messages: contextMessages, systemPrompt } = buildLinearContext(updatedConvo, threadId);
    contextMessages.push({ role: 'user', content: message });

    // Create a placeholder assistant message for streaming updates
    const placeholderId = `msg-${Date.now()}-assistant`;
    updateActiveConversation(conv => ({
      ...conv,
      threads: {
        ...conv.threads,
        [threadId]: {
          ...conv.threads[threadId],
          messages: [
            ...(conv.threads[threadId].messages || []),
            { id: placeholderId, role: 'assistant', content: '', timestamp: Date.now(), provider: selectedModel }
          ]
        }
      },
      updatedAt: Date.now()
    }));

    try {
      const callStream = selectedModel === 'openai' ? callOpenAIAPIStream : callClaudeAPIStream;
      await callStream(contextMessages, systemPrompt, {
        onDelta: (delta) => {
          updateActiveConversation(conv => {
            const t = conv.threads[threadId];
            if (!t) return conv;
            const msgs = t.messages.map(m => m.id === placeholderId ? { ...m, content: (m.content || '') + delta } : m);
            return { ...conv, threads: { ...conv.threads, [threadId]: { ...t, messages: msgs } }, updatedAt: Date.now() };
          });
        },
        onDone: () => {
          setIsLoading(prev => ({ ...prev, [threadId]: false }));
          // Mark this thread for naming after state update completes
          if (threadId === 'root') {
            setPendingNaming(threadId);
          }
        },
        onError: (error) => {
          updateActiveConversation(conv => {
            const t = conv.threads[threadId];
            if (!t) return conv;
            const msgs = t.messages.map(m => m.id === placeholderId ? { ...m, content: (m.content || '') + `\n\n[Stream error: ${error.message}]` } : m);
            return { ...conv, threads: { ...conv.threads, [threadId]: { ...t, messages: msgs } }, updatedAt: Date.now() };
          });
          setIsLoading(prev => ({ ...prev, [threadId]: false }));
        }
      });
    } catch (error) {
      const errorMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Error: ${error.message}. Please ensure your API key(s) are set in .env.local`,
        timestamp: Date.now(),
        provider: selectedModel
      };
      updateActiveConversation(conv => ({
        ...conv,
        threads: {
          ...conv.threads,
          [threadId]: {
            ...conv.threads[threadId],
            messages: [...conv.threads[threadId].messages, errorMessage]
          }
        },
        updatedAt: Date.now()
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, [threadId]: false }));
    }
  };

  return {
    isLoading,
    sendMessage
  };
}
