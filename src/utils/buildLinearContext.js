export function buildLinearContext(conversation, currentThreadId) {
  const messages = [];
  const systemParts = [];
  const threadsInPath = [];

  let threadId = currentThreadId;
  while (threadId) {
    threadsInPath.unshift(threadId);
    const thread = conversation.threads[threadId];
    threadId = thread?.parentThreadId;
  }

  for (const tid of threadsInPath) {
    const thread = conversation.threads[tid];
    if (thread.parentHighlightId && thread.highlightedText) {
      systemParts.push(`[The user highlighted the following text to discuss]: "${thread.highlightedText}"`);
    }
    if (thread.messages) {
      messages.push(...thread.messages.map(m => ({ role: m.role, content: m.content })));
    }
  }

  const systemPrompt = systemParts.join('\n\n');
  return { messages, systemPrompt };
}


