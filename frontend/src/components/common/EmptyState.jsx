import { Inbox } from 'lucide-react';
import { copy } from '../../constants/copy.js';

/** Generic "nothing here yet" placeholder for empty sections and lists. */
export default function EmptyState({
  icon: Icon = Inbox,
  title = copy.states.emptyTitle,
  description = copy.states.emptyBody,
  action,
  compact = false,
  className = '',
}) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 py-5' : 'gap-3 py-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-subtle">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description ? (
          <p className="text-xs leading-relaxed text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
