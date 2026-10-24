const SIZES = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
};

/** Accessible loading spinner. */
export default function Spinner({ size = 'sm', className = '', label }) {
  const classes = [
    'inline-block animate-spin rounded-full border-current border-r-transparent',
    SIZES[size] || SIZES.sm,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span role="status" aria-label={label} className="inline-flex items-center justify-center">
      <span className={classes} aria-hidden="true" />
    </span>
  );
}
