import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Compass,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Target,
  Trophy,
} from 'lucide-react';
import Badge from '../common/Badge.jsx';
import Skeleton, { SkeletonText } from '../common/Skeleton.jsx';
import ErrorState from '../common/ErrorState.jsx';
import EmptyState from '../common/EmptyState.jsx';
import SkillsSection from './SkillsSection.jsx';
import ProjectsSection from './ProjectsSection.jsx';
import ExperienceSection from './ExperienceSection.jsx';
import EducationSection from './EducationSection.jsx';
import LinksSection from './LinksSection.jsx';
import { externalLinkProps, initials, relativeTime } from '../../lib/format.js';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { APP_INITIALS_FALLBACK, copy } from '../../constants/copy.js';

function toItems(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

/** Shared shell so every profile section has an identical heading treatment. */
function SectionBlock({ title, isEmpty = false, emptyText, children }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {isEmpty ? <p className="text-xs italic text-ink-subtle">{emptyText}</p> : children}
    </section>
  );
}

function ChipList({ items, tone = 'neutral' }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item}>
          <Badge tone={tone}>{item}</Badge>
        </li>
      ))}
    </ul>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-3 py-4 sm:px-6 sm:py-6" aria-busy="true">
      <div className="surface-card p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <Skeleton className="h-14 w-14 shrink-0" rounded="rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-64" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <SkeletonText lines={3} />
        </div>
      </div>
      {[0, 1, 2].map((index) => (
        <div key={index} className="space-y-2.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-20 w-full" rounded="rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/**
 * The full candidate profile, rendered entirely from the API payload.
 * Missing collections degrade to a short explanatory line rather than an
 * empty section.
 */
export default function ProfilePanel({
  profile,
  updatedAt,
  isLoading,
  isError,
  onRetry,
  className = '',
}) {
  const { settings } = useSiteSettings();

  if (isLoading) {
    return (
      <div className={['min-h-0 flex-1 overflow-y-auto overscroll-contain', className].filter(Boolean).join(' ')}>
        <ProfileSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={['flex min-h-0 flex-1 items-center justify-center px-4 py-6', className].filter(Boolean).join(' ')}>
        <ErrorState
          title={copy.states.profileErrorTitle}
          description={copy.states.profileErrorBody}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={['flex min-h-0 flex-1 items-center justify-center px-4 py-6', className].filter(Boolean).join(' ')}>
        <EmptyState
          icon={Target}
          title={copy.states.emptyTitle}
          description={copy.states.emptyBody}
          action={
            onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                {copy.states.retry}
              </button>
            ) : null
          }
        />
      </div>
    );
  }

  const contact = settings.contact ?? {};
  const profileName = profile.fullName?.trim();
  const name = profileName || settings.site?.name?.trim() || copy.welcome.fallbackName;
  const headline = profile.headline?.trim();
  const summary = profile.summary?.trim();
  const location = contact.showLocation !== false ? profile.location?.trim() : '';
  const email = contact.showEmail !== false ? profile.email?.trim() : '';
  const phone = contact.showPhone !== false ? profile.phone?.trim() : '';

  const achievements = toItems(profile.achievements);
  const certifications = Array.isArray(profile.certifications)
    ? profile.certifications.filter((entry) => entry && (entry.name || entry.issuer))
    : [];

  const interests = profile.careerInterests ?? {};
  const preferredRoles = toItems(interests.preferredRoles);
  const preferredLocations = toItems(interests.preferredLocations);
  const workType = typeof interests.workType === 'string' ? interests.workType.trim() : '';
  const hasInterests = preferredRoles.length > 0 || preferredLocations.length > 0 || Boolean(workType);

  return (
    <div
      className={['min-h-0 flex-1 overflow-y-auto overscroll-contain', className].filter(Boolean).join(' ')}
    >
      <div className="mx-auto max-w-3xl space-y-6 px-3 py-4 sm:px-6 sm:py-6">
        <header className="surface-card p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-base font-semibold text-primary"
              role="img"
              aria-label={copy.a11y.candidateAvatar}
            >
              {initials(profileName, settings.site?.initials?.trim() || APP_INITIALS_FALLBACK)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-ink">{name}</h1>
                {profile.sampleData ? (
                  <Badge tone="warning" size="xs">
                    {copy.profile.unverified}
                  </Badge>
                ) : null}
              </div>
              {headline ? (
                <p className="mt-0.5 break-words text-sm leading-snug text-ink-muted">{headline}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-ink-subtle">
                {location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {location}
                  </span>
                ) : null}
                {updatedAt ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {copy.profile.updatedAt}: {relativeTime(updatedAt)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {summary ? (
            <div className="mt-3.5 border-t border-line pt-3.5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
                {copy.profile.summary}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{summary}</p>
            </div>
          ) : null}

          {profile.sampleData ? (
            <p className="mt-3.5 rounded-lg border border-warning/30 bg-warning/5 px-2.5 py-2 text-2xs leading-relaxed text-warning">
              {copy.profile.sampleNotice}
            </p>
          ) : null}
        </header>

        <p className="text-2xs leading-relaxed text-ink-subtle">{copy.profile.subtitle}</p>

        {email || phone ? (
          <SectionBlock title={copy.profile.contact}>
            <ul className="flex flex-wrap gap-2">
              {email ? (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                    <span className="truncate">{email}</span>
                  </a>
                </li>
              ) : null}
              {phone ? (
                <li>
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                    <span className="truncate">{phone}</span>
                  </a>
                </li>
              ) : null}
            </ul>
          </SectionBlock>
        ) : null}

        <SkillsSection skills={profile.skills} currentlyLearning={profile.currentlyLearning} />

        <ProjectsSection projects={profile.projects} />

        <ExperienceSection experience={profile.experience} />

        <EducationSection education={profile.education} />

        <SectionBlock
          title={copy.profile.achievements}
          isEmpty={achievements.length === 0}
          emptyText={copy.profile.achievementsEmpty}
        >
          <ul className="space-y-2">
            {achievements.map((achievement, index) => (
              <li
                key={index}
                className="flex gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs leading-relaxed text-ink-muted"
              >
                <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                <span className="min-w-0">{achievement}</span>
              </li>
            ))}
          </ul>
        </SectionBlock>

        <SectionBlock
          title={copy.profile.certifications}
          isEmpty={certifications.length === 0}
          emptyText={copy.profile.certificationsEmpty}
        >
          <ul className="space-y-2">
            {certifications.map((certification, index) => {
              const issuerLine = [certification.issuer, certification.year]
                .filter(Boolean)
                .join(' · ');

              return (
                <li
                  key={`${certification.name || certification.issuer}-${index}`}
                  className="surface-card p-3"
                >
                  <div className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-xs font-semibold text-ink">
                        {certification.name || certification.issuer}
                      </p>
                      {issuerLine ? (
                        <p className="mt-0.5 text-2xs text-ink-muted">{issuerLine}</p>
                      ) : null}
                      {certification.url ? (
                        <a
                          href={certification.url}
                          className="mt-1 inline-flex items-center gap-1 text-2xs font-medium text-accent hover:underline"
                          aria-label={`${certification.name || certification.issuer}: ${copy.profile.verified}`}
                          {...externalLinkProps}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {copy.profile.credential}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionBlock>

        <section className="space-y-2.5">
          <h2 className="text-sm font-semibold text-ink">{copy.profile.links}</h2>
          <LinksSection profile={profile} />
        </section>

        <SectionBlock
          title={copy.profile.careerInterests}
          isEmpty={!hasInterests}
          emptyText={copy.profile.careerInterestsEmpty}
        >
          <div className="space-y-3 rounded-xl border border-line bg-surface p-3.5">
            {preferredRoles.length > 0 ? (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
                  <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {copy.profile.preferredRoles}
                </p>
                <ChipList items={preferredRoles} tone="primary" />
              </div>
            ) : null}

            {preferredLocations.length > 0 ? (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {copy.profile.preferredLocations}
                </p>
                <ChipList items={preferredLocations} />
              </div>
            ) : null}

            {workType ? (
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
                  <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {copy.profile.workType}
                </p>
                <Badge tone="accent">{workType}</Badge>
              </div>
            ) : null}
          </div>
        </SectionBlock>
      </div>
    </div>
  );
}
