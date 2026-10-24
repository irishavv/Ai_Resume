import { MapPin } from 'lucide-react';
import Skeleton from '../common/Skeleton.jsx';
import ErrorState from '../common/ErrorState.jsx';
import Badge from '../common/Badge.jsx';
import LinksSection from './LinksSection.jsx';
import { initials, pluralize } from '../../lib/format.js';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { APP_INITIALS_FALLBACK, copy } from '../../constants/copy.js';

/** Compact identity card for the sidebar: avatar, name, headline, location, links. */
export default function CandidateCard({ profile, isLoading, isError, onRetry, className = '' }) {
  const { settings } = useSiteSettings();

  if (isLoading) {
    return (
      <div className={['surface-card p-3', className].filter(Boolean).join(' ')} aria-busy="true">
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 shrink-0" rounded="rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={className}>
        <ErrorState
          compact
          title={copy.states.profileErrorTitle}
          description={copy.states.profileErrorBody}
          onRetry={onRetry}
        />
      </div>
    );
  }

  const contact = settings.contact ?? {};
  const profileName = profile?.fullName?.trim();
  const name = profileName || settings.site?.name?.trim() || copy.welcome.fallbackName;
  const headline =
    profile?.headline?.trim() ||
    settings.hero?.headline?.trim() ||
    copy.welcome.fallbackHeadline;
  const location = contact.showLocation !== false ? profile?.location?.trim() : '';
  const projectCount = Array.isArray(profile?.projects) ? profile.projects.length : 0;
  const skillCount = profile?.skills
    ? Object.values(profile.skills).reduce(
        (total, group) => total + (Array.isArray(group) ? group.length : 0),
        0,
      )
    : 0;

  return (
    <div className={['surface-card p-3', className].filter(Boolean).join(' ')}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-sm font-semibold text-primary"
          aria-label={copy.a11y.candidateAvatar}
          role="img"
        >
          {initials(profileName, settings.site?.initials?.trim() || APP_INITIALS_FALLBACK)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-muted">{headline}</p>
          {location ? (
            <p className="mt-1 flex items-center gap-1 text-2xs text-ink-subtle">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {projectCount > 0 ? (
          <Badge tone="neutral" size="xs">
            {projectCount} {pluralize(projectCount, copy.profile.projectUnit)}
          </Badge>
        ) : null}
        {skillCount > 0 ? (
          <Badge tone="neutral" size="xs">
            {skillCount} {pluralize(skillCount, copy.profile.skillUnit)}
          </Badge>
        ) : null}
        {profile?.sampleData ? (
          <Badge tone="warning" size="xs">
            {copy.profile.sampleBadge}
          </Badge>
        ) : null}
      </div>

      <LinksSection profile={profile} variant="inline" className="mt-2.5" />
    </div>
  );
}
