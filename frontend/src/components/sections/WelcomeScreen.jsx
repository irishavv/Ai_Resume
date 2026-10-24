import { Briefcase, FolderKanban, GraduationCap, Layers, Sparkles, Wrench } from 'lucide-react';
import Skeleton from '../common/Skeleton.jsx';
import SuggestedQuestions from '../chat/SuggestedQuestions.jsx';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { copy } from '../../constants/copy.js';

const PRIMARY_STACK_LIMIT = 5;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function totalSkills(skills) {
  if (!skills || typeof skills !== 'object') return 0;
  return Object.values(skills).reduce(
    (total, group) => total + asArray(group).length,
    0,
  );
}

function primaryStack(skills) {
  const frameworks = asArray(skills?.frameworks).filter(Boolean);
  if (frameworks.length > 0) return frameworks.slice(0, PRIMARY_STACK_LIMIT);
  return asArray(skills?.languages).filter(Boolean).slice(0, PRIMARY_STACK_LIMIT);
}

function StatCard({ icon: Icon, value, label, isLoading }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-ink-subtle">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {isLoading ? (
          <Skeleton className="h-4 w-6" />
        ) : (
          <span className="text-base font-semibold tabular-nums text-ink">{value}</span>
        )}
      </div>
      <p className="mt-1 text-2xs leading-snug text-ink-muted">{label}</p>
    </div>
  );
}

/**
 * First-run state for the chat panel: candidate identity, recruiter prompts and
 * profile-derived quick stats. Selecting a prompt sends it immediately.
 *
 * The prelude copy is the operator-editable hero from the site settings; the
 * candidate's own headline and summary still take precedence when present.
 */
export default function WelcomeScreen({ profile, isLoading = false, onAsk, disabled = false }) {
  const { settings } = useSiteSettings();
  const hero = settings.hero ?? {};
  const statLabels = hero.statLabels ?? {};
  const footer = settings.footer ?? {};

  const name = profile?.fullName?.trim() || copy.welcome.fallbackName;
  const headline =
    profile?.headline?.trim() || hero.headline?.trim() || copy.welcome.fallbackHeadline;
  const summary =
    profile?.summary?.trim() || hero.summary?.trim() || copy.welcome.fallbackSummary;
  const stack = primaryStack(profile?.skills);

  const statLabel = (key, fallback) => statLabels[key]?.trim() || fallback;

  const stats = [
    {
      key: 'projects',
      label: statLabel('projects', copy.welcome.statProjects),
      value: asArray(profile?.projects).length,
      icon: FolderKanban,
    },
    {
      key: 'skills',
      label: statLabel('skills', copy.welcome.statSkills),
      value: totalSkills(profile?.skills),
      icon: Wrench,
    },
    {
      key: 'education',
      label: statLabel('education', copy.welcome.statEducation),
      value: asArray(profile?.education).length,
      icon: GraduationCap,
    },
    {
      key: 'experience',
      label: statLabel('experience', copy.welcome.statExperience),
      value: asArray(profile?.experience).length,
      icon: Briefcase,
    },
    {
      key: 'learning',
      label: statLabel('learning', copy.welcome.statLearning),
      value: asArray(profile?.currentlyLearning).length,
      icon: Sparkles,
    },
  ];

  return (
    <div className="flex max-h-full w-full flex-col gap-5 overflow-y-auto overscroll-contain py-1">
      <div className="space-y-1.5 text-center sm:text-left">
        <p className="text-2xs font-semibold uppercase tracking-wide text-primary">
          {hero.eyebrow?.trim() || copy.welcome.eyebrow}
        </p>
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">{name}</h1>
        <p className="text-sm leading-snug text-ink-muted">{headline}</p>
      </div>

      <div className="surface-card p-3.5">
        <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
          {hero.summaryLabel?.trim() || copy.welcome.summaryLabel}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{summary}</p>

        <div className="mt-3 border-t border-line pt-3">
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
            <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {copy.welcome.primaryStack}
          </p>
          {stack.length > 0 ? (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {stack.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-2xs font-medium text-accent"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-2xs italic text-ink-subtle">{copy.welcome.noStack}</p>
          )}
        </div>
      </div>

      <SuggestedQuestions onSelect={onAsk} disabled={disabled} />

      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-ink">{copy.welcome.statsTitle}</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(({ key, label, value, icon }) => (
            <li key={key}>
              <StatCard icon={icon} label={label} value={value} isLoading={isLoading} />
            </li>
          ))}
        </ul>
      </section>

      {footer.showDisclaimer !== false ? (
        <p className="text-2xs leading-relaxed text-ink-subtle">
          {footer.disclaimerText?.trim() || copy.chat.disclaimer}
        </p>
      ) : null}
      {footer.text?.trim() ? (
        <p className="text-2xs leading-relaxed text-ink-subtle">{footer.text.trim()}</p>
      ) : null}
    </div>
  );
}
