import React, { useState, useEffect, useRef, useCallback } from 'react';
import Message from './Message';

export default function AnimatedChatThread({
  conversation,
  animationSequence,
  isPlaying,
  onAnimationComplete,
  playbackSpeed = 10,
  autoStart = true
}) {
  const [displayedMessages, setDisplayedMessages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [currentMessageId, setCurrentMessageId] = useState(null);
  const [visibleHighlights, setVisibleHighlights] = useState(new Set());

  const animationTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageRefs = useRef({});
  const messagesEndRef = useRef(null);

  // Reset animation to beginning
  const resetAnimation = useCallback(() => {
    setDisplayedMessages([]);
    setCurrentStep(0);
    setIsTyping(false);
    setTypingText('');
    setCurrentMessageId(null);
    setVisibleHighlights(new Set());

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  // Find message by ID across all threads
  const findMessage = useCallback((messageId) => {
    for (const thread of Object.values(conversation.threads)) {
      const message = thread.messages?.find(m => m.id === messageId);
      if (message) return message;
    }
    return null;
  }, [conversation]);

  // Find highlight by ID across all threads
  const findHighlight = useCallback((highlightId) => {
    for (const thread of Object.values(conversation.threads)) {
      const highlight = thread.highlights?.find(h => h.id === highlightId);
      if (highlight) return highlight;
    }
    return null;
  }, [conversation]);

  // Simulate typing effect for a message
  const typeMessage = useCallback((message, typingSpeed) => {
    const content = message.content;
    let charIndex = 0;
    setCurrentMessageId(message.id);
    setIsTyping(true);
    setTypingText('');

    const typeNextChar = () => {
      if (charIndex < content.length) {
        setTypingText(content.substring(0, charIndex + 1));
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeNextChar, 1);
      } else {
        // Typing complete
        setIsTyping(false);
        setTypingText('');
        setCurrentMessageId(null);

        // Add completed message to displayed messages
        setDisplayedMessages(prev => [...prev, message]);

        // Auto-scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        // Continue to next step
        setCurrentStep(prev => prev + 1);
      }
    };

    typeNextChar();
  }, [playbackSpeed]);

  // Execute animation step
  const executeStep = useCallback((step) => {
    if (!step) {
      // Animation complete
      onAnimationComplete?.();
      return;
    }

    if (step.action === 'highlight') {
      // Add highlight
      setVisibleHighlights(prev => new Set([...prev, step.highlightId]));

      // Continue to next step after highlight duration
      animationTimeoutRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1);
    } else if (step.messageId) {
      // Type message
      const message = findMessage(step.messageId);
      if (message) {
        animationTimeoutRef.current = setTimeout(() => {
          typeMessage(message, step.typingSpeed || 50);
        }, 1);
      } else {
        // Skip if message not found
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [findMessage, typeMessage, playbackSpeed, onAnimationComplete]);

  // Main animation effect
  useEffect(() => {
    if (!isPlaying || !animationSequence || currentStep >= animationSequence.length) {
      return;
    }

    const step = animationSequence[currentStep];
    executeStep(step);

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isPlaying, currentStep, animationSequence, executeStep]);

  // Auto-start effect
  useEffect(() => {
    if (autoStart && animationSequence && animationSequence.length > 0) {
      resetAnimation();
      setCurrentStep(0);
    }
  }, [autoStart, animationSequence, resetAnimation]);

  // Paint highlights
  useEffect(() => {
    visibleHighlights.forEach(highlightId => {
      const highlight = findHighlight(highlightId);
      if (highlight) {
        const messageEl = messageRefs.current[highlight.messageId];
        if (messageEl) {
          // Simple highlight effect - could be enhanced with the full highlight system
          const textNodes = [];

          const getTextNodes = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              textNodes.push(node);
            } else {
              for (let child of node.childNodes) {
                getTextNodes(child);
              }
            }
          };

          getTextNodes(messageEl);

          if (textNodes.length > 0) {
            // Simple highlight by finding text content
            const fullText = textNodes.map(n => n.textContent).join('');
            const startIndex = fullText.indexOf(highlight.text);

            if (startIndex !== -1) {
              // Find the text node containing our highlight text
              let charCount = 0;
              let targetNode = null;
              let nodeStartIndex = 0;

              for (const node of textNodes) {
                const nodeLength = node.textContent.length;
                if (charCount + nodeLength > startIndex) {
                  targetNode = node;
                  nodeStartIndex = startIndex - charCount;
                  break;
                }
                charCount += nodeLength;
              }

              if (targetNode) {
                // Create a range and highlight it
                const range = document.createRange();
                const endIndex = Math.min(nodeStartIndex + highlight.text.length, targetNode.textContent.length);
                range.setStart(targetNode, nodeStartIndex);
                range.setEnd(targetNode, endIndex);

                // Create highlight element
                const highlightEl = document.createElement('mark');
                highlightEl.style.backgroundColor = 'rgba(245, 207, 87, 0.5)';
                highlightEl.style.padding = '1px 2px';
                highlightEl.style.borderRadius = '2px';
                highlightEl.style.animation = 'highlight-flash 0.8s ease-out';
                highlightEl.dataset.highlightId = highlightId;

                try {
                  range.surroundContents(highlightEl);
                } catch (e) {
                  // Fallback: just mark the whole text
                  highlightEl.textContent = highlight.text;
                  targetNode.parentNode.insertBefore(highlightEl, targetNode);
                }
              }
            }
          }
        }
      }
    });
  }, [visibleHighlights, findHighlight]);

  return (
    <div className="animated-chat-thread">
      <div className="animated-messages">
        {displayedMessages.map(message => (
          <Message
            key={message.id}
            message={message}
            messageRefs={messageRefs}
          />
        ))}

        {isTyping && currentMessageId && (
          <div className="message">
            <div className="message-role">
              {findMessage(currentMessageId)?.role === 'user' ? 'You' : 'Claude'}
            </div>
            <div className="message-content typing">
              <div className="typing-text">
                {typingText}
                <span className="typing-cursor">|</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="animation-controls">
        <button
          onClick={resetAnimation}
          className="control-btn"
          title="Restart animation"
        >
          ↻ Restart
        </button>
        <div className="animation-progress">
          Step {currentStep + 1} of {animationSequence?.length || 0}
        </div>
      </div>
    </div>
  );
}
