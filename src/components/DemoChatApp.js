import React, { useEffect, useRef, useState } from "react";
import { serializeRange, deserializeRange } from '../highlightUtils';
import Thread from './Thread';
import SelectionPopover from './SelectionPopover';
import HighlightPopover from './HighlightPopover';
import useHighlights from '../hooks/useHighlights';
import useThreadStack from '../hooks/useThreadStack';
import useDemoConversations from '../hooks/useDemoConversations';
import useDemoMessaging from '../hooks/useDemoMessaging';

export default function DemoChatApp({ fullscreen = false }) {
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

  // Container for scoping middle-mouse drag-to-scroll
  const containerRef = useRef(null);

  // Detect mobile viewport to decide when to enable the swipe-based layout
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    try {
      return window.matchMedia('(max-width: 768px)').matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobile(e.matches);
    // Initialize immediately
    setIsMobile(mq.matches);
    try {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch (err) {
      // Safari fallback
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, []);

  // Controls brief display of the swipe hint after a highlight/thread is created
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [swipeHintThreadId, setSwipeHintThreadId] = useState(null);
  const swipeHintTimeoutRef = useRef(null);
  useEffect(() => {
    return () => {
      if (swipeHintTimeoutRef.current) clearTimeout(swipeHintTimeoutRef.current);
    };
  }, []);

  // Quote insertion state (linear reply into an existing thread)
  const [nextQuote, setNextQuote] = useState(null);
  const [nextQuoteStamp, setNextQuoteStamp] = useState(0);

  const handleQuoteInsert = (threadId, text) => {
    if (!threadId || !text || !text.trim()) {
      console.debug('[Quote] Ignored empty/missing selection', { threadId, text });
      return;
    }
    console.debug('[Quote] Inserting quote', { threadId, text });
    setNextQuote({ threadId, text });
    setNextQuoteStamp(s => s + 1);
    setFocusThreadId(threadId);
    // Clear selection UI
    try { document.getSelection()?.removeAllRanges(); } catch {}
    setSelectionPopover(null);
    // Ensure the thread is in view
    setTimeout(() => scrollToThread(threadId), 0);
  };

  // Middle-mouse drag to horizontally scroll the chat stack, even over inputs (Pointer Events)
  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    let isPanning = false;
    let startX = 0;
    let startScrollLeft = 0;
    let targetScroller = null;
    let panPointerId = null;
    let prevHtmlOverflow = '';
    let prevBodyOverflow = '';
    let prevBodyOverscroll = '';
    let overlayEl = null;

    const withinContainer = (e) => {
      // Prefer DOM containment; falls back to geometry if target missing
      if (e && e.target && containerEl.contains(e.target)) return true;
      const rect = containerEl.getBoundingClientRect();
      return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    };

    const onPointerDown = (e) => {
      if (e.pointerType !== 'mouse') return;
      // Middle button detection: primary=0, middle=1, secondary=2. Also allow bitmask for safety.
      if (e.button !== 1 && !(e.buttons & 4)) return;
      if (!withinContainer(e)) return;
      const scroller = chatStackRef.current;
      if (!scroller) return;
      isPanning = true;
      panPointerId = e.pointerId;
      targetScroller = scroller;
      startX = e.clientX;
      startScrollLeft = scroller.scrollLeft;
      // Capture pointer so moves continue even over inputs/other elements (use original target)
      try {
        const captureEl = (e.target && typeof e.target.setPointerCapture === 'function') ? e.target : containerEl;
        captureEl.setPointerCapture(e.pointerId);
      } catch {}
      // Prevent native autoscroll / paste
      e.preventDefault();
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      // Add full-screen overlay to intercept native autoscroll and clicks (helps Firefox)
      overlayEl = document.createElement('div');
      Object.assign(overlayEl.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '9999',
        cursor: 'grabbing',
        background: 'transparent',
      });
      const block = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      overlayEl.addEventListener('mousedown', block, { capture: true });
      overlayEl.addEventListener('mouseup', block, { capture: true });
      overlayEl.addEventListener('click', block, { capture: true });
      document.body.appendChild(overlayEl);
      // Lock page scrolling (helps Firefox autoscroll)
      prevHtmlOverflow = document.documentElement.style.overflow;
      prevBodyOverflow = document.body.style.overflow;
      prevBodyOverscroll = document.body.style.overscrollBehavior;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
    };

    const onPointerMove = (e) => {
      if (!isPanning || e.pointerId !== panPointerId || !targetScroller) return;
      const dx = e.clientX - startX;
      targetScroller.scrollLeft = startScrollLeft - dx;
      e.preventDefault();
    };

    const endPan = (e) => {
      if (!isPanning) return;
      if (e && panPointerId != null && e.pointerId !== panPointerId) return;
      isPanning = false;
      const pid = e?.pointerId;
      panPointerId = null;
      targetScroller = null;
      try { if (pid != null) containerEl.releasePointerCapture(pid); } catch {}
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Restore page scroll styles
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      // Remove overlay if present
      if (overlayEl && overlayEl.parentNode) {
        try {
          overlayEl.parentNode.removeChild(overlayEl);
        } catch {}
      }
      overlayEl = null;
    };

    const onAuxClick = (e) => {
      if (e.button !== 1) return;
      if (!withinContainer(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    document.addEventListener('pointermove', onPointerMove, { capture: true });
    document.addEventListener('pointerup', endPan, { capture: true });
    document.addEventListener('pointercancel', endPan, { capture: true });
    document.addEventListener('auxclick', onAuxClick, { capture: true });
    const onClickBlockDefault = (e) => {
      if (e.button !== 1) return;
      if (!withinContainer(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('click', onClickBlockDefault, { capture: true });
    // Block native middle-click autoscroll/new-tab via mousedown as well
    const onMouseDownBlockDefault = (e) => {
      if (e.button !== 1) return;
      if (!withinContainer(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onMouseUpBlockDefault = (e) => {
      if (e.button !== 1) return;
      if (!withinContainer(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('mousedown', onMouseDownBlockDefault, { capture: true });
    document.addEventListener('mouseup', onMouseUpBlockDefault, { capture: true });

    // Mouse fallback if Pointer Events not available or misbehaving
    const hasPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;
    let mouseFallbackBound = false;
    const onMouseDown = (e) => {
      if (isPanning) return;
      if (e.button !== 1 && !(e.buttons & 4)) return;
      if (!withinContainer(e)) return;
      const scroller = chatStackRef.current;
      if (!scroller) return;
      isPanning = true;
      targetScroller = scroller;
      startX = e.clientX;
      startScrollLeft = scroller.scrollLeft;
      e.preventDefault();
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    };
    const onMouseMove = (e) => {
      if (!isPanning || !targetScroller) return;
      const dx = e.clientX - startX;
      targetScroller.scrollLeft = startScrollLeft - dx;
      e.preventDefault();
    };
    const onMouseUp = () => endPan();
    if (!hasPointerEvents) {
      containerEl.addEventListener('mousedown', onMouseDown, { capture: true });
      window.addEventListener('mousemove', onMouseMove, { capture: true });
      window.addEventListener('mouseup', onMouseUp, { capture: true });
      mouseFallbackBound = true;
    }

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true });
      document.removeEventListener('pointermove', onPointerMove, { capture: true });
      document.removeEventListener('pointerup', endPan, { capture: true });
      document.removeEventListener('pointercancel', endPan, { capture: true });
      document.removeEventListener('auxclick', onAuxClick, { capture: true });
      document.removeEventListener('click', onClickBlockDefault, { capture: true });
      document.removeEventListener('mousedown', onMouseDownBlockDefault, { capture: true });
      document.removeEventListener('mouseup', onMouseUpBlockDefault, { capture: true });
      if (mouseFallbackBound) {
        containerEl.removeEventListener('mousedown', onMouseDown, { capture: true });
        window.removeEventListener('mousemove', onMouseMove, { capture: true });
        window.removeEventListener('mouseup', onMouseUp, { capture: true });
      }
      if (overlayEl && overlayEl.parentNode) {
        try { overlayEl.parentNode.removeChild(overlayEl); } catch {}
        overlayEl = null;
      }
      // Ensure state cleanup
      isPanning = false;
      panPointerId = null;
      targetScroller = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

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

    // Briefly show the swipe hint (max 3s) once a highlight/thread is established
    if (swipeHintTimeoutRef.current) clearTimeout(swipeHintTimeoutRef.current);
    setShowSwipeHint(true);
    setSwipeHintThreadId(newThreadId);
    swipeHintTimeoutRef.current = setTimeout(() => setShowSwipeHint(false), 3000);
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
      className={`demo-embed ${fullscreen && isMobile ? 'mobile-demo' : ''}`}
      ref={containerRef}
      style={{
        height: fullscreen ? '100vh' : 560,
        border: fullscreen ? 'none' : '1px solid #22252c',
        borderRadius: fullscreen ? 0 : 8,
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
              quoteText={nextQuote?.threadId === threadId ? nextQuote?.text : undefined}
              quoteStamp={nextQuote?.threadId === threadId ? nextQuoteStamp : 0}
              swipeHint={fullscreen && showSwipeHint && chatStack.length > 1 && threadId === swipeHintThreadId}
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
        onQuote={handleQuoteInsert}
      />

      <HighlightPopover
        highlightPopover={highlightPopover}
        onDeleteHighlight={deleteHighlight}
      />
    </div>
  );
}
