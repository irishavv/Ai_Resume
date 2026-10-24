import {
  AlertTriangle,
  ClipboardList,
  FileDown,
  Info,
  ListChecks,
  MessageCircleQuestion,
  RotateCcw,
  ShieldAlert,
  Target,
  TrendingUp,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import ScoreGauge from './ScoreGauge.jsx';
import RubricBreakdown from './RubricBreakdown.jsx';
import { exportJobMatchPdf } from '../../lib/pdf.js';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { copy } from '../../constants/copy.js';

function toItems(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function ResultSection({ title, icon: Icon, children }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function BulletList({ items, tone = 'neutral' }) {
  const marker =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-ink-subtle';
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2 text-xs leading-relaxed text-ink-muted">
          <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${marker}`} />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function RequirementList({ items, emptyText }) {
  if (items.length === 0) {
    return <p className="text-xs italic text-ink-subtle">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => {
        const isMatched = Boolean(item.matched);
        return (
          <li
            key={`${item.requirement}-${index}`}
            className="rounded-lg border border-line bg-surface px-2.5 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-xs font-medium leading-relaxed text-ink">
                {item.requirement}
              </p>
              <Badge tone={isMatched ? 'success' : 'warning'} size="xs">
                {isMatched ? copy.jobMatch.matched : copy.jobMatch.notMatched}
              </Badge>
            </div>
            {item.evidence ? (
              <p className="mt-1 text-2xs leading-relaxed text-ink-muted">
                <span className="font-semibold text-ink-subtle">{copy.jobMatch.matchedEvidence}: </span>
                {item.evidence}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Full job match report: score, rubric, requirement evidence and caveats. */
export default function JobMatchResult({ result, onReset, candidateName }) {
  const { settings } = useSiteSettings();

  if (!result) return null;

  const requirements = Array.isArray(result.matchedRequirements)
    ? result.matchedRequirements.filter((item) => item && item.requirement)
    : [];
  const required = requirements.filter((item) => item.kind !== 'preferred');
  const preferred = requirements.filter((item) => item.kind === 'preferred');

  const missing = toItems(result.missingOrUnverified);
  const strengths = toItems(result.strengths);
  const areas = toItems(result.areasToEvaluate);
  const questions = toItems(result.suggestedInterviewQuestions);
  const limitations = toItems(result.limitations);
  const disclaimer = typeof result.disclaimer === 'string' ? result.disclaimer.trim() : '';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{copy.jobMatch.resultTitle}</h2>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {settings.features?.pdfExport !== false ? (
            <Button
              size="xs"
              variant="outline"
              leftIcon={FileDown}
              title={copy.jobMatch.exportPdf}
              onClick={() => exportJobMatchPdf({ candidateName, result })}
            >
              {copy.jobMatch.exportPdf}
            </Button>
          ) : null}
          {onReset ? (
            <Button size="xs" variant="outline" leftIcon={RotateCcw} onClick={onReset}>
              {copy.jobMatch.reset}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="surface-card p-4">
        <ScoreGauge score={result.suitabilityScore} label={result.scoreLabel} />
        {result.summary ? (
          <p className="mt-3.5 border-t border-line pt-3.5 text-xs leading-relaxed text-ink-muted">
            {result.summary}
          </p>
        ) : null}
      </div>

      <ResultSection title={copy.jobMatch.rubric} icon={ListChecks}>
        <RubricBreakdown rubric={result.rubric} />
      </ResultSection>

      <ResultSection title={copy.jobMatch.matchedRequired} icon={Target}>
        <RequirementList items={required} emptyText={copy.jobMatch.matchedNone} />
      </ResultSection>

      {preferred.length > 0 ? (
        <ResultSection title={copy.jobMatch.matchedPreferred} icon={Target}>
          <RequirementList items={preferred} emptyText={copy.jobMatch.matchedPreferredNone} />
        </ResultSection>
      ) : null}

      <ResultSection title={copy.jobMatch.missingTitle} icon={ShieldAlert}>
        {missing.length > 0 ? (
          <>
            <p className="text-2xs leading-relaxed text-ink-subtle">{copy.jobMatch.missingNote}</p>
            <BulletList items={missing} tone="warning" />
          </>
        ) : (
          <p className="text-xs italic text-ink-subtle">{copy.jobMatch.missingNote}</p>
        )}
      </ResultSection>

      {strengths.length > 0 ? (
        <ResultSection title={copy.jobMatch.strengthsTitle} icon={TrendingUp}>
          <BulletList items={strengths} tone="success" />
        </ResultSection>
      ) : null}

      {areas.length > 0 ? (
        <ResultSection title={copy.jobMatch.areasTitle} icon={ClipboardList}>
          <BulletList items={areas} />
        </ResultSection>
      ) : null}

      {questions.length > 0 ? (
        <ResultSection title={copy.jobMatch.questionsTitle} icon={MessageCircleQuestion}>
          <ol className="list-decimal space-y-1.5 pl-5">
            {questions.map((question, index) => (
              <li key={index} className="text-xs leading-relaxed text-ink-muted">
                {question}
              </li>
            ))}
          </ol>
        </ResultSection>
      ) : null}

      {limitations.length > 0 ? (
        <ResultSection title={copy.jobMatch.limitationsTitle} icon={Info}>
          <BulletList items={limitations} />
        </ResultSection>
      ) : null}

      {disclaimer ? (
        <section className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {copy.jobMatch.disclaimerTitle}
          </h3>
          <p className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2.5 text-2xs leading-relaxed text-warning">
            {disclaimer}
          </p>
        </section>
      ) : null}
    </div>
  );
}
