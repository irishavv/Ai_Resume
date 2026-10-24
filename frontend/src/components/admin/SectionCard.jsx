/**
 * A titled panel used throughout the console so every page has the same
 * rhythm: a heading, an optional description, optional header actions and a
 * body.
 */
export default function SectionCard({
  title,
  description,
  actions,
  children,
  footer,
  className = '',
  bodyClassName = '',
}) {
  return (
    <section className={['surface-card overflow-hidden', className].filter(Boolean).join(' ')}>
      {title || description || actions ? (
        <header className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            {title ? <h2 className="text-sm font-semibold text-ink">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}

      <div className={['px-4 py-4', bodyClassName].filter(Boolean).join(' ')}>{children}</div>

      {footer ? (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-muted/40 px-4 py-3">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
