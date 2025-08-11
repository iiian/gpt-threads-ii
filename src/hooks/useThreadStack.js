import { useState, useEffect, useRef } from 'react';

export default function useThreadStack() {
  const [chatStack, setChatStack] = useState(['root']); // Array of thread IDs showing the current path
  const [focusThreadId, setFocusThreadId] = useState(null); // Track which thread should be focused
  const chatStackRef = useRef(null); // Ref for the chat stack container

  // Reset focus state after Thread components have used it
  useEffect(() => {
    if (focusThreadId) {
      const timer = setTimeout(() => {
        setFocusThreadId(null);
      }, 100); // Small delay to ensure Thread component has rendered
      return () => clearTimeout(timer);
    }
  }, [focusThreadId]);

  // Close a thread column (and all to its right)
  const closeThread = (targetThreadId) => {
    setChatStack(prev => {
      const idx = prev.indexOf(targetThreadId);
      if (idx === -1) return prev;
      // Remove the target thread and everything to its right
      return prev.slice(0, idx);
    });
  };

  // Scroll chat stack to show the focused thread
  const scrollToThread = (focusedThreadId) => {
    if (!chatStackRef.current) return;

    const threadIndex = chatStack.indexOf(focusedThreadId);
    if (threadIndex === -1) return;

    const container = chatStackRef.current;
    const threadWidth = 640; // From CSS: min-width and max-width of .chat-thread
    const targetScrollLeft = threadIndex * threadWidth;

    // Smooth scroll to the thread
    container.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    });
  };

  // Open a thread by building the path from root
  const openThreadById = (activeConversation, threadIdToOpen) => {
    if (!activeConversation || !threadIdToOpen) return;
    // Build stack from root to target
    const path = [];
    let tid = threadIdToOpen;
    while (tid) {
      path.unshift(tid);
      const t = activeConversation.threads[tid];
      tid = t?.parentThreadId;
    }
    setChatStack(path);
    setFocusThreadId(threadIdToOpen); // Focus the opened thread
  };

  // Reset to root thread
  const resetToRoot = () => {
    setChatStack(['root']);
    setFocusThreadId('root');
  };

  return {
    chatStack,
    setChatStack,
    focusThreadId,
    setFocusThreadId,
    chatStackRef,
    closeThread,
    scrollToThread,
    openThreadById,
    resetToRoot
  };
}
