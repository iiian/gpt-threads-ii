import { useRef } from 'react';

// A minimal linear script runner for the demo.
// See schema examples in src/demoScript.js
export default function useDemoScriptRunner(scriptArray) {
  const indexRef = useRef(0);
  const lastThreadRef = useRef('root');

  const peek = () => scriptArray?.[indexRef.current] || null;

  const resolveThread = (declared) => {
    if (declared === 'same' || !declared) return lastThreadRef.current;
    if (declared === 'root') return 'root';
    return declared;
  };

  const consumeUserMessage = (threadId, text) => {
    const assistants = [];
    // If next expected is a user step, advance it. We don't hard-enforce matching text.
    const step = peek();
    if (step && step.type === 'user') {
      lastThreadRef.current = threadId;
      indexRef.current += 1; // consume user step
    }
    // Collect any following assistant steps
    while (true) {
      const s = peek();
      if (!s || s.type !== 'assistant') break;
      const targetThread = resolveThread(s.thread);
      assistants.push({ threadId: targetThread, text: s.text || '', declaredThread: s.thread });
      indexRef.current += 1;
    }
    return assistants;
  };

  const advancePastInitialAssistants = () => {
    // Skip any leading assistant steps targeting the root thread that were already seeded
    // into the initial conversation by useDemoConversations.
    while (true) {
      const s = peek();
      if (!s || s.type !== 'assistant') break;
      const t = resolveThread(s.thread);
      if (t !== 'root') break;
      indexRef.current += 1;
    }
  };

  const getNextUserPrefill = () => {
    const s = peek();
    if (!s || s.type !== 'user') return null;
    const targetThread = resolveThread(s.thread || 'root');
    return { threadId: targetThread, text: s.text || '' };
  };

  // Consume contiguous assistant steps without requiring a preceding user step.
  // Returns an array of { threadId, text } and advances the pointer past them.
  const consumeAssistantSteps = () => {
    const assistants = [];
    while (true) {
      const s = peek();
      if (!s || s.type !== 'assistant') break;
      const targetThread = resolveThread(s.thread);
      assistants.push({ threadId: targetThread, text: s.text || '', declaredThread: s.thread });
      indexRef.current += 1;
    }
    return assistants;
  };

  // Advance pointer past non-message steps like highlight_create / discuss_click.
  // If typesFilter is provided, only advance for those types; otherwise advance for any
  // non 'user'/'assistant' types.
  const advanceNonMessageSteps = (typesFilter = null) => {
    let advanced = false;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const s = peek();
      if (!s) break;
      if (s.type === 'user' || s.type === 'assistant') break;
      if (typesFilter && !typesFilter.has(s.type)) break;
      indexRef.current += 1;
      advanced = true;
    }
    return advanced;
  };

  const getPointer = () => indexRef.current;
  const reset = () => { indexRef.current = 0; lastThreadRef.current = 'root'; };
  const nextStep = () => peek();

  return {
    consumeUserMessage,
    advancePastInitialAssistants,
    getNextUserPrefill,
    consumeAssistantSteps,
    advanceNonMessageSteps,
    getPointer,
    reset,
    nextStep,
  };
}
