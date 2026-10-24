import { Code2, Github, Globe, Linkedin } from 'lucide-react';
import { externalLinkProps } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

const SOCIAL_LINKS = [
  { key: 'github', label: 'GitHub', Icon: Github },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
  { key: 'portfolio', label: 'Portfolio', Icon: Globe },
  { key: 'leetcode', label: 'LeetCode', Icon: Code2 },
];

/**
 * Social links plus coding profiles.
 * `inline` renders a compact icon row for the sidebar candidate card.
 */
export default function LinksSection({ profile, variant = 'full', className = '' }) {
  const links = profile?.links ?? {};
  const socials = SOCIAL_LINKS.filter(({ key }) => {
    const value = links[key];
    return typeof value === 'string' && value.trim().length > 0;
  });

  const codingProfiles = Array.isArray(profile?.codingProfiles)
    ? profile.codingProfiles.filter((entry) => entry && (entry.url || entry.handle))
    : [];

  if (variant === 'inline') {
    if (socials.length === 0) return null;
    return (
      <div className={['flex flex-wrap items-center gap-1', className].filter(Boolean).join(' ')}>
        {socials.map(({ key, label, Icon }) => (
          <a
            key={key}
            href={links[key]}
            aria-label={label}
            title={label}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            {...externalLinkProps}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </a>
        ))}
      </div>
    );
  }

  const hasAnyLink = socials.length > 0 || codingProfiles.length > 0;

  return (
    <div className={['space-y-2', className].filter(Boolean).join(' ')}>
      {!hasAnyLink ? (
        <p className="text-xs italic text-ink-subtle">{copy.profile.linksEmpty}</p>
      ) : null}

      {socials.length > 0 ? (
        <ul className="space-y-1.5">
          {socials.map(({ key, label, Icon }) => (
            <li key={key}>
              <a
                href={links[key]}
                className="group flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                {...externalLinkProps}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                <span className="shrink-0 font-medium text-ink">{label}</span>
                <span className="truncate text-ink-subtle">{links[key]}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {codingProfiles.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
            {copy.profile.codingProfiles}
          </p>
          <ul className="space-y-1.5">
            {codingProfiles.map((entry, index) => {
              const label = entry.platform || copy.profile.codingProfiles;
              const secondary = entry.handle || entry.url || '';
              const content = (
                <>
                  <Code2 className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <span className="shrink-0 font-medium text-ink">{label}</span>
                  <span className="truncate text-ink-subtle">{secondary}</span>
                </>
              );

              return (
                <li key={`${label}-${index}`}>
                  {entry.url ? (
                    <a
                      href={entry.url}
                      className="group flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                      {...externalLinkProps}
                    >
                      {content}
                    </a>
                  ) : (
                    <span className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs">
                      {content}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
