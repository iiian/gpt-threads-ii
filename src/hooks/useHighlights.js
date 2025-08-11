import { useRef, useState } from 'react';
import { deserializeRange } from '../highlightUtils';

const hasCSSHighlights = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof window !== 'undefined' && 'Highlight' in window;

export default function useHighlights(activeConversation, onHighlightClick, selectedHighlightId) {
  const messageRefs = useRef({});
  const [selectionPopover, setSelectionPopover] = useState(null);
  const [highlightPopover, setHighlightPopover] = useState(null);

  const getMessageElementFromNode = (node) => {
    let current = node && node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (current && current !== document.body) {
      if (current.dataset && current.dataset.messageId) return current;
      current = current.parentElement;
    }
    return null;
  };

  function clearHighlight(id) {
    const overlays = document.querySelectorAll(`[data-group="${id}"]`);
    overlays.forEach(n => n.remove());
    if (hasCSSHighlights()) {
      CSS.highlights.delete(id);
    }
  }

  function paintHighlight(range, id, options = {}) {
    clearHighlight(id);
    const messageEl = getMessageElementFromNode(range.commonAncestorContainer);
    if (!messageEl) return;

    const rects = range.getClientRects();
    const messageRect = messageEl.getBoundingClientRect();
    for (const rect of rects) {
      const el = document.createElement('div');
      el.className = 'overlay-rect';
      el.dataset.group = id;
      const relativeTop = rect.top - messageRect.top;
      const relativeLeft = rect.left - messageRect.left;
      const baseColor = options.selected ? 'rgba(77, 255, 200, 0.35)' : 'rgba(245, 207, 87, 0.35)';
      const hoverColor = options.selected ? 'rgba(77, 255, 200, 0.5)' : 'rgba(212, 175, 55, 0.45)';

      Object.assign(el.style, {
        position: 'absolute',
        left: `${relativeLeft}px`,
        top: `${relativeTop}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        backgroundColor: baseColor,
        pointerEvents: options.threadId ? 'auto' : 'none',
        cursor: options.threadId ? 'pointer' : 'default',
        zIndex: '1',
        transition: 'background-color 0.15s ease'
      });
      if (options.threadId && typeof onHighlightClick === 'function') {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectionPopover(null);
          setHighlightPopover(null);
          onHighlightClick(options.threadId);
        });
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectionPopover(null);
          setHighlightPopover({
            x: e.clientX,
            y: e.clientY,
            highlightId: id,
            threadId: options.threadId,
            messageId: messageEl.dataset.messageId
          });
        });
        // Add hover effects
        el.addEventListener('mouseenter', () => {
          el.style.backgroundColor = hoverColor;
        });
        el.addEventListener('mouseleave', () => {
          el.style.backgroundColor = baseColor;
        });
      }
      messageEl.style.position = 'relative';
      messageEl.appendChild(el);
    }
  }

  function repaintHighlights(threadId) {
    if (!activeConversation) return;
    const thread = activeConversation.threads[threadId];
    if (!thread || !thread.highlights) return;
    thread.highlights.forEach(highlight => {
      const messageEl = messageRefs.current[highlight.messageId];
      if (!messageEl) return;
      const range = deserializeRange(highlight.anchor, messageEl);
      if (range) {
        const isSelected = selectedHighlightId && highlight.id === selectedHighlightId;
        paintHighlight(range, highlight.id, { threadId: highlight.threadId, selected: !!isSelected });
      }
    });
  }

  function handleSelection(threadId) {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim() === '') {
      setSelectionPopover(null);
      clearHighlight('temp-selection');
      return;
    }
    const range = sel.getRangeAt(0).cloneRange();
    const messageEl = getMessageElementFromNode(range.commonAncestorContainer);
    if (!messageEl) {
      setSelectionPopover(null);
      clearHighlight('temp-selection');
      return;
    }
    const rects = [...range.getClientRects()];
    if (rects.length === 0) return;
    const last = rects[rects.length - 1];
    // Do not paint temporary highlights here; only after user clicks "Discuss"

    setSelectionPopover({
      x: last.left + last.width / 2,
      y: last.bottom + 8,
      threadId,
      range,
      text: sel.toString(),
      messageId: messageEl.dataset.messageId
    });
  }

  return {
    messageRefs,
    selectionPopover,
    setSelectionPopover,
    highlightPopover,
    setHighlightPopover,
    paintHighlight,
    clearHighlight,
    repaintHighlights,
    handleSelection
  };
}


