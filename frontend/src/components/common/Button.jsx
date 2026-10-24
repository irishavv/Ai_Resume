import { forwardRef } from 'react';
import Spinner from './Spinner.jsx';

const VARIANTS = {
  primary:
    'border-transparent bg-primary text-primary-fg shadow-sm hover:bg-primary/90 active:bg-primary/80',
  secondary:
    'border-line bg-surface-muted text-ink hover:bg-surface-muted/70 active:bg-surface-muted',
  outline: 'border-line bg-transparent text-ink hover:bg-surface-muted',
  ghost: 'border-transparent bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
  danger: 'border-transparent bg-danger text-white shadow-sm hover:bg-danger/90',
};

const SIZES = {
  xs: 'h-7 gap-1 px-2 text-2xs',
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-sm',
};

const BASE =
  'inline-flex select-none items-center justify-center rounded-lg border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-55';

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    fullWidth = false,
    className = '',
    children,
    disabled = false,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [
    BASE,
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? (
        <Spinner size={size === 'lg' || size === 'md' ? 'sm' : 'xs'} />
      ) : LeftIcon ? (
        <LeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
      {children == null ? null : <span className="truncate">{children}</span>}
      {!isLoading && RightIcon ? (
        <RightIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
    </button>
  );
});

export default Button;
