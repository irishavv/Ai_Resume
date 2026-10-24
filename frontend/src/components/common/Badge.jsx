const TONES = {
  neutral: 'border-line bg-surface-muted text-ink-muted',
  primary: 'border-primary/25 bg-primary/10 text-primary',
  accent: 'border-accent/25 bg-accent/10 text-accent',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
};

const SIZES = {
  xs: 'px-1.5 py-0.5 text-2xs',
  sm: 'px-2 py-0.5 text-2xs',
  md: 'px-2.5 py-1 text-xs',
};

/** Small inline pill used for statuses, technology chips and counts. */
export default function Badge({ children, tone = 'neutral', size = 'sm', className = '', as: Tag = 'span', ...rest }) {
  const classes = [
    'inline-flex max-w-full items-center gap-1 rounded-full border font-medium leading-tight',
    TONES[tone] || TONES.neutral,
    SIZES[size] || SIZES.sm,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
