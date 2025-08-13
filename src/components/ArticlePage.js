import React, { useEffect, useState } from 'react';
import './ArticlePage.css';
import DemoChatApp from './DemoChatApp';
import Message from './Message';

function HighlightForkDemo() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 800),
      setTimeout(() => setStage(2), 1600),
      setTimeout(() => setStage(3), 2400),
      setTimeout(() => setStage(4), 2800)
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const cursorPos = [
    { left: 60, top: 140 },
    { left: 220, top: 132 },
    { left: 300, top: 90 }
  ];
  const cursorStyle = {
    left: (stage === 0 ? cursorPos[0].left : stage === 1 ? cursorPos[1].left : cursorPos[2].left) + 'px',
    top: (stage === 0 ? cursorPos[0].top : stage === 1 ? cursorPos[1].top : cursorPos[2].top) + 'px'
  };

  return (
    <div className="highlight-demo">
      <div className="chat-thread demo-thread">
        <div className="chat-header">Main Thread</div>
        <div className="chat-messages">
          <div className="message">
            <div className="message-role">Claude</div>
            <div className="message-content assistant">
              Only about <span className={`demo-highlight ${stage >= 1 ? 'active' : ''}`}>10%</span> of the energy makes it to the next level.
            </div>
          </div>
        </div>
      </div>

      <div className={`demo-popover ${stage >= 2 ? 'show' : ''}`} style={{ left: 260, top: 90 }}>
        Discuss
      </div>

      <div className="demo-cursor" style={cursorStyle} />

      <div className={`chat-thread demo-thread side-thread ${stage >= 4 ? 'open' : ''}`}>
        <div className="chat-header">Thread on "10% of the energy"</div>
        <div className="chat-messages">
          <Message message={{ id: 'u1', role: 'user', content: 'Why so little?' }} messageRefs={{ current: {} }} />
          <Message message={{ id: 'c1', role: 'assistant', content: 'Most is lost as heat.' }} messageRefs={{ current: {} }} />
        </div>
      </div>
    </div>
  );
}

function DeleteDemo() {
  const [open, setOpen] = useState(true);
  return (
    <div className="delete-demo">
      <div className="chat-thread demo-thread">
        <div className="chat-header">Main Thread</div>
        <div className="chat-messages">
          <div className="message">
            <div className="message-role">Claude</div>
            <div className="message-content assistant">Decomposers break things down.</div>
          </div>
        </div>
      </div>
      {open && (
        <div className="chat-thread demo-thread side-thread open">
          <div className="chat-header">
            <span>Thread on "Decomposers"</span>
            <button className="thread-close-btn" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="chat-messages">
            <Message message={{ id: 'u2', role: 'user', content: 'How do they do it?' }} messageRefs={{ current: {} }} />
            <Message message={{ id: 'c2', role: 'assistant', content: 'Enzymes.' }} messageRefs={{ current: {} }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArticlePage() {
  const [showDemo, setShowDemo] = useState(false);
  return (
    <>
      {!showDemo && (
        <div className="article-page" style={{ marginBottom: 0 }}>
          <h1><em>Am I crazy?</em> Wouldn't you find this useful, too?</h1>
          <p>
            The ChatGPT beta was almost three years ago. For about a year I kept thinking I was going to get
            <br /><br />
            Facebook had it with comments. Reddit has it with replies. Slack has it (somewhat) with replies. You can reply, re-reply, branch off as needed.
            But in ChatGPT or Claude? Nope.
            Which to me is like, just insane, given the efficacy of chatbots as tools for education, and the inherent nonlinearity of learning via conversation.
            <br /><br />
            If you’ve ever asked a complex STEM question in ChatGPT or Claude, you know the pattern:
            The model replies with some lengthy treatise. You spot half a dozen points worth digging into.
            You follow one, then another… and pretty soon you’re playing <b>scrollbar warrior</b>, sifting to thousands of lines of text and formatting, trying to remember what question you wanted to ask next.
            <br /><br />
            I think forked threads <b>could</b> fix this. They’d let you pursue multiple follow-up questions in parallel without losing context.
            <br /><br />
            Below is a quick (on-rails, not Ruby) demo to show what I mean. You can also visit the <a href="https://github.com/iiian/gpt-threads">GitHub repo</a> to clone the project and run it locally with your own Anthropic <code>API_KEY</code>. Right now, I've gone just as far as I need to with this project: one LLM integration (Anthropic), and something I can reasonably share on Hacker News. If you think this forked threads idea is useful, shout with me on Hacker News that you want this functionality so that big name LLM vendors get the message.
          </p>

          <h1>Try It Out</h1>
          <button className="new-conversation-btn" onClick={() => setShowDemo(true)}>
            show me the demo!
          </button>
        </div>
      )}

      {showDemo && (
        <div id="desktop-demo-section" style={{ height: '100vh', width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
          <DemoChatApp fullscreen />
        </div>
      )}
    </>
  );
}

