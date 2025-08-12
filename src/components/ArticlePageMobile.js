import React, { useEffect, useState } from 'react';
import './ArticlePage.css';
import DemoChatApp from './DemoChatApp';

export default function ArticlePageMobile() {
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    if (!showDemo) return;
    const el = document.getElementById('mobile-demo-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showDemo]);

  return (
    <div className="article-page" style={{ width: '100%', maxWidth: '100%', margin: 0 }}>
      <h1><em>Am I crazy?</em> Wouldn't you find this useful, too?</h1>
      <p>
        At the time of writing, it has been almost three years since the ChatGPT beta.
        From day one, there’s been one feature at the top of my LLM wishlist: infinitely forkable conversational threads.
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

      <button
        className="new-conversation-btn"
        style={{ width: '100%', marginTop: 16 }}
        onClick={() => setShowDemo(true)}
      >
        show me the demo!
      </button>

      {showDemo && (
        <div
          id="mobile-demo-section"
          style={{ height: '100vh', width: '100vw', marginLeft: 'calc(50% - 50vw)', marginTop: 16 }}
        >
          <DemoChatApp fullscreen />
        </div>
      )}
    </div>
  );
}
