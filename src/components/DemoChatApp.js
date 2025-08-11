import React, { useEffect } from "react";
import { serializeRange, deserializeRange } from '../highlightUtils';
import Thread from './Thread';
import SelectionPopover from './SelectionPopover';
import HighlightPopover from './HighlightPopover';
import useHighlights from '../hooks/useHighlights';
import useThreadStack from '../hooks/useThreadStack';
import useDemoConversations from '../hooks/useDemoConversations';
import useDemoMessaging from '../hooks/useDemoMessaging';

export default function DemoChatApp() {
  const {
    conversations,
    activeConversationId,
    activeConversation,
    updateActiveConversation,
    createNewConversation,
    selectConversation,
    deleteConversation
  } = useDemoConversations();

  const {
    chatStack,
    setChatStack,
    focusThreadId,
    setFocusThreadId,
    chatStackRef,
    closeThread,
    scrollToThread,
    openThreadById,
    resetToRoot
  } = useThreadStack();

  const {
    isLoading,
    sendMessage,
    nextPrefill,
    nextPrefillStamp,
    advanceScriptForUI
  } = useDemoMessaging(conversations, activeConversationId, updateActiveConversation);

  // Resolve placeholder thread IDs from the script (e.g., 'fork-1', 'latest-fork')
  // to the actual latest thread in the current chat stack (the rightmost column).
  const resolvePrefillThreadId = (prefillThreadId) => {
    if (!prefillThreadId) return null;
    // Treat any 'fork' placeholder (e.g., 'fork', 'fork-1', 'fork-2') and 'latest-fork'
    // as an instruction to target the most recently opened thread (rightmost column).
    const isForkAlias = prefillThreadId === 'latest-fork' || /^fork(-\d+)?$/.test(prefillThreadId);
    if (isForkAlias) {
      const lastId = chatStack[chatStack.length - 1];
      return lastId || prefillThreadId;
    }
    return prefillThreadId;
  };

  // When the script expects a user message, focus that thread's input.
  useEffect(() => {
    if (nextPrefill?.threadId) {
      const target = resolvePrefillThreadId(nextPrefill.threadId);
      if (target) setFocusThreadId(target);
    }
  }, [nextPrefill?.threadId, setFocusThreadId, chatStack]);

  const handleSelectConversation = (convId) => {
    selectConversation(convId);
    resetToRoot();
  };

  const handleCreateNewConversation = () => {
    createNewConversation();
    resetToRoot();
  };

  const handleDeleteConversation = (convId) => {
    deleteConversation(convId);
    resetToRoot();
  };

  const handleOpenThreadById = (threadIdToOpen) => {
    openThreadById(activeConversation, threadIdToOpen);
  };

  const {
    messageRefs,
    selectionPopover,
    setSelectionPopover,
    highlightPopover,
    setHighlightPopover,
    paintHighlight,
    clearHighlight,
    repaintHighlights,
    handleSelection
  } = useHighlights(
    activeConversation,
    handleOpenThreadById,
    activeConversation?.threads?.[chatStack[chatStack.length - 1]]?.parentHighlightId || null
  );

  function forkConversation(threadId, highlightText, range, messageId) {
    if (!activeConversation) return;

    // Remove any existing unrealized drafts before creating a new one
    const existingDraftThreadIds = new Set();
    const existingDraftHighlightIds = [];
    if (activeConversation?.threads) {
      for (const t of Object.values(activeConversation.threads)) {
        if (t?.isDraft) existingDraftThreadIds.add(t.id);
      }
      for (const t of Object.values(activeConversation.threads)) {
        if (!t?.highlights) continue;
        for (const h of t.highlights) {
          if (h?.isDraft || (h?.threadId && existingDraftThreadIds.has(h.threadId))) {
            existingDraftHighlightIds.push(h.id);
          }
        }
      }
    }

    // Clear any on-screen overlays for those draft highlights
    existingDraftHighlightIds.forEach(id => clearHighlight(id));

    const newThreadId = `thread-${Date.now()}`;
    const highlightId = `hl-${Date.now()}`;

    const highlight = {
      id: highlightId,
      messageId,
      text: highlightText,
      threadId: newThreadId,
      anchor: serializeRange(range, messageRefs.current[messageId]),
      isDraft: true
    };

    updateActiveConversation(conv => {
      const threads = { ...conv.threads };

      // Remove draft threads
      for (const id of Object.keys(threads)) {
        if (threads[id]?.isDraft) {
          delete threads[id];
        }
      }

      // Remove draft highlights and highlights pointing to removed draft threads
      const removedThreadIds = new Set(
        Object.values(conv.threads)
          .filter(t => t?.isDraft)
          .map(t => t.id)
      );
      for (const [tid, t] of Object.entries(threads)) {
        if (!t?.highlights) continue;
        threads[tid] = {
          ...t,
          highlights: t.highlights.filter(h => !h?.isDraft && !removedThreadIds.has(h?.threadId))
        };
      }

      // Add new draft highlight and thread
      threads[threadId] = {
        ...threads[threadId],
        highlights: [...(threads[threadId]?.highlights || []), highlight]
      };
      threads[newThreadId] = {
        id: newThreadId,
        parentThreadId: threadId,
        parentHighlightId: highlightId,
        highlightedText: highlightText,
        isDraft: true,
        messages: [],
        highlights: []
      };

      return { ...conv, threads, updatedAt: Date.now() };
    });

    setChatStack(prev => {
      const cleaned = prev.filter(id => !existingDraftThreadIds.has(id));
      const baseIndex = cleaned.indexOf(threadId);
      return [...cleaned.slice(0, baseIndex + 1), newThreadId];
    });

    // Immediately focus the new fork's input and scroll it into view
    setFocusThreadId(newThreadId);
    // Defer scroll until after the column renders
    setTimeout(() => scrollToThread(newThreadId), 0);

    clearHighlight('temp-selection');
    document.getSelection()?.removeAllRanges();
    setSelectionPopover(null);
    setHighlightPopover(null);

    setTimeout(() => {
      const messageEl = messageRefs.current[messageId];
      if (messageEl) {
        const persistedRange = deserializeRange(highlight.anchor, messageEl);
        if (persistedRange) {
          paintHighlight(persistedRange, highlightId, { threadId: newThreadId });
        }
      }
    }, 100);

    // Advance the demo script past UI-only steps and emit any immediate assistant steps
    // into this newly created fork, then prepare the next user prefill.
    // Steps to skip: highlight_create, discuss_click
    advanceScriptForUI?.(new Set(['highlight_create', 'discuss_click']), { latestThreadId: newThreadId });
  }

  function deleteHighlight(highlightId) {
    if (!activeConversation) return;
    let parentOfHighlightId = null;
    let childThreadId = null;
    for (const [tid, t] of Object.entries(activeConversation.threads || {})) {
      const found = t?.highlights?.find(h => h.id === highlightId);
      if (found) {
        parentOfHighlightId = tid;
        childThreadId = found.threadId || null;
        break;
      }
    }

    clearHighlight(highlightId);

    const isChildDraft = !!(childThreadId && activeConversation.threads[childThreadId]?.isDraft);

    updateActiveConversation(conv => {
      const threads = { ...conv.threads };

      if (parentOfHighlightId && threads[parentOfHighlightId]?.highlights) {
        threads[parentOfHighlightId] = {
          ...threads[parentOfHighlightId],
          highlights: threads[parentOfHighlightId].highlights.filter(h => h.id !== highlightId)
        };
      }

      if (childThreadId) {
        if (isChildDraft) {
          delete threads[childThreadId];
        } else if (threads[childThreadId]) {
          threads[childThreadId] = {
            ...threads[childThreadId],
            parentHighlightId: null,
            highlightedText: undefined
          };
        }
      }

      return { ...conv, threads, updatedAt: Date.now() };
    });

    if (childThreadId) {
      setChatStack(prev => {
        const idx = prev.indexOf(childThreadId);
        if (idx === -1) return prev;
        return prev.slice(0, idx);
      });
    }

    setHighlightPopover(null);
  }

  return (
    <div
      className="demo-embed"
      style={{
        height: 560,
        border: '1px solid #22252c',
        borderRadius: 8,
        background: '#0d0e12',
        overflow: 'hidden'
      }}
    >
      <div className="chat-stack" ref={chatStackRef} style={{ height: '100%' }}>
        {activeConversation && chatStack.map(threadId => {
          const thread = activeConversation.threads[threadId];
          if (!thread) return null;
          const shouldFocus = focusThreadId === threadId;
          return (
            <Thread
              key={threadId}
              thread={thread}
              threadId={threadId}
              isLoading={!!isLoading[threadId]}
              sendMessage={sendMessage}
              repaintHighlights={repaintHighlights}
              handleSelection={handleSelection}
              messageRefs={messageRefs}
              onClose={closeThread}
              focusInput={shouldFocus}
              onInputFocus={scrollToThread}
              prefillText={resolvePrefillThreadId(nextPrefill?.threadId) === threadId ? nextPrefill?.text : undefined}
              prefillStamp={resolvePrefillThreadId(nextPrefill?.threadId) === threadId ? nextPrefillStamp : 0}
            />
          );
        })}

        {!activeConversation && (
          <div className="empty-state" style={{ flex: 1 }}>
            <p>Select or create a conversation to get started</p>
          </div>
        )}
      </div>

      <SelectionPopover
        selectionPopover={selectionPopover}
        onDiscuss={forkConversation}
      />

      <HighlightPopover
        highlightPopover={highlightPopover}
        onDeleteHighlight={deleteHighlight}
      />
    </div>
  );
}
