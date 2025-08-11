import React from "react";
import { serializeRange, deserializeRange } from '../highlightUtils';
import Thread from './Thread';
import Sidebar from './Sidebar';
import SelectionPopover from './SelectionPopover';
import HighlightPopover from './HighlightPopover';
import useHighlights from '../hooks/useHighlights';
import useConversations from '../hooks/useConversations';
import useThreadStack from '../hooks/useThreadStack';
import useMessaging from '../hooks/useMessaging';

export default function ChatApp() {
  // Use custom hooks for modular state management
  const {
    conversations,
    activeConversationId,
    activeConversation,
    updateActiveConversation,
    createNewConversation,
    selectConversation,
    deleteConversation
  } = useConversations();

  const {
    chatStack,
    setChatStack,
    focusThreadId,
    chatStackRef,
    closeThread,
    scrollToThread,
    openThreadById,
    resetToRoot
  } = useThreadStack();

  const {
    isLoading,
    sendMessage
  } = useMessaging(conversations, activeConversationId, updateActiveConversation);

  // Handle conversation selection - reset thread stack to root when selecting
  const handleSelectConversation = (convId) => {
    selectConversation(convId);
    resetToRoot(); // Reset to root thread when conversation is selected
  };

  // Handle conversation creation - reset to root thread
  const handleCreateNewConversation = () => {
    createNewConversation();
    resetToRoot(); // Focus root thread on new conversation
  };

  // Handle conversation deletion - reset to root thread
  const handleDeleteConversation = (convId) => {
    deleteConversation(convId);
    resetToRoot(); // Reset to root thread when conversation is deleted
  };

  // Highlights hook (needs activeConversation)
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
  } = useHighlights(activeConversation, handleOpenThreadById, activeConversation?.threads?.[chatStack[chatStack.length - 1]]?.parentHighlightId || null);

  // Fork conversation from highlight
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

    // Create highlight record
    const highlight = {
      id: highlightId,
      messageId,
      text: highlightText,
      threadId: newThreadId,
      anchor: serializeRange(range, messageRefs.current[messageId]),
      isDraft: true
    };

    // Update conversation: remove old drafts, then add new draft thread + highlight
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

    // Update chat stack to show the new thread
    setChatStack(prev => {
      const cleaned = prev.filter(id => !existingDraftThreadIds.has(id));
      const baseIndex = cleaned.indexOf(threadId);
      return [...cleaned.slice(0, baseIndex + 1), newThreadId];
    });

    // Clear temporary highlight and selection
    clearHighlight('temp-selection');
    document.getSelection()?.removeAllRanges();
    setSelectionPopover(null);
    setHighlightPopover(null);

    // Paint the highlight after clicking Discuss (UI only; remains draft until first message sent)
    setTimeout(() => {
      const messageEl = messageRefs.current[messageId];
      if (messageEl) {
        const persistedRange = deserializeRange(highlight.anchor, messageEl);
        if (persistedRange) {
          paintHighlight(persistedRange, highlightId, { threadId: newThreadId });
        }
      }
    }, 100);
  }

  function deleteHighlight(highlightId) {
    if (!activeConversation) return;
    // Find the highlight's parent thread and child thread
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

    // Remove overlay rects
    clearHighlight(highlightId);

    const isChildDraft = !!(childThreadId && activeConversation.threads[childThreadId]?.isDraft);

    updateActiveConversation(conv => {
      const threads = { ...conv.threads };

      // Remove highlight from its parent thread
      if (parentOfHighlightId && threads[parentOfHighlightId]?.highlights) {
        threads[parentOfHighlightId] = {
          ...threads[parentOfHighlightId],
          highlights: threads[parentOfHighlightId].highlights.filter(h => h.id !== highlightId)
        };
      }

      if (childThreadId) {
        if (isChildDraft) {
          // Delete the draft thread entirely
          delete threads[childThreadId];
        } else if (threads[childThreadId]) {
          // Persisted fork: keep the thread but unlink the highlight relationship
          threads[childThreadId] = {
            ...threads[childThreadId],
            parentHighlightId: null,
            highlightedText: undefined
          };
        }
      }

      return { ...conv, threads, updatedAt: Date.now() };
    });

    // Collapse the open scope: remove the fork thread and everything to its right
    if (childThreadId) {
      setChatStack(prev => {
        const idx = prev.indexOf(childThreadId);
        if (idx === -1) return prev;
        return prev.slice(0, idx);
      });
    }

    setHighlightPopover(null);
  }

  // Main render
  return (
    <div className="app">
      <div className="app-nav">
        <a href="/demo" className="nav-link">← Back to Demo</a>
      </div>
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onCreateNewConversation={handleCreateNewConversation}
      />

      {/* Chat Stack */}
      <div className="chat-stack" ref={chatStackRef}>
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
