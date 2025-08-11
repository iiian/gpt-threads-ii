import { useEffect, useState } from 'react';
import useDemoScriptRunner from './useDemoScriptRunner';
import { demoScript } from '../demoScript';

export default function useDemoMessaging(conversations, activeConversationId, updateActiveConversation) {
  const [isLoading, setIsLoading] = useState({});
  const scriptRunner = useDemoScriptRunner(demoScript);
  const [nextPrefill, setNextPrefill] = useState(null);
  const [nextPrefillStamp, setNextPrefillStamp] = useState(0);

  // On mount, skip any initial assistant steps already seeded into the conversation
  // and compute the first expected user prefill, if any.
  useEffect(() => {
    scriptRunner.advancePastInitialAssistants?.();
    const pre = scriptRunner.getNextUserPrefill?.();
    if (pre) {
      setNextPrefill(pre);
      setNextPrefillStamp(prev => prev + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance the script pointer past UI-driven steps (e.g., highlight_create, discuss_click),
  // immediately emit any following assistant steps (targeting the freshly created fork if provided),
  // then refresh the next expected user prefill.
  const advanceScriptForUI = (types, opts = {}) => {
    const set = types instanceof Set ? types : new Set(types || []);
    scriptRunner.advanceNonMessageSteps?.(set);

    // Collect any immediate assistant steps now that the UI steps are skipped,
    // without consuming the next expected user step.
    const pending = scriptRunner.consumeAssistantSteps?.();
    if (pending && pending.length) {
      updateActiveConversation(conv => {
        const threads = { ...conv.threads };
        for (const step of pending) {
          // Resolve thread target: map fork placeholders or 'same' to the latest created fork if provided
          let targetThreadId = step.threadId;
          const declared = step.declaredThread;
          const isForkAlias = declared
            ? (declared === 'latest-fork' || /^fork(-\d+)?$/.test(declared))
            : (targetThreadId === 'latest-fork' || /^fork(-\d+)?$/.test(targetThreadId));
          if ((isForkAlias || declared === 'same') && opts.latestThreadId) {
            targetThreadId = opts.latestThreadId;
          }
          const assistantMessage = {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: step.text || '',
            timestamp: Date.now()
          };
          if (threads[targetThreadId]) {
            threads[targetThreadId] = {
              ...threads[targetThreadId],
              messages: [...(threads[targetThreadId]?.messages || []), assistantMessage]
            };
          }
        }
        return { ...conv, threads, updatedAt: Date.now() };
      });
    }

    const pre = scriptRunner.getNextUserPrefill?.();
    setNextPrefill(pre || null);
    setNextPrefillStamp(prev => prev + 1);
  };

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
    // Try to satisfy scripted steps first. If any assistant steps are queued
    // by the script, emit them sequentially and skip the fallback.
    const scripted = scriptRunner.consumeUserMessage(threadId, message);
    if (scripted && scripted.length) {
      for (let i = 0; i < scripted.length; i++) {
        const step = scripted[i];
        // small delay between scripted replies to feel natural
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 400));
        const assistantMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: step.text || '',
          timestamp: Date.now()
        };
        updateActiveConversation(conv => ({
          ...conv,
          threads: {
            ...conv.threads,
            [step.threadId]: {
              ...conv.threads[step.threadId],
              messages: [
                ...(conv.threads[step.threadId]?.messages || []),
                assistantMessage
              ]
            }
          },
          updatedAt: Date.now()
        }));
      }
      // After scripted replies, compute the next expected user prefill
      const pre = scriptRunner.getNextUserPrefill?.();
      setNextPrefill(pre || null);
      setNextPrefillStamp(prev => prev + 1);
      setIsLoading(prev => ({ ...prev, [threadId]: false }));
      return;
    }

    // Compose a canned assistant reply
    const getAssistantReply = () => {
      const conv = conversations.find(c => c.id === activeConversationId);
      const thread = conv?.threads?.[threadId];

      if (threadId === 'root') {
        return (
          'This is a scripted demo response, not an LLM.\n\n' +
          'Key things to try:\n' +
          '1) Highlight a phrase in any assistant message → click "Discuss" to fork a side thread.\n' +
          '2) Send more messages and watch how branches keep your main thread intact.\n\n' +
          'Tip: Try highlighting a specific claim or term to open a focused discussion.'
        );
      }

      const topic = thread?.highlightedText || 'this topic';
      return (
        `Discussing "${topic}" — this fork stays scoped, so your main thread remains clean. ` +
        `Because this is a demo, I’ll keep answers succinct. Try sending a follow-up here or open another fork from the main thread.`
      );
    };

    await new Promise(r => setTimeout(r, 600));

    const assistantMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: getAssistantReply(),
      timestamp: Date.now()
    };

    updateActiveConversation(conv => ({
      ...conv,
      threads: {
        ...conv.threads,
        [threadId]: {
          ...conv.threads[threadId],
          messages: [...(conv.threads[threadId]?.messages || []), assistantMessage]
        }
      },
      updatedAt: Date.now()
    }));

    // After fallback assistant, compute next prefill
    const pre = scriptRunner.getNextUserPrefill?.();
    setNextPrefill(pre || null);
    setNextPrefillStamp(prev => prev + 1);

    setIsLoading(prev => ({ ...prev, [threadId]: false }));
  };

  return {
    isLoading,
    sendMessage,
    nextPrefill,
    nextPrefillStamp,
    advanceScriptForUI
  };
}
