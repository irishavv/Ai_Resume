import { useCallback, useMemo, useState } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import SectionCard from '../../components/admin/SectionCard.jsx';
import Pagination from '../../components/admin/Pagination.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAuditLog } from '../../hooks/useAdmin.js';
import { formatDate, relativeTime } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

const PAGE_SIZE = 20;

function AuditRow({ entry }) {
  const { columns } = copy.admin.audit;

  return (
    <li className="border-b border-line px-3 py-2.5 last:border-b-0 hover:bg-surface-muted/50">
      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate text-xs font-medium text-ink">{entry.action}</span>
        {entry.target ? (
          <Badge tone="neutral" size="xs">
            {entry.target}
          </Badge>
        ) : null}
        <span
          className="ml-auto shrink-0 text-2xs text-ink-subtle"
          title={entry.createdAt ? formatDate(entry.createdAt) : undefined}
        >
          {relativeTime(entry.createdAt)}
        </span>
      </div>

      {entry.summary ? (
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{entry.summary}</p>
      ) : null}

      {entry.actor ? (
        <p className="mt-0.5 text-2xs text-ink-subtle">
          {columns.actor}: <span className="font-medium text-ink-muted">{entry.actor}</span>
        </p>
      ) : null}
    </li>
  );
}

/** The administrative trail: who changed what, newest first. */
export default function AdminAuditPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching, isError, refetch } = useAuditLog(page, PAGE_SIZE);

  const items = useMemo(() => data?.items ?? [], [data]);

  const handlePageChange = useCallback((nextPage) => setPage(nextPage), []);

  return (
    <div className="space-y-5">
      <PageHeader
        title={copy.admin.audit.title}
        description={copy.admin.audit.subtitle}
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
        {isError ? (
          <ErrorState
            compact
            title={copy.admin.states.errorTitle}
            description={copy.errors.server}
            onRetry={refetch}
          />
        ) : isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={ScrollText} title={copy.admin.audit.empty} />
        ) : (
          <ul className="-mx-4 border-t border-line">
            {items.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </SectionCard>

      <Pagination
        page={data?.page ?? page}
        totalPages={data?.totalPages ?? 0}
        totalItems={data?.totalItems ?? 0}
        unitLabel={copy.admin.audit.columns.action.toLowerCase()}
        onChange={handlePageChange}
        isDisabled={isFetching}
      />
    </div>
  );
}
