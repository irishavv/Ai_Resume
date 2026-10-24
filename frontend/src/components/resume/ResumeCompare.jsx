import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { GitCompareArrows, RotateCcw } from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import EmptyState from '../common/EmptyState.jsx';
import ErrorState from '../common/ErrorState.jsx';
import ResumeDropzone from './ResumeDropzone.jsx';
import { extractAdminResume } from '../../services/adminService.js';
import { validateResumeFile } from '../../lib/resume.js';
import { diffResumeDrafts } from '../../lib/resumeDiff.js';
import { copy } from '../../constants/copy.js';

const STATUS_TONE = {
  added: 'success',
  removed: 'danger',
  changed: 'warning',
  unchanged: 'neutral',
};

const STATUS_LABEL = {
  added: copy.resume.compare.statusAdded,
  removed: copy.resume.compare.statusRemoved,
  changed: copy.resume.compare.statusChanged,
  unchanged: copy.resume.compare.statusUnchanged,
};

function ChangeValue({ label, text, tone }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">{label}</p>
      <pre
        className={[
          'mt-1 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-surface-muted/50 px-2.5 py-2 font-sans text-2xs leading-relaxed',
          tone === 'removed' ? 'text-danger line-through decoration-danger/40' : 'text-ink-muted',
        ].join(' ')}
      >
        {text || '—'}
      </pre>
    </div>
  );
}

function ChangeRow({ change }) {
  const isUnchanged = change.status === 'unchanged';
  return (
    <li className="rounded-xl border border-line bg-surface p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs font-semibold text-ink">{change.label}</p>
        <Badge tone={STATUS_TONE[change.status]} size="xs">
          {STATUS_LABEL[change.status]}
        </Badge>
      </div>

      {isUnchanged ? (
        <p className="mt-1.5 truncate text-2xs text-ink-subtle" title={change.after}>
          {change.after}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          {change.status !== 'added' ? (
            <ChangeValue label={copy.resume.compare.before} text={change.before} tone="removed" />
          ) : null}
          {change.status !== 'removed' ? (
            <ChangeValue label={copy.resume.compare.after} text={change.after} tone="added" />
          ) : null}
        </div>
      )}
    </li>
  );
}

/**
 * Resume comparison: extracts two resume versions and lists the differences
 * between the resulting profile drafts. Runs inside the operator console, so the
 * uploads carry the administrator session.
 */
export default function ResumeCompare({ className = '' }) {
  const [olderFile, setOlderFile] = useState(null);
  const [newerFile, setNewerFile] = useState(null);
  const [olderError, setOlderError] = useState(null);
  const [newerError, setNewerError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({ older, newer }) => {
      const [olderResult, newerResult] = await Promise.all([
        extractAdminResume({ file: older }),
        extractAdminResume({ file: newer }),
      ]);
      return { olderDraft: olderResult?.draft, newerDraft: newerResult?.draft };
    },
  });

  const selectFile = useCallback(
    (setter, errorSetter) => (next) => {
      const message = validateResumeFile(next);
      errorSetter(message);
      setter(message ? null : next);
      setFormError(null);
      mutation.reset();
    },
    [mutation],
  );

  const handleOlderChange = useCallback(
    (next) => selectFile(setOlderFile, setOlderError)(next),
    [selectFile],
  );
  const handleNewerChange = useCallback(
    (next) => selectFile(setNewerFile, setNewerError)(next),
    [selectFile],
  );

  const handleRun = useCallback(() => {
    const olderMessage = validateResumeFile(olderFile);
    const newerMessage = validateResumeFile(newerFile);
    setOlderError(olderMessage);
    setNewerError(newerMessage);

    if (!olderFile || !newerFile || olderMessage || newerMessage) {
      setFormError(copy.resume.compare.needBoth);
      return;
    }

    setFormError(null);
    mutation.mutate(
      { older: olderFile, newer: newerFile },
      {
        onSuccess: ({ olderDraft, newerDraft }) =>
          setComparison(diffResumeDrafts(olderDraft, newerDraft)),
      },
    );
  }, [mutation, newerFile, olderFile]);

  const handleReset = useCallback(() => {
    setOlderFile(null);
    setNewerFile(null);
    setOlderError(null);
    setNewerError(null);
    setFormError(null);
    setComparison(null);
    setShowUnchanged(false);
    mutation.reset();
  }, [mutation]);

  if (comparison) {
    const { changes, summary } = comparison;
    const detected = changes.filter((change) => change.status !== 'unchanged');
    const unchanged = changes.filter((change) => change.status === 'unchanged');

    return (
      <div className={['space-y-4', className].filter(Boolean).join(' ')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">{copy.resume.compare.resultTitle}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone="success" size="xs">
                {summary.added} {copy.resume.compare.addedLabel}
              </Badge>
              <Badge tone="warning" size="xs">
                {summary.changed} {copy.resume.compare.changedLabel}
              </Badge>
              <Badge tone="danger" size="xs">
                {summary.removed} {copy.resume.compare.removedLabel}
              </Badge>
            </div>
          </div>
          <Button size="xs" variant="outline" leftIcon={RotateCcw} onClick={handleReset}>
            {copy.resume.compare.reset}
          </Button>
        </div>

        {detected.length > 0 ? (
          <ul className="space-y-2">
            {detected.map((change) => (
              <ChangeRow key={change.key} change={change} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-success/30 bg-success/5 px-3 py-2.5 text-xs leading-relaxed text-success">
            {copy.resume.compare.noChanges}
          </p>
        )}

        {unchanged.length > 0 ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowUnchanged((value) => !value)}
              aria-expanded={showUnchanged}
              className="text-2xs font-medium text-primary underline underline-offset-2"
            >
              {showUnchanged ? copy.resume.compare.hideUnchanged : copy.resume.compare.showUnchanged} (
              {unchanged.length})
            </button>
            {showUnchanged ? (
              <ul className="space-y-2">
                {unchanged.map((change) => (
                  <ChangeRow key={change.key} change={change} />
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const isRunning = mutation.isPending;

  return (
    <div className={['space-y-4', className].filter(Boolean).join(' ')}>
      <div>
        <h3 className="text-sm font-semibold text-ink">{copy.resume.compare.title}</h3>
        <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">{copy.resume.compare.body}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
            {copy.resume.compare.olderLabel}
          </p>
          <ResumeDropzone
            file={olderFile}
            onFileChange={handleOlderChange}
            error={olderError}
            disabled={isRunning}
          />
        </div>
        <div className="space-y-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
            {copy.resume.compare.newerLabel}
          </p>
          <ResumeDropzone
            file={newerFile}
            onFileChange={handleNewerChange}
            error={newerError}
            disabled={isRunning}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          leftIcon={GitCompareArrows}
          onClick={handleRun}
          isLoading={isRunning}
          disabled={!olderFile || !newerFile || isRunning}
        >
          {isRunning ? copy.resume.compare.running : copy.resume.compare.run}
        </Button>
      </div>

      {formError ? (
        <p role="alert" className="text-2xs text-danger">
          {formError}
        </p>
      ) : null}

      {mutation.isError ? (
        <ErrorState
          title={copy.resume.compare.failedTitle}
          description={mutation.error?.message}
          onRetry={handleRun}
        />
      ) : null}

      {!mutation.isError ? (
        <EmptyState
          compact
          icon={GitCompareArrows}
          title={copy.resume.compare.emptyTitle}
          description={copy.resume.compare.emptyBody}
        />
      ) : null}
    </div>
  );
}
