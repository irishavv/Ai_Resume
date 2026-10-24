import { useCallback, useMemo, useState } from 'react';
import { MessagesSquare, RefreshCw, Trash2 } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import SectionCard from '../../components/admin/SectionCard.jsx';
import Pagination from '../../components/admin/Pagination.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import Button from '../../components/common/Button.jsx';
import IconButton from '../../components/common/IconButton.jsx';
import Modal from '../../components/common/Modal.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import MarkdownContent from '../../components/chat/MarkdownContent.jsx';
import {
  useAdminConversation,
  useAdminConversations,
  useDeleteConversation,
} from '../../hooks/useAdmin.js';
import { relativeTime } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

const PAGE_SIZE = 20;

function ConversationRow({ conversation, onOpen, onRequestDelete }) {
  const title = conversation.title?.trim() || copy.chat.title;

  return (
    <li className="flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-muted/50">
      <button
        type="button"
        onClick={() => onOpen(conversation.id)}
        className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        <span className="block truncate text-xs font-medium text-ink">{title}</span>
        <span className="mt-0.5 block truncate font-mono text-2xs text-ink-subtle">
          {conversation.clientId}
        </span>
      </button>

      <span className="hidden shrink-0 text-2xs tabular-nums text-ink-muted sm:block sm:w-20 sm:text-right">
        {conversation.messageCount}
      </span>
      <span className="hidden shrink-0 text-2xs text-ink-subtle md:block md:w-24 md:text-right">
        {relativeTime(conversation.updatedAt || conversation.createdAt)}
      </span>

      <IconButton
        label={`${copy.admin.conversations.remove}: ${title}`}
        icon={Trash2}
        variant="danger"
        size="sm"
        onClick={() => onRequestDelete(conversation)}
      />
    </li>
  );
}

/** Every recruiter conversation, with a read-only transcript and delete. */
export default function AdminConversationsPage() {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const { data, isLoading, isFetching, isError, refetch } = useAdminConversations(page, PAGE_SIZE);
  const detail = useAdminConversation(detailId);
  const { mutateAsync: deleteConversation, isPending: isDeleting } = useDeleteConversation();

  const items = useMemo(() => data?.items ?? [], [data]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((conversation) =>
      `${conversation.title ?? ''} ${conversation.clientId ?? ''}`.toLowerCase().includes(needle),
    );
  }, [items, query]);

  const handleRequestDelete = useCallback((conversation) => {
    setDeleteError(null);
    setPendingDelete(conversation);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleteError(null);
    try {
      await deleteConversation(pendingDelete.id);
      if (detailId === pendingDelete.id) setDetailId(null);
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(error?.message || copy.errors.generic);
    }
  }, [deleteConversation, detailId, pendingDelete]);

  const handlePageChange = useCallback((nextPage) => {
    setPage(nextPage);
    setQuery('');
  }, []);

  const messages = detail.data?.messages ?? [];
  const detailConversation = detail.data?.conversation ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={copy.admin.conversations.title}
        description={copy.admin.conversations.subtitle}
        actions={
          <Button
            size="sm"
            variant="outline"
            leftIcon={RefreshCw}
            isLoading={isFetching}
            onClick={() => refetch()}
          >
            {copy.states.retry}
          </Button>
        }
      />

      <SectionCard>
        <div className="mb-3">
          <label htmlFor="conversation-filter" className="sr-only">
            {copy.admin.conversations.searchPlaceholder}
          </label>
          <input
            id="conversation-filter"
            type="search"
            value={query}
            placeholder={copy.admin.conversations.searchPlaceholder}
            onChange={(event) => setQuery(event.target.value)}
            className="field-base"
          />
        </div>

        {isError ? (
          <ErrorState
            compact
            title={copy.states.conversationsErrorTitle}
            description={copy.states.conversationsErrorBody}
            onRetry={refetch}
          />
        ) : isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title={copy.admin.conversations.empty}
            description={copy.admin.conversations.emptyBody}
          />
        ) : filtered.length === 0 ? (
          <EmptyState compact title={copy.admin.conversations.noMatches} />
        ) : (
          <ul className="-mx-3 border-t border-line">
            {filtered.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                onOpen={setDetailId}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </ul>
        )}
      </SectionCard>

      <Pagination
        page={data?.page ?? page}
        totalPages={data?.totalPages ?? 0}
        totalItems={data?.totalItems ?? 0}
        unitLabel={copy.admin.conversations.total}
        onChange={handlePageChange}
        isDisabled={isFetching}
      />

      <Modal
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={copy.admin.conversations.detailTitle}
        description={detailConversation?.title?.trim() || undefined}
        size="lg"
      >
        {detail.isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner size="md" />
          </div>
        ) : detail.isError ? (
          <ErrorState
            compact
            title={copy.admin.conversations.unreadable}
            onRetry={() => detail.refetch()}
          />
        ) : messages.length === 0 ? (
          <EmptyState compact title={copy.admin.conversations.detailEmpty} />
        ) : (
          <ul className="space-y-3.5">
            {messages.map((message) => (
              <li key={message.id} className="border-b border-line pb-3.5 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'text-2xs font-semibold uppercase tracking-wide',
                      message.role === 'user' ? 'text-primary' : 'text-ink-subtle',
                    ].join(' ')}
                  >
                    {message.role === 'user'
                      ? copy.admin.conversations.you
                      : copy.admin.conversations.assistant}
                  </span>
                  <span className="text-2xs text-ink-subtle">{relativeTime(message.createdAt)}</span>
                </div>

                {message.role === 'user' ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink">
                    {message.content}
                  </p>
                ) : (
                  <div className="mt-1">
                    <MarkdownContent content={message.content} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (isDeleting) return;
          setPendingDelete(null);
          setDeleteError(null);
        }}
        onConfirm={confirmDelete}
        isConfirming={isDeleting}
        title={copy.admin.conversations.removeConfirmTitle}
        body={copy.admin.conversations.removeConfirmBody}
        confirmLabel={copy.admin.conversations.removeConfirm}
      />

      {deleteError ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {deleteError}
        </p>
      ) : null}
    </div>
  );
}
