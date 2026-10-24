import { forwardRef } from 'react';
import Spinner from './Spinner.jsx';

const VARIANTS = {
  ghost: 'border-transparent bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
  outline: 'border-line bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink',
  solid: 'border-transparent bg-primary text-primary-fg hover:bg-primary/90',
  danger: 'border-transparent bg-transparent text-ink-muted hover:bg-danger/10 hover:text-danger',
};

const SIZES = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
};

const BASE =
  'inline-flex shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50';

/** Icon-only button. `label` is required and becomes the accessible name. */
const IconButton = forwardRef(function IconButton(
  { label, icon: Icon, variant = 'ghost', size = 'sm', isLoading = false, className = '', disabled, ...rest },
  ref,
) {
  const classes = [
    BASE,
    VARIANTS[variant] || VARIANTS.ghost,
    SIZES[size] || SIZES.sm,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      aria-label={label}
      title={label}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? (
        <Spinner size={size === 'xs' ? 'xs' : 'sm'} />
      ) : (
        <Icon className={size === 'md' ? 'h-5 w-5' : size === 'sm' ? 'h-4 w-4' : 'h-3.5 w-3.5'} aria-hidden="true" />
      )}
    </button>
  );
});

export default IconButton;
