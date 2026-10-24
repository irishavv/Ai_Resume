import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import IconButton from '../common/IconButton.jsx';
import { copy } from '../../constants/copy.js';

const TONES = {
  info: {
    wrapper: 'border-accent/30 bg-accent/5 text-ink',
    icon: 'text-accent',
    Icon: Info,
  },
  success: {
    wrapper: 'border-success/30 bg-success/5 text-ink',
    icon: 'text-success',
    Icon: CheckCircle2,
  },
  danger: {
    wrapper: 'border-danger/30 bg-danger/5 text-ink',
    icon: 'text-danger',
    Icon: AlertTriangle,
  },
};

/** Inline feedback banner used for save confirmations and errors. */
export default function StatusBanner({ tone = 'info', title, description, onDismiss, className = '' }) {
  const { wrapper, icon, Icon } = TONES[tone] || TONES.info;

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={['flex items-start gap-2.5 rounded-lg border px-3 py-2.5', wrapper, className]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className={['mt-0.5 h-4 w-4 shrink-0', icon].join(' ')} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-xs font-semibold">{title}</p> : null}
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>
        ) : null}
      </div>
      {onDismiss ? (
        <IconButton label={copy.states.dismiss} icon={X} size="xs" onClick={onDismiss} />
      ) : null}
    </div>
  );
}
