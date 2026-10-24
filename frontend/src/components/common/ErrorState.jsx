import { AlertTriangle, RotateCw } from 'lucide-react';
import Button from './Button.jsx';
import { copy } from '../../constants/copy.js';

/** Inline error surface with an optional retry action. */
export default function ErrorState({
  title = copy.states.errorTitle,
  description,
  onRetry,
  retryLabel = copy.states.retry,
  isRetrying = false,
  compact = false,
  className = '',
}) {
  return (
    <div
      role="alert"
      className={[
        'flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 text-center',
        compact ? 'px-3 py-4' : 'px-4 py-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description ? (
          <p className="text-xs leading-relaxed text-ink-muted">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" leftIcon={RotateCw} onClick={onRetry} isLoading={isRetrying}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
