import { CalendarDays } from 'lucide-react';
import Badge from '../common/Badge.jsx';
import { formatDateRange } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

/** Education entries with institution, qualification, dates and grade. */
export default function EducationSection({ education }) {
  const list = Array.isArray(education)
    ? education.filter((entry) => entry && (entry.institution || entry.degree))
    : [];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-ink">{copy.profile.education}</h2>

      {list.length === 0 ? (
        <p className="text-xs italic text-ink-subtle">{copy.profile.educationEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((entry, index) => {
            const qualification = [entry.degree, entry.field].filter(Boolean).join(' · ');
            const range = formatDateRange(entry.startYear, entry.graduationYear, copy.profile.present);
            const hasVerifiedFlag = typeof entry.verified === 'boolean';

            return (
              <li key={`${entry.institution || entry.degree}-${index}`}>
                <article className="surface-card space-y-2 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {entry.institution ? (
                        <h3 className="break-words text-sm font-semibold text-ink">
                          {entry.institution}
                        </h3>
                      ) : null}
                      {qualification ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                          {qualification}
                        </p>
                      ) : null}
                    </div>
                    {hasVerifiedFlag ? (
                      <Badge tone={entry.verified ? 'success' : 'neutral'} size="xs">
                        {entry.verified ? copy.profile.verified : copy.profile.unverified}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-subtle">
                    {range ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {range}
                      </span>
                    ) : null}
                    {entry.grade ? (
                      <span>
                        <span className="font-medium text-ink-muted">{copy.profile.grade}: </span>
                        {entry.grade}
                      </span>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
