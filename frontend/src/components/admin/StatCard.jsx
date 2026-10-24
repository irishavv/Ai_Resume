import Skeleton from '../common/Skeleton.jsx';

/** A single dashboard counter. */
export default function StatCard({ icon: Icon, label, value, isLoading = false }) {
  return (
    <div className="surface-card px-3.5 py-3">
      <div className="flex items-center gap-2 text-ink-subtle">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
        <span className="truncate text-2xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1.5">
        {isLoading ? (
          <Skeleton className="h-6 w-12" />
        ) : (
          <span className="text-2xl font-semibold tabular-nums text-ink">{value}</span>
        )}
      </div>
    </div>
  );
}
