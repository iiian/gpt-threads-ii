// Linear demo script for the Chat demo.
// Fill this array with step objects to guide the user through a walkthrough.
//
// Supported commands (MVP):
// - { type: 'user', thread: 'root' | string, text?: string }
//     Marks that the next user message is expected in this thread. If text is provided,
//     the runner will prefer to match it, but won't block if it differs.
// - { type: 'assistant', thread: 'same' | 'root' | string, text: string }
//     Enqueues an assistant message in the given thread. 'same' uses the thread of the
//     most recent user step.
//
// Planned commands (placeholders; not yet executed by the runner):
// - { type: 'highlight_create', thread: string, messageId: string, start: number, end: number, label?: string }
// - { type: 'highlight_click', highlightId?: string, messageId?: string, start?: number, end?: number }
// - { type: 'highlight_delete', highlightId: string }
// - { type: 'sleep', ms: number }
//
// Notes:
// - Steps are consumed in order. 'user' steps are advanced when the user sends a message.
// - Immediately following 'assistant' steps are emitted as scripted replies.
// - If the script is exhausted or the next step doesn't match, the demo falls back to
//   the built-in canned assistant reply in useDemoMessaging.

export const demoScript = [
    {
        type: 'assistant',
        thread: 'root',
        text: 'Alright, first step: enter the text "how does thread forking work under the hood?"'
    },
    {
        type: 'user',
        thread: 'root',
        text: 'how does thread forking work under the hood?'
    },
    {
        type: 'assistant',
        thread: 'root',
        text: `
_This is a scripted demo response, not an LLM._

Under the hood, thread forking is implemented as a **tree of messages** from the perspective of the user, and a **chronological history of messages** with quotation templates from the perspective of the LLM.

**next step:** highlight the text "_tree of messages_" above, and then click **Discuss**.
`
    },
    {
        type: 'highlight_create',
        thread: 'root',
        messageId: 'msg-1',
        start: 10,
        end: 20,
        label: 'tree of messages'
    },
    {
        type: 'discuss_click',
        thread: 'root',
        messageId: 'msg-1',
        start: 10,
        end: 20
    },
    {
        type: 'user',
        thread: 'fork-1',
        text: 'What does a message node look like in this tree?'
    },
    {
        type: 'assistant',
        thread: 'same',
        text: `A message node in this tree looks essentially like this:
\`\`\`typescript
{
    id: string;
    next_message_id: string;
    child_highlight_ids: string[];
    content: string;   
}
\`\`\`

Nothing surprising here. It's a linear chat conversation, with the addition of tangential highlights.

You can imagine that we'd continue having a conversation in this thread, and that the LLM might respond with more things that you want to follow up on tangentially. This interface would let you fork ad hoc to start well isolated side conversations.

**next step:** go back to the parent conversational thread, and highlight "*chronological history of messages*", then click **Discuss**.
`
    },
    {
        type: 'highlight_create',
        thread: 'root',
        messageId: 'msg-1',
        start: 88,
        end: 120,
        label: 'chronological history of messages'
    },
    {
        type: 'discuss_click',
        thread: 'root',
        messageId: 'msg-1',
        start: 88,
        end: 120
    },
    {
        type: 'assistant',
        thread: 'fork-2',
        text: `Note that we just replaced the previous tangent conversation with this one. You can go back and click on the tangent conversation you just created a moment ago--it's all still there.\n\n(Come back here after)`
    },
    {
        type: 'user',
        thread: 'fork-2',
        text: 'Okay, so how do forked messages get sent to the LLM?'
    },
    {
        type: 'assistant',
        thread: 'same',
        text: `For now, it's just one big concatenated chronological history. It's a convenient, simple solution, but there are probably more efficient/effective ways to do it.`
    }
];

// Example (commented):
// export const demoScript = [
//   { type: 'assistant', thread: 'root', text: 'Welcome! Try asking a quick question,' },
//   { type: 'user', thread: 'root' },
//   { type: 'assistant', thread: 'same', text: 'Great question — here is a short answer.' },
//   { type: 'assistant', thread: 'root', text: 'Highlight a phrase in my last message and click Discuss.' },
//   { type: 'highlight_create', thread: 'root', messageId: 'msg-welcome', start: 10, end: 20, label: 'energy transfer' },
//   { type: 'highlight_click', messageId: 'msg-welcome', start: 10, end: 20 },
//   { type: 'user', thread: 'fork-1' },
//   { type: 'assistant', thread: 'same', text: 'Here is a scoped follow-up in the fork.' },
// ];
