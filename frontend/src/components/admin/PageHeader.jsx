/** Consistent page heading for every console screen. */
export default function PageHeader({ title, description, actions, children }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-ink">{title}</h1>
          {description ? (
            <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-ink-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
