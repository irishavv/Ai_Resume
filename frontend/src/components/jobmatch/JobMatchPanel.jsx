import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Target, X } from 'lucide-react';
import JobMatchForm from './JobMatchForm.jsx';
import JobMatchResult from './JobMatchResult.jsx';
import EmptyState from '../common/EmptyState.jsx';
import ErrorState from '../common/ErrorState.jsx';
import IconButton from '../common/IconButton.jsx';
import Spinner from '../common/Spinner.jsx';
import { matchJob } from '../../services/jobMatchService.js';
import { copy } from '../../constants/copy.js';

/**
 * Job match panel: form, in-flight state, failure state and the report.
 * Rendered as a desktop side panel or embedded inside a modal on small screens.
 */
export default function JobMatchPanel({ onClose, embedded = false, candidateName, className = '' }) {
  const [lastSubmission, setLastSubmission] = useState(null);
  const [formToken, setFormToken] = useState(0);

  const mutation = useMutation({
    mutationFn: ({ jobDescription }) => matchJob({ jobDescription }),
  });

  const handleSubmit = useCallback(
    (values) => {
      setLastSubmission(values);
      mutation.mutate(values);
    },
    [mutation],
  );

  const handleReset = useCallback(() => {
    mutation.reset();
    setLastSubmission(null);
    setFormToken((token) => token + 1);
  }, [mutation]);

  const handleRetry = useCallback(() => {
    if (lastSubmission) mutation.mutate(lastSubmission);
  }, [lastSubmission, mutation]);

  const showResult = Boolean(mutation.data) && !mutation.isPending;

  const content = showResult ? (
    <JobMatchResult result={mutation.data} onReset={handleReset} candidateName={candidateName} />
  ) : (
    <div className="space-y-4">
      <JobMatchForm key={formToken} onSubmit={handleSubmit} isSubmitting={mutation.isPending} />

      {mutation.isPending ? (
        <div
          className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-muted/50 px-3 py-4"
          role="status"
          aria-live="polite"
        >
          <Spinner size="sm" className="text-primary" />
          <span className="text-xs text-ink-muted">{copy.jobMatch.analysing}</span>
        </div>
      ) : null}

      {!mutation.isPending && mutation.isError ? (
        <ErrorState
          title={copy.states.errorTitle}
          description={mutation.error?.message}
          onRetry={handleRetry}
        />
      ) : null}

      {!mutation.isPending && !mutation.isError ? (
        <EmptyState
          compact
          icon={Target}
          title={copy.jobMatch.emptyTitle}
          description={copy.jobMatch.emptyBody}
        />
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={['flex h-full min-h-0 flex-col', className].filter(Boolean).join(' ')}>
      <header className="flex shrink-0 items-start gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">{copy.jobMatch.title}</h2>
          <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">
            {copy.jobMatch.subtitle}
          </p>
        </div>
        {onClose ? <IconButton label={copy.jobMatch.closePanel} icon={X} onClick={onClose} /> : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{content}</div>
    </div>
  );
}
