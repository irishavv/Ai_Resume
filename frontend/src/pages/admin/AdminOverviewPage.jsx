import { Link } from 'react-router-dom';
import {
  Activity,
  BadgeCheck,
  Briefcase,
  FolderKanban,
  GraduationCap,
  MessageSquareText,
  MessagesSquare,
  RefreshCw,
  ScrollText,
  Settings2,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import SectionCard from '../../components/admin/SectionCard.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import StatusBanner from '../../components/admin/StatusBanner.jsx';
import Button from '../../components/common/Button.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAdminDiagnostics, useAdminStats } from '../../hooks/useAdmin.js';
import { formatDate, relativeTime } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

const STAT_ITEMS = [
  { key: 'conversations', icon: MessagesSquare, label: copy.admin.overview.stats.conversations },
  { key: 'messages', icon: MessageSquareText, label: copy.admin.overview.stats.messages },
  { key: 'projects', icon: FolderKanban, label: copy.admin.overview.stats.projects },
  { key: 'skills', icon: Wrench, label: copy.admin.overview.stats.skills },
  { key: 'educationEntries', icon: GraduationCap, label: copy.admin.overview.stats.education },
  { key: 'experienceEntries', icon: Briefcase, label: copy.admin.overview.stats.experience },
  { key: 'certifications', icon: BadgeCheck, label: copy.admin.overview.stats.certifications },
  { key: 'auditEntries', icon: ScrollText, label: copy.admin.overview.stats.auditEntries },
];

const QUICK_ACTIONS = [
  { to: '/admin/profile', icon: UserRound, label: copy.admin.overview.quickProfile },
  { to: '/admin/settings', icon: Settings2, label: copy.admin.overview.quickSettings },
  { to: '/admin/conversations', icon: MessagesSquare, label: copy.admin.overview.quickConversations },
  { to: '/admin/ai', icon: Sparkles, label: copy.admin.overview.quickAi },
];

function FreshnessRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-xs font-medium text-ink" title={value ? formatDate(value) : undefined}>
        {value ? relativeTime(value) : copy.admin.overview.never}
      </span>
    </div>
  );
}

/** Console landing page: content counters, freshness, shortcuts and AI health. */
export default function AdminOverviewPage() {
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useAdminStats();

  const {
    data: diagnostics,
    isFetching: isChecking,
    refetch: runCheck,
  } = useAdminDiagnostics({ enabled: false });

  return (
    <div className="space-y-5">
      <PageHeader title={copy.admin.overview.title} description={copy.admin.overview.subtitle} />

      {isStatsError ? (
        <ErrorState
          compact
          title={copy.admin.states.errorTitle}
          description={copy.errors.server}
          onRetry={refetchStats}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {STAT_ITEMS.map(({ key, icon, label }) => (
            <li key={key}>
              <StatCard
                icon={icon}
                label={label}
                value={stats?.[key] ?? 0}
                isLoading={isStatsLoading}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={copy.admin.overview.freshnessTitle}>
          <div className="divide-y divide-line">
            <FreshnessRow
              label={copy.admin.overview.profileUpdated}
              value={stats?.profileUpdatedAt}
            />
            <FreshnessRow
              label={copy.admin.overview.settingsUpdated}
              value={stats?.settingsUpdatedAt}
            />
          </div>
        </SectionCard>

        <SectionCard title={copy.admin.overview.quickTitle}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {QUICK_ACTIONS.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-xs font-medium text-ink transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  <Icon className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title={copy.admin.overview.healthTitle}
        description={copy.admin.overview.healthDescription}
        actions={
          <Button
            size="sm"
            variant="outline"
            leftIcon={RefreshCw}
            isLoading={isChecking}
            onClick={() => runCheck()}
          >
            {isChecking ? copy.admin.overview.healthChecking : copy.admin.overview.healthCheck}
          </Button>
        }
      >
        {!diagnostics && !isChecking ? (
          <p className="text-xs text-ink-muted">{copy.admin.overview.noDiagnostics}</p>
        ) : null}

        {diagnostics ? (
          <div className="space-y-3">
            <StatusBanner
              tone={diagnostics.reachable ? 'success' : 'danger'}
              title={
                diagnostics.reachable
                  ? copy.admin.overview.reachable
                  : copy.admin.overview.unreachable
              }
              description={diagnostics.message || undefined}
            />

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {[
                { label: copy.admin.overview.statusLabel, value: diagnostics.status },
                { label: copy.admin.overview.provider, value: diagnostics.provider },
                { label: copy.admin.overview.model, value: diagnostics.model },
                {
                  label: copy.admin.overview.latency,
                  value: diagnostics.latencyMs == null ? '—' : `${diagnostics.latencyMs} ms`,
                },
              ].map((item) => (
                <div key={item.label} className="min-w-0">
                  <dt className="text-2xs uppercase tracking-wide text-ink-subtle">
                    {item.label}
                  </dt>
                  <dd className="truncate text-xs font-medium text-ink" title={item.value || '—'}>
                    {item.value || '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {isChecking && !diagnostics ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : null}
      </SectionCard>

      <div className="flex items-center gap-1.5 text-2xs text-ink-subtle">
        <Activity className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{copy.admin.overview.healthFooter}</span>
      </div>
    </div>
  );
}
