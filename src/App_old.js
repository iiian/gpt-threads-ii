import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { callClaudeAPI } from './claudeApi';
import { serializeRange, deserializeRange } from './highlightUtils';

// Minimal single-file demo:
// - Highlight arbitrary substrings without DOM mutation (CSS Highlights API w/ overlay fallback)
// - Popover with "Discuss" on mouseup
// - Side-by-side subthreads that fork from highlights
// - Simple persistence in localStorage (per session) by messageId
//
// Fixes in this revision:
// - Correct default export syntax ("export default function App()")
// - Guard against missing Highlight constructor even if CSS.highlights exists
// - Repaint highlights on resize/scroll and when highlights list changes
// - Add lightweight self-tests for serialize/deserialize and painting

// --- CSS helpers injected locally ---
const style = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  .app { display: flex; height: 100vh; background:#0b0c10; color:#e6e6e6; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial; }
  
  /* Sidebar */
  .sidebar { width: 280px; background:#111317; border-right:1px solid #22252c; display:flex; flex-direction: column; flex-shrink: 0; }
  .sidebar h2 { margin:0; padding:14px 16px; border-bottom:1px solid #22252c; font-weight:600; letter-spacing:.2px; font-size: 14px; }
  .conversation-list { flex:1; overflow:auto; padding:8px; }
  .conversation-item { padding:10px 12px; margin-bottom:4px; background:#0f131a; border:1px solid #1d2330; border-radius:8px; cursor:pointer; transition: all 0.2s; }
  .conversation-item:hover { background:#141922; border-color:#2a3142; }
  .conversation-item.active { background:#1a2332; border-color:#3b82f6; }
  .new-conversation-btn { margin:8px; padding:10px; background:#1c7cf2; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600; }
  
  /* Chat Stack Container */
  .chat-stack { flex:1; display:flex; overflow-x:auto; overflow-y:hidden; background:#0d0e12; }
  .chat-stack::-webkit-scrollbar { height: 8px; }
  .chat-stack::-webkit-scrollbar-track { background: #111317; }
  .chat-stack::-webkit-scrollbar-thumb { background: #22252c; border-radius: 4px; }
  
  /* Individual Chat Thread */
  .chat-thread { min-width: 480px; max-width: 480px; background:#111317; border-right:1px solid #22252c; display:flex; flex-direction: column; position: relative; }
  .chat-header { padding:12px 16px; border-bottom:1px solid #22252c; font-weight:600; font-size: 13px; color:#94a3b8; display:flex; align-items:center; gap:8px; }
  .chat-messages { flex:1; overflow:auto; padding:16px; position:relative; }
  .chat-input-container { padding:12px; border-top:1px solid #22252c; background:#0f1115; }
  .chat-input-row { display:flex; gap:8px; }
  .chat-input { flex:1; background:#0b0d12; color:#e6e6e6; border:1px solid #1d2330; border-radius:8px; padding:10px 12px; outline:none; font-size: 14px; }
  .chat-send-btn { background:#1c7cf2; color:white; border:none; padding:10px 16px; border-radius:8px; cursor:pointer; font-weight:600; }
  
  /* Messages */
  .message { margin-bottom:16px; }
  .message-role { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; opacity:0.7; }
  .message-role.user { color:#3b82f6; }
  .message-role.assistant { color:#10b981; }
  .message-content { background:#0f131a; border:1px solid #1d2330; border-radius:10px; padding:12px; line-height:1.6; }
  .message-content p { margin: 0 0 8px 0; }
  .message-content p:last-child { margin: 0; }
  .message-content code { background:#1d2330; padding:2px 4px; border-radius:3px; }
  .message-content pre { background:#0b0d12; border:1px solid #1d2330; border-radius:6px; padding:12px; overflow-x:auto; }
  
  /* Highlights and Popover */
  .popover { position:absolute; background:#0b0d12; border:1px solid #2a3142; border-radius:10px; padding:8px; box-shadow:0 10px 30px rgba(0,0,0,.35); z-index:60; display:flex; gap:8px; }
  .btn { background:#1c7cf2; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:600; font-size:13px; }
  .btn.secondary { background:#212634; color:#cbd5e1; }
  .overlay-layer { position: fixed; inset: 0; pointer-events: none; z-index: 40; }
  .overlay-rect { position:fixed; background: rgba(245, 207, 87, 0.35); border-radius:4px; mix-blend-mode: multiply; }
  
  /* Fork indicator */
  .fork-indicator { font-size:11px; background:#182031; border:1px solid #2b3650; color:#cbd5e1; padding:6px 10px; border-radius:6px; margin-bottom:12px; }
  .fork-indicator .highlight-text { color:#f5cf57; font-style:italic; }
  
  /* Loading */
  .loading { padding:8px 12px; background:#1d2330; border-radius:6px; font-size:13px; margin-bottom:12px; }
  .hl-chip { display:inline-flex; gap:6px; align-items:center; background:#182031; border:1px solid #2b3650; color:#cbd5e1; font-size:12px; padding:4px 8px; border-radius:999px; cursor:pointer; }
  .hl-chip.active { border-color:#3b82f6; box-shadow:0 0 0 1px #3b82f6 inset; }
  .threads { display:flex; gap:12px; overflow:auto; padding:12px; }
  .thread { min-width: 420px; background:#0f131a; border:1px solid #1d2330; border-radius:12px; display:flex; flex-direction:column; }
  .thread.active { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,.35) inset; }
`;

// Util: feature detection
const hasCSSHighlights = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof window !== 'undefined' && 'Highlight' in window;

export default function App() {
  return <ChatApp />;
}

function ChatApp() {
  const styleTagRef = useRef(null);

  useEffect(() => {
    const tag = document.createElement('style');
    tag.innerHTML = style;
    document.head.appendChild(tag);
    styleTagRef.current = tag;
    return () => tag.remove();
  }, []);

  // State for conversations
  const [conversations, setConversations] = useState(() => {
    const stored = localStorage.getItem('gpt-threads-conversations');
    return stored ? JSON.parse(stored) : [];
  });
  
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [chatStack, setChatStack] = useState([]); // Array of thread IDs showing the current path
  
  // State for highlights
  const [highlights, setHighlights] = useState({});
  const highlightsRef = useRef(highlights);
  
  // Refs
  const overlayRef = useRef(null);
  const messageRefs = useRef({});
  
  // Keep highlightsRef in sync
  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  // Save conversations to localStorage
  useEffect(() => {
    localStorage.setItem('gpt-threads-conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Create a new conversation
  function createNewConversation() {
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
    
    setConversations(prev => [...prev, newConvo]);
    setActiveConversationId(newConvo.id);
    setChatStack(['root']);
    return newConvo;
  }

  // Get active conversation
  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find(c => c.id === activeConversationId);
  }, [conversations, activeConversationId]);

  // Handle selecting a conversation
  function selectConversation(convId) {
    setActiveConversationId(convId);
    setChatStack(['root']);
  }

  // Initialize with a new conversation if none exist
  useEffect(() => {
    if (conversations.length === 0) {
      createNewConversation();
    } else if (!activeConversationId) {
      setActiveConversationId(conversations[0].id);
      setChatStack(['root']);
    }
  }, []);

  // Fork a conversation from a highlight
  function forkConversation(threadId, highlightText, range, messageId) {
    if (!activeConversation) return;
    
    const newThreadId = `thread-${Date.now()}`;
    const highlightId = `hl-${Date.now()}`;
    
    // Create highlight record
    const highlight = {
      id: highlightId,
      messageId,
      text: highlightText,
      threadId: newThreadId,
      anchor: serializeRange(range, messageRefs.current[messageId])
    };
    
    // Update conversation with new thread
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConversationId) return conv;
      
      return {
        ...conv,
        threads: {
          ...conv.threads,
          [threadId]: {
            ...conv.threads[threadId],
            highlights: [...(conv.threads[threadId].highlights || []), highlight]
          },
          [newThreadId]: {
            id: newThreadId,
            parentThreadId: threadId,
            parentHighlightId: highlightId,
            highlightedText: highlightText,
            messages: [],
            highlights: []
          }
        },
        updatedAt: Date.now()
      };
    }));
    
    // Update highlights state
    setHighlights(prev => ({
      ...prev,
      [highlightId]: highlight
    }));
    
    // Update chat stack to show the new thread
    const currentIndex = chatStack.indexOf(threadId);
    setChatStack(prev => [...prev.slice(0, currentIndex + 1), newThreadId]);
    
    // Clear selection
    document.getSelection()?.removeAllRanges();
  }

  // Build linear context for Claude API
  function buildLinearContext(conversation, currentThreadId, newMessage) {
    const messages = [];
    const threadsInPath = [];
    
    // Build path from root to current thread
    let threadId = currentThreadId;
    while (threadId) {
      threadsInPath.unshift(threadId);
      const thread = conversation.threads[threadId];
      threadId = thread?.parentThreadId;
    }
    
    // Collect all messages in chronological order
    for (const tid of threadsInPath) {
      const thread = conversation.threads[tid];
      
      // If this thread is forked from a highlight, add context
      if (thread.parentHighlightId && thread.highlightedText) {
        messages.push({
          role: 'system',
          content: `[The user highlighted the following text to discuss]: "${thread.highlightedText}"`
        });
      }
      
      // Add thread messages
      if (thread.messages) {
        messages.push(...thread.messages.map(m => ({
          role: m.role,
          content: m.content
        })));
      }
    }
    
    // Add the new message
    if (newMessage) {
      messages.push({
        role: newMessage.role,
        content: newMessage.content
      });
    }
    
    return messages;
  }

  // Send message to Claude
  async function sendMessage(threadId, message) {
    if (!activeConversation || !message.trim()) return;
    
    // Add user message
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConversationId) return conv;
      return {
        ...conv,
        threads: {
          ...conv.threads,
          [threadId]: {
            ...conv.threads[threadId],
            messages: [...(conv.threads[threadId].messages || []), userMessage]
          }
        },
        updatedAt: Date.now()
      };
    }));
    
    // Prepare context for Claude (linearize conversation history)
    const context = buildLinearContext(activeConversation, threadId, userMessage);
    
    try {
      const response = await callClaudeAPI(context);
      
      const assistantMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      
      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeConversationId) return conv;
        return {
          ...conv,
          threads: {
            ...conv.threads,
            [threadId]: {
              ...conv.threads[threadId],
              messages: [...conv.threads[threadId].messages, assistantMessage]
            }
          },
          updatedAt: Date.now()
        };
      }));
      
    } catch (error) {
      console.error('Error calling Claude:', error);
      // Add error message
      const errorMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `Error: ${error.message}. Please ensure your API key is set in .env.local`,
        timestamp: Date.now()
      };
      
      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeConversationId) return conv;
        return {
          ...conv,
          threads: {
            ...conv.threads,
            [threadId]: {
              ...conv.threads[threadId],
              messages: [...conv.threads[threadId].messages, errorMessage]
            }
          },
          updatedAt: Date.now()
        };
      }));
    }
  }

  // Paint highlights
  function paintHighlight(range, id) {
    clearHighlight(id);
    if (hasCSSHighlights()) {
      const hl = new window.Highlight(range);
      CSS.highlights.set(id, hl);
      
      // Inject CSS rule for this highlight ID
      if (styleTagRef.current && !styleTagRef.current.innerHTML.includes(`::highlight(${id})`)) {
        styleTagRef.current.innerHTML += `\n  ::highlight(${id}) { background-color: rgba(245, 207, 87, 0.35); }`;
      }
    } else {
      if (!overlayRef.current) return;
      for (const rect of range.getClientRects()) {
        const el = document.createElement('div');
        el.className = 'overlay-rect';
        el.dataset.group = id;
        Object.assign(el.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`
        });
        overlayRef.current.appendChild(el);
      }
    }
  }

  function clearHighlight(id) {
    if (hasCSSHighlights()) CSS.highlights.delete(id);
    const overlays = document.querySelectorAll(`[data-group="${id}"]`);
    overlays.forEach(n => n.remove());
  }

  // Repaint all highlights for a thread
  function repaintHighlights(threadId) {
    if (!activeConversation) return;
    const thread = activeConversation.threads[threadId];
    if (!thread || !thread.highlights) return;
    
    thread.highlights.forEach(highlight => {
      const messageEl = messageRefs.current[highlight.messageId];
      if (!messageEl) return;
      
      const range = deserializeRange(highlight.anchor, messageEl);
      if (range) {
        paintHighlight(range, highlight.id);
      }
    });
  }

  // Selection -> popover
  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;

    const onMouseUp = () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed) { setSelectionPopover(null); clearPaint('live'); return; }
      // Only respond if selection is within our article
      if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) { setSelectionPopover(null); clearPaint('live'); return; }

      const range = sel.getRangeAt(0).cloneRange();
      const rects = [...range.getClientRects()];
      if (rects.length === 0) return;
      const last = rects[rects.length - 1];

      // Paint live selection
      paintRange(range, 'live', overlayRef.current);

      // If selection overlaps an existing highlight, mark its thread active
      let matchedThread = null;
      for (const h of highlights) {
        const hr = deserializeRange(h.anchor, root);
        if (hr && rangesOverlap(range, hr)) { matchedThread = h.threadId; break; }
      }
      setActiveThreadId(matchedThread);

      setSelectionPopover({
        x: last.left + last.width / 2,
        y: last.bottom + 6,
        rects,
        range,
      });
    };

    root.addEventListener('mouseup', onMouseUp);
    return () => root.removeEventListener('mouseup', onMouseUp);
  }, [highlights]);

  function clearPaint(id) {
    if (hasCSSHighlights()) {
      CSS.highlights.delete(id);

      // Also remove the CSS rule if it's not a persistent highlight
      if (id === 'live' && styleTagRef.current) {
        styleTagRef.current.innerHTML = styleTagRef.current.innerHTML.replace(`\n  ::highlight(${id}) { background-color: rgba(245, 207, 87, 0.35); }`, '');
      }
    }
    // Clear overlays of a given group
    const layer = overlayRef.current;
    if (layer) layer.querySelectorAll(`[data-group="${id}"]`).forEach(n => n.remove());
  }

  function paintRange(range, id, layerEl) {
    clearPaint(id);
    if (hasCSSHighlights()) {
      const hl = new window.Highlight(range);
      CSS.highlights.set(id, hl);

      // Inject CSS rule for this specific highlight ID
      if (styleTagRef.current && !styleTagRef.current.innerHTML.includes(`::highlight(${id})`)) {
        styleTagRef.current.innerHTML += `\n  ::highlight(${id}) { background-color: rgba(245, 207, 87, 0.35); }`;
      }
    } else {
      if (!layerEl) return;
      for (const rect of range.getClientRects()) {
        const el = document.createElement('div');
        el.className = 'overlay-rect';
        el.dataset.group = id;
        Object.assign(el.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
        layerEl.appendChild(el);
      }
    }
  }

  // Returns true if ranges have any overlap
  function rangesOverlap(a, b) {
    try {
      // No overlap if A ends before or at B starts
      if (a.compareBoundaryPoints(Range.END_TO_START, b) <= 0) return false;
      // No overlap if A starts after or at B ends
      if (a.compareBoundaryPoints(Range.START_TO_END, b) >= 0) return false;
      return true;
    } catch { return false; }
  }

  // Build linear context for Claude
  function buildLinearContext(conversation, currentThreadId, newUserMessage) {
    const messages = [];
    
    // Traverse up the thread chain to root, then reverse
    let threadPath = [];
    let threadId = currentThreadId;
    
    while (threadId) {
      threadPath.unshift(threadId);
      const thread = conversation.threads[threadId];
      threadId = thread?.parentThreadId;
    }
    
    // Collect all messages in chronological order
    for (const tid of threadPath) {
      const thread = conversation.threads[tid];
      
      // If this is a forked thread, add context about the highlight
      if (thread.parentHighlightId && thread.highlightedText) {
        messages.push({
          role: 'system',
          content: `[User highlighted the following text for focused discussion: "${thread.highlightedText}"]`
        });
      }
      
      // Add all messages from this thread (except the new one we just added)
      const threadMessages = thread.messages || [];
      for (const msg of threadMessages) {
        if (msg.id !== newUserMessage.id) {
          messages.push(msg);
        }
      }
    }
    
    // Add the new user message at the end
    messages.push(newUserMessage);
    
    return messages;
  }

  function onDiscuss() {
    if (!selectionPopover) return;
    const { range } = selectionPopover;

    // Persist a minimal anchor: DOM paths + offsets + a text quote (for demo we keep it simple)
    const anchor = serializeRange(range, articleRef.current);
    const id = `hl-${Date.now()}-${selIdRef.current++}`;

    const title = clampText(range.toString(), 48);

    const newThread = {
      id: `thread-${threads.length + 1}`, title, messages: [
        `New discussion spawned from highlight “${title}”.`,
      ]
    };

    const newHL = { id, anchor, threadId: newThread.id, color: 'gold' };
    const next = [...highlights, newHL];
    setHighlights(next);
    saveHLs(messageId, next);

    setThreads(t => [...t, newThread]);
    setActiveThreadId(newThread.id);

    // Paint a persistent highlight id
    const r2 = deserializeRange(anchor, articleRef.current);
    if (r2) paintRange(r2, id, overlayRef.current);

    // Clear live popover
    setSelectionPopover(null);
    clearPaint('live');
    document.getSelection()?.removeAllRanges();
  }

  // Repaint stored highlights on mount, when highlights change, and on resize/scroll
  useEffect(() => {
    if (!articleRef.current) return;
    
    // Use MutationObserver to detect when ReactMarkdown finishes rendering
    const observer = new MutationObserver(() => {
      // Debounce repainting to avoid excessive calls
      clearTimeout(observer.timeoutId);
      observer.timeoutId = setTimeout(() => repaintAll(), 50);
    });
    
    observer.observe(articleRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Initial paint with a delay to ensure content is rendered
    setTimeout(() => repaintAll(), 100);
    
    return () => {
      observer.disconnect();
      clearTimeout(observer.timeoutId);
    };
  }, [articleRef.current]);
  
  useEffect(() => { 
    // Repaint when highlights change, with a delay for React rendering
    setTimeout(() => repaintAll(), 50);
  }, [highlights]);
  useEffect(() => {
    let resizeTimeout;
    let scrollTimeout;
    
    // Debounced repaint for better performance
    const onResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => repaintAll(), 100);
    };
    
    const onScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => repaintAll(), 50);
    };
    
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true); // capture scrolls in nested containers
    
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
      clearTimeout(resizeTimeout);
      clearTimeout(scrollTimeout);
      if (overlayRef.current) overlayRef.current.innerHTML = '';
      if (hasCSSHighlights()) CSS.highlights.clear();
    };
  }, []);

  // Simple fake send in a thread
  function sendToThread(threadId, text) {
    setThreads(ts => ts.map(t => t.id === threadId ? { ...t, messages: [...t.messages, text, `LLM: (echo) ${text}`] } : t));
  }

  // --- Self-tests (basic) ---
  useEffect(() => {
    // Test 1: serialize/deserialize round-trip on a known substring
    const root = articleRef.current;
    if (!root) return;
    const tn = findTextNodeContaining(root, 'bold text');
    if (tn) {
      const start = tn.nodeValue.indexOf('bold text');
      const r = new Range();
      r.setStart(tn, start);
      r.setEnd(tn, start + 'bold text'.length);
      const a = serializeRange(r, root);
      const r2 = deserializeRange(a, root);
      console.assert(r2 && r2.toString().replace(/\s+/g, ' ').trim() === 'bold text', 'Test 1 failed: round-trip mismatch');
    }
    // Test 2: paint via API or overlay should produce at least one rect
    const tn2 = findTextNodeContaining(root, 'Array.from');
    if (tn2) {
      const start = tn2.nodeValue.indexOf('Array.from');
      const rr = new Range();
      rr.setStart(tn2, start);
      rr.setEnd(tn2, start + 'Array.from'.length);
      // Try painting to a temp id and immediately clear
      paintRange(rr, '__test__', overlayRef.current);
      let ok = false;
      if (hasCSSHighlights()) ok = true; // if API present, we assume success
      else ok = overlayRef.current?.querySelectorAll('[data-group="__test__"]').length > 0;
      console.assert(ok, 'Test 2 failed: no painted rects');
      clearPaint('__test__');
    }
  }, []);

  return (
    <div className="app">
      <div className="col">
        <h2>Main Conversation</h2>
        <div className="messages">
          {messageHtml}
          {selectionPopover && (
            <div className="popover" style={{ left: selectionPopover.x - 60, top: selectionPopover.y }}>
              <button className="btn" onClick={onDiscuss}>Discuss</button>
              <button className="btn secondary" onClick={() => { setSelectionPopover(null); clearPaint('live'); }}>Cancel</button>
            </div>
          )}
          <div ref={overlayRef} className="overlay-layer" />
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {highlights.map(h => (
              <span key={h.id} className={`hl-chip${activeThreadId === h.threadId ? ' active' : ''}`} title={h.threadId} onClick={() => {
                setActiveThreadId(h.threadId);
                const r = deserializeRange(h.anchor, articleRef.current);
                if (r) {
                  paintRange(r, h.id, overlayRef.current);
                  try { r.startContainer?.parentElement?.scrollIntoView({ block: 'center' }); } catch { }
                }
              }}>
                🔗 {h.threadId}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="col">
        <h2>Subthreads</h2>
        <div className="threads">
          {threads.length === 0 && <div style={{ opacity: .7, padding: 16 }}>No subthreads yet. Highlight text and click Discuss.</div>}
          {threads.map(t => (
            <Thread key={t.id} thread={t} onSend={sendToThread} active={t.id === activeThreadId} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Thread({ thread, onSend, active }) {
  const [text, setText] = useState("");
  return (
    <div className={`thread${active ? ' active' : ''}`}>
      <div style={{ padding: 12, borderBottom: '1px solid #1d2330', display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>{thread.title || thread.id}</strong>
      </div>
      <div style={{ padding: 12, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {thread.messages.map((m, i) => (
          <div key={i} style={{ background: '#0b0d12', border: '1px solid #1d2330', borderRadius: 10, padding: 10 }}>{m}</div>
        ))}
      </div>
      <div className="inputRow">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Ask something about the highlight…" onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onSend(thread.id, text.trim()); setText(''); } }} />
        <button className="btn" onClick={() => { if (text.trim()) { onSend(thread.id, text.trim()); setText(''); } }}>Send</button>
      </div>
    </div>
  );
}

// --- Simple (de)serialization of a Range relative to a root ---
function nodePath(root, node) {
  const path = [];
  let n = node;
  while (n && n !== root) {
    const parent = n.parentNode;
    if (!parent) break;
    const i = Array.prototype.indexOf.call(parent.childNodes, n);
    path.push(i);
    n = parent;
  }
  return path.reverse();
}

function nodeFromPath(root, path) {
  let n = root;
  for (const idx of path) n = n.childNodes[idx];
  return n;
}

function serializeRange(range, root) {
  return {
    start: { path: nodePath(root, range.startContainer), offset: range.startOffset },
    end: { path: nodePath(root, range.endContainer), offset: range.endOffset },
    quote: clampText(range.toString(), 80)
  };
}

function deserializeRange(anchor, root) {
  try {
    const r = new Range();
    const s = nodeFromPath(root, anchor.start.path);
    const e = nodeFromPath(root, anchor.end.path);
    r.setStart(s, Math.min(anchor.start.offset, s.nodeType === 3 ? s.length : s.childNodes.length));
    r.setEnd(e, Math.min(anchor.end.offset, e.nodeType === 3 ? e.length : e.childNodes.length));
    return r;
  } catch { return null; }
}

function clampText(s, n) { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function loadHLs(msgId) {
  try { return JSON.parse(localStorage.getItem('hl:' + msgId) || '[]'); } catch { return []; }
}
function saveHLs(msgId, arr) {
  try { localStorage.setItem('hl:' + msgId, JSON.stringify(arr)); } catch { }
}

function findTextNodeContaining(root, needle) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let n; while (n = walker.nextNode()) {
    if (n.nodeValue && n.nodeValue.includes(needle)) return n;
  }
  return null;
}
