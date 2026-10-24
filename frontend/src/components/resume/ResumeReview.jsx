import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, CheckCheck, Eraser, FileWarning, Sparkles } from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import ErrorState from '../common/ErrorState.jsx';
import ResumeDraftField from './ResumeDraftField.jsx';
import { copy } from '../../constants/copy.js';
import { buildDraftFields, compileDraftFields } from '../../lib/resume.js';

/**
 * Step 2: review the unverified extraction, correct it, choose which fields to
 * apply, then confirm. Nothing reaches the profile until "Apply to profile".
 */
export default function ResumeReview({
  result,
  canApply,
  isApplying,
  applyError,
  onApply,
  onDiscard,
}) {
  const [fields, setFields] = useState(() => buildDraftFields(result?.draft));

  const { values, invalidKeys } = useMemo(() => compileDraftFields(fields), [fields]);

  const invalidSet = useMemo(() => new Set(invalidKeys), [invalidKeys]);

  const updateText = useCallback((key, text) => {
    setFields((current) =>
      current.map((field) => (field.key === key ? { ...field, text } : field)),
    );
  }, []);

  const toggleInclude = useCallback((key) => {
    setFields((current) =>
      current.map((field) => (field.key === key ? { ...field, include: !field.include } : field)),
    );
  }, []);

  const setAll = useCallback((include) => {
    setFields((current) => current.map((field) => ({ ...field, include })));
  }, []);

  const warnings = Array.isArray(result?.warnings) ? result.warnings.filter(Boolean) : [];
  const sections = Array.isArray(result?.detectedSections)
    ? result.detectedSections.filter(Boolean)
    : [];
  const includedCount = Object.keys(values).length;
  const blocked = invalidKeys.length > 0 || includedCount === 0 || !canApply;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-warning">
          <FileWarning className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {copy.resume.unverifiedTitle}
        </p>
        {warnings.length > 0 ? (
          <ul className="mt-1.5 space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="flex gap-1.5 text-2xs leading-relaxed text-ink-muted">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" aria-hidden="true" />
                <span className="min-w-0">{warning}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="text-2xs text-ink-subtle">
        {result?.sourceFileName ? (
          <span className="text-ink-muted">
            {copy.resume.sourceFile}: {result.sourceFileName}
          </span>
        ) : null}
        {result?.sourceFileName ? ' · ' : null}
        {Number.isFinite(Number(result?.extractedCharacters))
          ? `${Number(result.extractedCharacters).toLocaleString()} ${copy.resume.analysed}`
          : null}
      </p>

      <section className="space-y-1.5">
        <h3 className="text-xs font-semibold text-ink">{copy.resume.detectedTitle}</h3>
        {sections.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {sections.map((section) => (
              <li key={section}>
                <Badge tone="neutral" size="xs">
                  {section}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-2xs italic text-ink-subtle">{copy.resume.detectedEmpty}</p>
        )}
      </section>

      <section className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold text-ink">{copy.resume.fieldsTitle}</h3>
          {fields.length > 0 ? (
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                leftIcon={CheckCheck}
                onClick={() => setAll(true)}
                disabled={isApplying}
              >
                {copy.resume.keepAll}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                leftIcon={Eraser}
                onClick={() => setAll(false)}
                disabled={isApplying}
              >
                {copy.resume.clearAll}
              </Button>
            </div>
          ) : null}
        </div>

        <p className="text-2xs leading-relaxed text-ink-muted">{copy.resume.reviewNotice}</p>

        {fields.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface-muted/40 px-3 py-4 text-2xs leading-relaxed text-ink-muted">
            {copy.resume.fieldsEmpty}
          </p>
        ) : (
          <div className="space-y-2.5">
            {fields.map((field) => (
              <ResumeDraftField
                key={field.key}
                field={{ ...field, error: invalidSet.has(field.key) ? copy.resume.jsonInvalid : null }}
                onChange={(text) => updateText(field.key, text)}
                onToggleInclude={() => toggleInclude(field.key)}
                disabled={isApplying}
              />
            ))}
          </div>
        )}
      </section>

      <p className="text-2xs leading-relaxed text-ink-subtle">{copy.resume.mergeNote}</p>

      {applyError ? (
        <ErrorState
          compact
          title={copy.states.errorTitle}
          description={applyError.message}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Button
          variant="primary"
          size="sm"
          leftIcon={Sparkles}
          onClick={() => onApply(values)}
          isLoading={isApplying}
          disabled={blocked || isApplying}
        >
          {isApplying ? copy.resume.applying : copy.resume.apply}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDiscard} disabled={isApplying}>
          {copy.resume.discard}
        </Button>
        <span className="ml-auto text-2xs text-ink-subtle">
          {includedCount} {copy.resume.appliedCount}
        </span>
      </div>
    </div>
  );
}
