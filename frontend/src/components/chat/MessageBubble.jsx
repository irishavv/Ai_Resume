import { memo } from 'react';
import { AlertTriangle, Bot, RotateCw, Volume2, VolumeX } from 'lucide-react';
import MarkdownContent from './MarkdownContent.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import CopyButton from './CopyButton.jsx';
import Button from '../common/Button.jsx';
import IconButton from '../common/IconButton.jsx';
import { relativeTime } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

/**
 * A single conversation message. User messages are right aligned; assistant
 * answers are left aligned with an avatar and rendered as markdown.
 * Memoised so streamed tokens only re-render the active bubble.
 */
const MessageBubble = memo(
  function MessageBubble({ message, canRetry, onRetry, canSpeak = false, speakingId, onSpeak }) {
    const isUser = message.role === 'user';

    if (isUser) {
      return (
        <article className="flex flex-col items-end gap-1">
          <p className="pr-1 text-2xs font-medium text-ink-subtle">{copy.chat.you}</p>
          <div className="max-w-[88%] rounded-2xl rounded-br-md border border-primary/25 bg-primary/10 px-3.5 py-2.5">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
              {message.content}
            </p>
          </div>
          {message.createdAt ? (
            <p className="pr-1 text-2xs text-ink-subtle">{relativeTime(message.createdAt)}</p>
          ) : null}
        </article>
      );
    }

    const isStreaming = message.status === 'streaming';
    const showTyping = isStreaming && !message.content;
    const messageKey = message.localId || message.id;
    const isSpeaking = Boolean(speakingId) && speakingId === messageKey;

    return (
      <article className="flex gap-2.5">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-muted"
          role="img"
          aria-label={copy.a11y.assistantAvatar}
        >
          <Bot className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-3.5 py-2.5 shadow-card">
            {showTyping ? (
              <TypingIndicator />
            ) : (
              <MarkdownContent content={message.content} streaming={isStreaming} />
            )}
          </div>

          {message.status === 'failed' ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-2xs leading-relaxed text-danger">
                {message.error?.message || copy.chat.failedLabel}
              </span>
              {canRetry ? (
                <Button size="xs" variant="outline" leftIcon={RotateCw} onClick={onRetry}>
                  {copy.chat.retry}
                </Button>
              ) : null}
            </div>
          ) : null}

          {message.status === 'stopped' ? (
            <p className="mt-1.5 text-2xs italic text-ink-subtle">{copy.chat.stopped}</p>
          ) : null}

          {!isStreaming ? (
            <div className="mt-1 flex items-center gap-2 pl-1">
              {message.content ? <CopyButton value={message.content} /> : null}
              {canSpeak && message.content ? (
                <IconButton
                  label={isSpeaking ? copy.speak.stop : copy.speak.play}
                  icon={isSpeaking ? VolumeX : Volume2}
                  size="xs"
                  variant={isSpeaking ? 'solid' : 'ghost'}
                  aria-pressed={isSpeaking}
                  onClick={() => onSpeak?.(message)}
                />
              ) : null}
              {message.createdAt ? (
                <span className="text-2xs text-ink-subtle">{relativeTime(message.createdAt)}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    );
  },
  (prev, next) =>
    prev.message === next.message &&
    prev.canRetry === next.canRetry &&
    prev.onRetry === next.onRetry &&
    prev.canSpeak === next.canSpeak &&
    prev.onSpeak === next.onSpeak &&
    (prev.speakingId === next.speakingId ||
      (prev.speakingId !== (prev.message.localId || prev.message.id) &&
        next.speakingId !== (next.message.localId || next.message.id))),
);

export default MessageBubble;
