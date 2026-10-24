/** A labelled switch used for the boolean feature flags and contact options. */
export default function ToggleRow({ label, hint, checked, onChange, disabled = false, id }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-2xs leading-relaxed text-ink-subtle">{hint}</p> : null}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-55',
          checked ? 'border-transparent bg-primary' : 'border-line bg-surface-muted',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
