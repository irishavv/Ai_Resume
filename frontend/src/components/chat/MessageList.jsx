import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import MessageBubble from './MessageBubble.jsx';
import IconButton from '../common/IconButton.jsx';
import useSpeechSynthesis from '../../hooks/useSpeechSynthesis.js';
import { copy } from '../../constants/copy.js';

const NEAR_BOTTOM_PX = 120;

/** Stable identity for a message, used to track which answer is being read aloud. */
function messageKeyOf(message) {
  return message.localId || message.id;
}

/**
 * Scrollable message log.
 * Auto-scrolls only while the reader is already near the bottom, so reading
 * history is never interrupted by incoming tokens.
 */
export default function MessageList({
  messages,
  canRetry,
  onRetry,
  emptyContent,
  conversationId,
  language,
}) {
  const scrollRef = useRef(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const {
    isSupported: isSpeechSupported,
    activeId: speakingId,
    speak,
  } = useSpeechSynthesis({ lang: language });

  const handleSpeak = useCallback(
    (message) => {
      speak(message.content, messageKeyOf(message));
    },
    [speak],
  );

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const contentSignal = lastMessage ? lastMessage.content.length : 0;

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    setIsNearBottom(distanceFromBottom <= NEAR_BOTTOM_PX);
  }, []);

  // Follow new content only when the reader has not scrolled up.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !isNearBottom) return;
    element.scrollTop = element.scrollHeight;
  }, [contentSignal, isNearBottom, messages.length]);

  // A different conversation always starts at the newest message.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    setIsNearBottom(true);
  }, [conversationId]);

  const scrollToBottom = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    setIsNearBottom(true);
  }, []);

  const showJumpButton = !isNearBottom && messages.length > 0;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        tabIndex={0}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={copy.a11y.messageLog}
        className="h-full overflow-y-auto overscroll-contain px-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-5"
      >
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-3xl items-center justify-center">
            {emptyContent}
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={messageKeyOf(message)}
                message={message}
                canRetry={
                  Boolean(canRetry) &&
                  index === messages.length - 1 &&
                  message.role === 'assistant' &&
                  message.status === 'failed'
                }
                onRetry={onRetry}
                canSpeak={isSpeechSupported}
                speakingId={speakingId}
                onSpeak={handleSpeak}
              />
            ))}
          </div>
        )}
      </div>

      {showJumpButton ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <IconButton
            label={copy.chat.scrollToBottom}
            icon={ArrowDown}
            size="md"
            variant="outline"
            onClick={scrollToBottom}
            className="pointer-events-auto bg-surface shadow-pop"
          />
        </div>
      ) : null}
    </div>
  );
}
