import { useCallback, useState } from 'react';
import { CheckCircle2, FileText, Upload } from 'lucide-react';
import Button from '../common/Button.jsx';
import EmptyState from '../common/EmptyState.jsx';
import ErrorState from '../common/ErrorState.jsx';
import ResumeDropzone from './ResumeDropzone.jsx';
import ResumeReview from './ResumeReview.jsx';
import ResumeCompare from './ResumeCompare.jsx';
import { useExtractResume, useSaveProfile } from '../../hooks/useAdmin.js';
import { mergeDraftIntoProfile, validateResumeFile } from '../../lib/resume.js';
import { copy } from '../../constants/copy.js';

const MODES = [
  { id: 'import', label: copy.resume.modeImport },
  { id: 'compare', label: copy.resume.modeCompare },
];

/**
 * Resume import flow: upload, review, apply.
 *
 * <p>The whole flow runs inside the operator console, so every backend call
 * carries the administrator session. The extracted draft is only a proposal -
 * the profile is replaced solely after an explicit confirmation on the review
 * step.</p>
 */
export default function ResumePanel({ profile, onViewProfile, className = '' }) {
  const [mode, setMode] = useState('import');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [result, setResult] = useState(null);
  const [appliedCount, setAppliedCount] = useState(null);

  const extractMutation = useExtractResume();
  const applyMutation = useSaveProfile();

  const handleSelectFile = useCallback(
    (next) => {
      const message = validateResumeFile(next);
      setFileError(message);
      setFile(message ? null : next);
      extractMutation.reset();
    },
    [extractMutation],
  );

  const handleExtract = useCallback(() => {
    const message = validateResumeFile(file);
    if (message) {
      setFileError(message);
      return;
    }

    setFileError(null);
    extractMutation.mutate({ file }, { onSuccess: (data) => setResult(data) });
  }, [extractMutation, file]);

  const handleDiscard = useCallback(() => {
    setResult(null);
    setAppliedCount(null);
    setFile(null);
    setFileError(null);
    extractMutation.reset();
    applyMutation.reset();
  }, [applyMutation, extractMutation]);

  const handleApply = useCallback(
    (values) => {
      const { profile: merged } = mergeDraftIntoProfile(profile, values);
      applyMutation.mutate(merged, {
        onSuccess: () => setAppliedCount(Object.keys(values).length),
      });
    },
    [applyMutation, profile],
  );

  if (appliedCount !== null) {
    return (
      <div className={['space-y-4', className].filter(Boolean).join(' ')}>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-ink">{copy.resume.appliedTitle}</p>
          <p className="max-w-sm text-xs leading-relaxed text-ink-muted">
            {copy.resume.appliedBody}
          </p>
          <p className="text-2xs text-ink-subtle">
            {appliedCount} {copy.resume.appliedCount}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onViewProfile ? (
            <Button variant="primary" size="sm" onClick={onViewProfile}>
              {copy.resume.viewProfile}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" leftIcon={Upload} onClick={handleDiscard}>
            {copy.resume.importAnother}
          </Button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className={className}>
        <ResumeReview
          result={result}
          canApply={Boolean(profile)}
          isApplying={applyMutation.isPending}
          applyError={applyMutation.isError ? applyMutation.error : null}
          onApply={handleApply}
          onDiscard={handleDiscard}
        />
      </div>
    );
  }

  const isExtracting = extractMutation.isPending;

  return (
    <div className={['space-y-4', className].filter(Boolean).join(' ')}>
      <div
        role="tablist"
        aria-label={copy.resume.title}
        className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface-muted/70 p-0.5"
      >
        {MODES.map(({ id, label }) => {
          const isActive = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setMode(id)}
              className={[
                'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                isActive ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>

      {mode === 'compare' ? (
        <ResumeCompare />
      ) : (
        <>
          <section className="space-y-2">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
                {copy.resume.uploadStep}
              </p>
              <h3 className="mt-0.5 text-sm font-semibold text-ink">{copy.resume.uploadTitle}</h3>
              <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">{copy.resume.uploadBody}</p>
            </div>

            <ResumeDropzone
              file={file}
              onFileChange={handleSelectFile}
              error={fileError}
              disabled={isExtracting}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={Upload}
                onClick={handleExtract}
                isLoading={isExtracting}
                disabled={!file || isExtracting}
              >
                {isExtracting ? copy.resume.extracting : copy.resume.extract}
              </Button>
            </div>

            {extractMutation.isError ? (
              <ErrorState
                title={copy.resume.failedTitle}
                description={extractMutation.error?.message}
                onRetry={file ? handleExtract : undefined}
              />
            ) : null}
          </section>

          {!file && !extractMutation.isError ? (
            <EmptyState
              compact
              icon={FileText}
              title={copy.resume.emptyTitle}
              description={copy.resume.emptyBody}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
