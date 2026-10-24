import { MessageCircleQuestion, Sparkles } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext.jsx';
import { copy } from '../../constants/copy.js';

const FEATURED_ICON = Sparkles;

function PromptButton({ label, icon: Icon, onSelect, disabled, featured = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect()}
      className={[
        'group flex h-full w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-60',
        featured
          ? 'border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10'
          : 'border-line bg-surface hover:border-primary/40 hover:bg-surface-muted',
      ].join(' ')}
    >
      <Icon
        className={[
          'mt-0.5 h-4 w-4 shrink-0 transition-colors',
          featured ? 'text-primary' : 'text-ink-subtle group-hover:text-primary',
        ].join(' ')}
        aria-hidden="true"
      />
      <span className="text-xs font-medium leading-snug text-ink">{label}</span>
    </button>
  );
}

/**
 * Grid of recruiter prompts, edited by the operator in the console. Selecting
 * one sends it immediately. The flagged prompt is promoted above the grid as
 * the headline action.
 */
export default function SuggestedQuestions({ onSelect, disabled = false }) {
  const { settings } = useSiteSettings();
  const hero = settings.hero ?? {};
  const questions = Array.isArray(settings.questions) ? settings.questions : [];
  const featured = questions.filter((item) => item?.featured);
  const rest = questions.filter((item) => !item?.featured);

  return (
    <section className="w-full space-y-2.5">
      <div>
        <h2 className="text-sm font-semibold text-ink">
          {hero.suggestedTitle?.trim() || copy.welcome.suggestedTitle}
        </h2>
        <p className="text-xs text-ink-muted">
          {hero.suggestedSubtitle?.trim() || copy.welcome.suggestedSubtitle}
        </p>
      </div>

      {featured.map((item, index) => (
        <PromptButton
          key={`featured-${index}`}
          featured
          icon={FEATURED_ICON}
          label={item.label}
          disabled={disabled}
          onSelect={() => onSelect(item.question)}
        />
      ))}

      <ul className="grid gap-2 sm:grid-cols-2">
        {rest.map((item, index) => (
          <li key={`question-${index}`}>
            <PromptButton
              icon={MessageCircleQuestion}
              label={item.label}
              disabled={disabled}
              onSelect={() => onSelect(item.question)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
