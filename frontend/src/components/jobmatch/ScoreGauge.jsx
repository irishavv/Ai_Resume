import { motion, useReducedMotion } from 'framer-motion';
import { clamp, scoreBand } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

const SIZE = 132;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TONE_STROKE = {
  success: 'stroke-success',
  primary: 'stroke-primary',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
};

/**
 * Circular suitability gauge.
 *
 * The score is an approximate profile-to-job match produced by the backend,
 * never a probability of hiring. That distinction is stated in the caption.
 */
export default function ScoreGauge({
  score,
  label,
  caption = copy.jobMatch.scoreCaption,
  className = '',
}) {
  const prefersReducedMotion = useReducedMotion();
  const value = clamp(Math.round(Number(score) || 0), 0, 100);
  const band = scoreBand(value);
  const dashOffset = CIRCUMFERENCE * (1 - value / 100);
  const displayLabel = (typeof label === 'string' && label.trim()) || band.label || copy.jobMatch.scoreLabelFallback;

  return (
    <div
      className={['flex flex-col items-center gap-3 sm:flex-row sm:gap-4', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          className="-rotate-90"
          role="img"
          aria-label={`${displayLabel}: ${value} / 100`}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-line"
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            className={TONE_STROKE[band.tone] || TONE_STROKE.primary}
            initial={prefersReducedMotion ? false : { strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.7, ease: 'easeOut' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums text-ink">{value}</span>
          <span className="text-2xs font-medium uppercase tracking-wide text-ink-subtle">/ 100</span>
        </div>
      </div>

      <div className="min-w-0 space-y-1.5 text-center sm:text-left">
        <p className="text-sm font-semibold text-ink">{displayLabel}</p>
        <p className="text-2xs leading-relaxed text-ink-muted">{caption}</p>
      </div>
    </div>
  );
}
