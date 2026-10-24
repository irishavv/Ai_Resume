import { memo, useCallback, useMemo, useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import Button from '../common/Button.jsx';
import IconButton from '../common/IconButton.jsx';
import Skeleton from '../common/Skeleton.jsx';
import EmptyState from '../common/EmptyState.jsx';
import ErrorState from '../common/ErrorState.jsx';
import Modal from '../common/Modal.jsx';
import CandidateCard from '../profile/CandidateCard.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { relativeTime } from '../../lib/format.js';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { copy } from '../../constants/copy.js';

const ConversationRow = memo(function ConversationRow({
  conversation,
  isActive,
  onSelect,
  onRequestDelete,
}) {
  const title = conversation.title?.trim() || copy.chat.title;
  const timestamp = relativeTime(conversation.updatedAt || conversation.createdAt);

  return (
    <li>
      <div
        className={[
          'group flex items-center gap-0.5 rounded-lg transition-colors',
          isActive ? 'bg-primary/10' : 'hover:bg-surface-muted',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => onSelect(conversation.id)}
          aria-current={isActive ? 'true' : undefined}
          className="min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <span
            className={[
              'block truncate text-xs font-medium',
              isActive ? 'text-primary' : 'text-ink',
            ].join(' ')}
          >
            {title}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-ink-subtle">
            <span>{timestamp}</span>
            {typeof conversation.messageCount === 'number' && conversation.messageCount > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {conversation.messageCount} {conversation.messageCount === 1 ? 'message' : 'messages'}
                </span>
              </>
            ) : null}
          </span>
        </button>

        <IconButton
          label={`${copy.sidebar.deleteConversation}: ${title}`}
          icon={Trash2}
          variant="danger"
          size="xs"
          onClick={() => onRequestDelete(conversation)}
          className="mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-70"
        />
      </div>
    </li>
  );
});

/** Left navigation: candidate card, new chat, conversation history and theme toggle. */
export default function Sidebar({
  profile,
  isProfileLoading,
  isProfileError,
  onRetryProfile,
  conversations,
  isConversationsLoading,
  isConversationsError,
  onRetryConversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const { settings } = useSiteSettings();
  const features = settings.features ?? {};
  const showChat = features.chat !== false;
  const showThemeToggle = features.themeToggle !== false;

  const handleSelect = useCallback(
    (conversationId) => onSelectConversation(conversationId),
    [onSelectConversation],
  );
  const handleRequestDelete = useCallback((conversation) => {
    setDeleteError(null);
    setPendingDelete(conversation);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeleting) return;
    setPendingDelete(null);
    setDeleteError(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteConversation(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(error?.message || copy.errors.generic);
    } finally {
      setIsDeleting(false);
    }
  }, [onDeleteConversation, pendingDelete]);

  const listBody = useMemo(() => {
    if (isConversationsLoading) {
      return (
        <div className="space-y-2 px-1 py-1" aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="space-y-1.5 px-1.5 py-1">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      );
    }

    if (isConversationsError) {
      return (
        <ErrorState
          compact
          className="mx-1 my-2"
          title={copy.states.conversationsErrorTitle}
          description={copy.states.conversationsErrorBody}
          onRetry={onRetryConversations}
        />
      );
    }

    if (conversations.length === 0) {
      return (
        <EmptyState
          compact
          icon={MessageSquare}
          title={copy.sidebar.history}
          description={copy.sidebar.historyEmpty}
        />
      );
    }

    return (
      <ul className="space-y-0.5 px-1">
        {conversations.map((conversation) => (
          <ConversationRow
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeConversationId}
            onSelect={handleSelect}
            onRequestDelete={handleRequestDelete}
          />
        ))}
      </ul>
    );
  }, [
    activeConversationId,
    conversations,
    handleRequestDelete,
    handleSelect,
    isConversationsError,
    isConversationsLoading,
    onRetryConversations,
  ]);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 space-y-3 border-b border-line p-3">
          <CandidateCard
            profile={profile}
            isLoading={isProfileLoading}
            isError={isProfileError}
            onRetry={onRetryProfile}
          />
          {showChat ? (
            <Button fullWidth leftIcon={Plus} onClick={onNewChat} size="md">
              {copy.sidebar.newChat}
            </Button>
          ) : null}
        </div>

        {showChat ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <h2 className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
                {copy.sidebar.history}
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">{listBody}</div>
          </div>
        ) : (
          <div className="min-h-0 flex-1" />
        )}

        {showThemeToggle ? (
          <div className="shrink-0 border-t border-line px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-ink-muted">{copy.sidebar.theme}</span>
              <ThemeToggle size="sm" variant="outline" />
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={closeDeleteModal}
        title={copy.sidebar.deleteConversationConfirmTitle}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeDeleteModal} disabled={isDeleting}>
              {copy.sidebar.cancel}
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
              {copy.sidebar.deleteConfirm}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {copy.sidebar.deleteConversationConfirmBody}
        </p>
        {pendingDelete ? (
          <p className="mt-2 truncate text-xs font-medium text-ink">
            {pendingDelete.title?.trim() || copy.chat.title}
          </p>
        ) : null}
        {deleteError ? (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-2 text-xs text-danger" role="alert">
            {deleteError}
          </p>
        ) : null}
      </Modal>
    </>
  );
}
