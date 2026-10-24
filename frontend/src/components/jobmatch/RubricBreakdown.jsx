import { clamp } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

function formatScore(value) {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return Number.isInteger(numeric) ? String(numeric) : String(Math.round(numeric * 100) / 100);
}

function progressFor(row) {
  const weight = Number(row?.weight);
  const awarded = Number(row?.awardedScore);
  if (!Number.isFinite(weight) || !Number.isFinite(awarded) || weight <= 0) return null;
  return clamp(Math.round((awarded / weight) * 100), 0, 100);
}

const CELL = 'px-3 py-2.5 align-top';

/** Weighted rubric returned with the job match result. */
export default function RubricBreakdown({ rubric }) {
  const rows = Array.isArray(rubric) ? rubric.filter((row) => row && row.criterion) : [];

  if (rows.length === 0) {
    return <p className="text-xs italic text-ink-subtle">{copy.jobMatch.rubricEmpty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
        <caption className="sr-only">{copy.jobMatch.rubric}</caption>
        <thead className="bg-surface-muted text-2xs uppercase tracking-wide text-ink-subtle">
          <tr>
            <th scope="col" className={`${CELL} font-semibold`}>
              {copy.jobMatch.rubricCriterion}
            </th>
            <th scope="col" className={`${CELL} font-semibold`}>
              {copy.jobMatch.rubricWeight}
            </th>
            <th scope="col" className={`${CELL} font-semibold`}>
              {copy.jobMatch.rubricAwarded}
            </th>
            <th scope="col" className={`${CELL} font-semibold`}>
              {copy.jobMatch.rubricRationale}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const progress = progressFor(row);
            return (
              <tr key={`${row.criterion}-${index}`} className="border-t border-line">
                <td className={`${CELL} font-medium text-ink`}>{row.criterion}</td>
                <td className={`${CELL} tabular-nums text-ink-muted`}>{formatScore(row.weight)}</td>
                <td className={CELL}>
                  <span className="tabular-nums font-medium text-ink">
                    {formatScore(row.awardedScore)}
                  </span>
                  {progress !== null ? (
                    <span className="mt-1.5 block h-1 w-16 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${progress}%` }}
                      />
                    </span>
                  ) : null}
                </td>
                <td className={`${CELL} leading-relaxed text-ink-muted`}>
                  {row.rationale || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
