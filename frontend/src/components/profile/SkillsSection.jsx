import { Sparkles } from 'lucide-react';
import Badge from '../common/Badge.jsx';
import { copy } from '../../constants/copy.js';

const GROUP_KEYS = ['languages', 'frameworks', 'databases', 'tools', 'concepts'];

function toItems(value) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

/** Skills grouped by category, with the "currently learning" set visually separated. */
export default function SkillsSection({ skills, currentlyLearning }) {
  const groups = GROUP_KEYS.map((key) => ({
    key,
    label: copy.profile.skillGroups[key],
    items: toItems(skills?.[key]),
  })).filter((group) => group.items.length > 0);

  const learning = toItems(currentlyLearning);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  if (groups.length === 0 && learning.length === 0) {
    return (
      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-ink">{copy.profile.skills}</h2>
        <p className="text-xs italic text-ink-subtle">{copy.profile.skillsEmpty}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-sm font-semibold text-ink">{copy.profile.skills}</h2>
        {total > 0 ? (
          <span className="text-2xs text-ink-subtle">
            {total} {copy.profile.skillsCount}
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.key} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-ink-muted">{group.label}</h3>
              <span className="text-2xs tabular-nums text-ink-subtle">{group.items.length}</span>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <li key={item}>
                  <Badge tone="neutral">{item}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {learning.length > 0 ? (
        <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {copy.profile.currentlyLearning}
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {learning.map((item) => (
              <li key={item}>
                <Badge tone="primary">{item}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
