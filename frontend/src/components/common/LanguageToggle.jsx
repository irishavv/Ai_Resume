import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { copy } from '../../constants/copy.js';

const OPTIONS = [
  { id: 'en', label: copy.language.englishShort, title: copy.language.english },
  { id: 'hi', label: copy.language.hindiShort, title: copy.language.hindi },
];

const SIZES = {
  sm: 'px-2 py-1 text-2xs',
  md: 'px-2.5 py-1.5 text-xs',
};

/** Compact segmented control for the answer language (English / Hindi). */
export default function LanguageToggle({
  value,
  onChange,
  size = 'sm',
  disabled = false,
  className = '',
}) {
  const prefersReducedMotion = useReducedMotion();
  const indicatorId = useId();

  return (
    <div
      role="radiogroup"
      aria-label={copy.language.label}
      className={[
        'inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-muted/70 p-0.5',
        disabled ? 'opacity-60' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {OPTIONS.map(({ id, label, title }) => {
        const isActive = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={title}
            title={title}
            disabled={disabled}
            onClick={() => onChange?.(id)}
            className={[
              'relative inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed',
              SIZES[size] || SIZES.sm,
              isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {isActive ? (
              <motion.span
                layoutId={`language-indicator-${indicatorId}`}
                className="absolute inset-0 rounded-md border border-line bg-surface shadow-sm"
                transition={
                  prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }
                }
                aria-hidden="true"
              />
            ) : null}
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
