import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

export default function Message({ message, messageRefs }) {
  return (
    <div key={message.id} className="message">
      <div className="message-role">
        {message.role === 'user' ? 'You' : (message.provider === 'openai' ? 'GPT-5' : 'Claude')}
      </div>
      <div
        className={`message-content ${message.role}`}
        ref={el => { if (el) messageRefs.current[message.id] = el; }}
        data-message-id={message.id}
      >
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
