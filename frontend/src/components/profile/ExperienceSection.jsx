import { CalendarDays } from 'lucide-react';
import Badge from '../common/Badge.jsx';
import { formatDateRange } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

function toItems(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

/**
 * Work experience entries. Internships are labelled explicitly.
 * When the profile lists no experience the section is replaced by a single
 * explanatory line rather than an empty shell.
 */
export default function ExperienceSection({ experience }) {
  const list = Array.isArray(experience)
    ? experience.filter((entry) => entry && (entry.role || entry.company))
    : [];

  if (list.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-surface-muted/40 px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
        {copy.profile.experienceEmpty}
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-ink">{copy.profile.experience}</h2>

      <ul className="space-y-3">
        {list.map((entry, index) => {
          const isInternship = /intern/i.test(String(entry.type || ''));
          const organisation = [entry.company, entry.location].filter(Boolean).join(' · ');
          const range = formatDateRange(entry.startDate, entry.endDate, copy.profile.present);
          const technologies = toItems(entry.technologies);

          return (
            <li key={`${entry.company || entry.role}-${index}`}>
              <article className="surface-card space-y-2 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {entry.role ? (
                      <h3 className="break-words text-sm font-semibold text-ink">{entry.role}</h3>
                    ) : null}
                    {organisation ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{organisation}</p>
                    ) : null}
                  </div>
                  {isInternship ? (
                    <Badge tone="accent" size="xs">
                      {copy.profile.internship}
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
                  {entry.type ? <span className="capitalize">{entry.type}</span> : null}
                </div>

                {entry.description ? (
                  <p className="text-xs leading-relaxed text-ink-muted">{entry.description}</p>
                ) : null}

                {technologies.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {technologies.map((technology) => (
                      <li key={technology}>
                        <Badge tone="accent" size="xs">
                          {technology}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
