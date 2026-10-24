import { memo } from 'react';
import MessageList from './MessageList.jsx';
import ChatComposer from './ChatComposer.jsx';
import WelcomeScreen from '../sections/WelcomeScreen.jsx';
import ErrorState from '../common/ErrorState.jsx';
import Skeleton from '../common/Skeleton.jsx';
import { copy } from '../../constants/copy.js';

const ConversationSkeleton = memo(function ConversationSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4" aria-busy="true">
      <div className="flex justify-end">
        <Skeleton className="h-16 w-2/3" rounded="rounded-2xl" />
      </div>
      <div className="flex items-start gap-2.5">
        <Skeleton className="h-7 w-7 shrink-0" rounded="rounded-full" />
        <Skeleton className="h-40 flex-1" rounded="rounded-2xl" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-12 w-1/2" rounded="rounded-2xl" />
      </div>
    </div>
  );
});

/** Chat surface: message log (or welcome state) plus the composer. */
export default function ChatPanel({
  conversationId,
  messages,
  isStreaming,
  isStarting,
  error,
  onDismissError,
  onSend,
  onStop,
  onRetry,
  canRetry,
  profile,
  isProfileLoading,
  isLoadingConversation,
  isConversationError,
  onRetryConversation,
  language,
  onLanguageChange,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isConversationError ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-6">
          <ErrorState
            title={copy.states.conversationErrorTitle}
            description={copy.states.conversationErrorBody}
            onRetry={onRetryConversation}
          />
        </div>
      ) : isLoadingConversation ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          <ConversationSkeleton />
        </div>
      ) : (
        <MessageList
          messages={messages}
          canRetry={canRetry}
          onRetry={onRetry}
          conversationId={conversationId}
          language={language}
          emptyContent={
            <WelcomeScreen
              profile={profile}
              isLoading={isProfileLoading}
              onAsk={onSend}
              disabled={isStreaming || isStarting}
            />
          }
        />
      )}

      <ChatComposer
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        isStarting={isStarting}
        error={error}
        onDismissError={onDismissError}
        language={language}
        onLanguageChange={onLanguageChange}
      />
    </div>
  );
}
