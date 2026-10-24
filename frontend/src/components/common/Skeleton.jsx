/** Neutral placeholder used while data loads. */
export default function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  const classes = ['animate-pulse bg-surface-muted', rounded, className].filter(Boolean).join(' ');
  return <span aria-hidden="true" className={classes} />;
}

/** Convenience block of stacked lines for text placeholders. */
export function SkeletonText({ lines = 3, className = '' }) {
  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3', 'w-3/4'];
  return (
    <span className={['block space-y-2', className].filter(Boolean).join(' ')}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={`h-3 ${widths[index % widths.length]}`} />
      ))}
    </span>
  );
}
