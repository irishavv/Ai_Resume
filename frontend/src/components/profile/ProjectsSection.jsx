import { ExternalLink, Github } from 'lucide-react';
import Badge from '../common/Badge.jsx';
import { externalLinkProps } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

function toItems(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function linkClasses() {
  return 'inline-flex items-center gap-1.5 rounded-md text-2xs font-medium text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';
}

/** Project cards with technology chips, highlights and repository / live links. */
export default function ProjectsSection({ projects }) {
  const list = Array.isArray(projects) ? projects.filter((project) => project && project.name) : [];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-ink">{copy.profile.projects}</h2>

      {list.length === 0 ? (
        <p className="text-xs italic text-ink-subtle">{copy.profile.projectsEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((project, index) => {
            const technologies = toItems(project.technologies);
            const highlights = toItems(project.highlights);
            const hasVerifiedFlag = typeof project.verified === 'boolean';

            return (
              <li key={`${project.name}-${index}`}>
                <article className="surface-card space-y-2.5 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words text-sm font-semibold text-ink">
                      {project.name}
                    </h3>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                      {project.status ? (
                        <Badge tone="neutral" size="xs">
                          {project.status}
                        </Badge>
                      ) : null}
                      {hasVerifiedFlag ? (
                        <Badge tone={project.verified ? 'success' : 'neutral'} size="xs">
                          {project.verified ? copy.profile.verified : copy.profile.unverified}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {project.description ? (
                    <p className="text-xs leading-relaxed text-ink-muted">{project.description}</p>
                  ) : null}

                  {highlights.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
                        {copy.profile.highlights}
                      </p>
                      <ul className="space-y-1">
                        {highlights.map((highlight, highlightIndex) => (
                          <li
                            key={highlightIndex}
                            className="flex gap-1.5 text-xs leading-relaxed text-ink-muted"
                          >
                            <span aria-hidden="true" className="text-ink-subtle">
                              •
                            </span>
                            <span className="min-w-0">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
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

                  {project.repositoryUrl || project.liveUrl ? (
                    <div className="flex flex-wrap items-center gap-3 pt-0.5">
                      {project.repositoryUrl ? (
                        <a
                          href={project.repositoryUrl}
                          className={linkClasses()}
                          aria-label={`${copy.profile.repository}: ${project.name}`}
                          {...externalLinkProps}
                        >
                          <Github className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {copy.profile.repository}
                        </a>
                      ) : null}
                      {project.liveUrl ? (
                        <a
                          href={project.liveUrl}
                          className={linkClasses()}
                          aria-label={`${copy.profile.liveSite}: ${project.name}`}
                          {...externalLinkProps}
                        >
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {copy.profile.liveSite}
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
