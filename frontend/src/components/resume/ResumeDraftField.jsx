import { useId } from 'react';
import Badge from '../common/Badge.jsx';
import { copy } from '../../constants/copy.js';

const KIND_HINTS = {
  text: null,
  lines: copy.resume.listHint,
  json: copy.resume.jsonHint,
};

/**
 * One extracted draft value with an include toggle and an editable control.
 * Scalars are single-line inputs, string arrays are line-separated textareas and
 * structured values are edited as JSON.
 */
export default function ResumeDraftField({ field, onChange, onToggleInclude, disabled = false }) {
  const checkboxId = useId();
  const controlId = `${checkboxId}-control`;
  const { label, kind, text, include, error } = field;
  const hint = KIND_HINTS[kind];

  const rows = kind === 'lines' ? 3 : Math.min(16, Math.max(6, String(text).split('\n').length + 1));

  const controlProps = {
    id: controlId,
    value: text,
    disabled: disabled || !include,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? `${controlId}-error` : undefined,
    className: [
      'field-base mt-1.5',
      kind === 'text' ? '' : 'resize-y font-mono text-xs leading-relaxed',
      include ? '' : 'opacity-55',
      error ? 'border-danger focus-visible:ring-danger' : '',
    ]
      .filter(Boolean)
      .join(' '),
    onChange: (event) => onChange(event.target.value),
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-start gap-2">
        <input
          id={checkboxId}
          type="checkbox"
          checked={include}
          disabled={disabled}
          onChange={onToggleInclude}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-line text-primary accent-[rgb(var(--color-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        />
        <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer select-none">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-ink">{label}</span>
            <Badge size="xs" tone={include ? 'primary' : 'neutral'}>
              {include ? copy.resume.includeField : copy.resume.excludedField}
            </Badge>
          </span>
          {hint ? <span className="mt-0.5 block text-2xs text-ink-subtle">{hint}</span> : null}
        </label>
      </div>

      {kind === 'text' ? (
        <input type="text" {...controlProps} />
      ) : (
        <textarea rows={rows} spellCheck={false} {...controlProps} />
      )}

      <p
        id={`${controlId}-error`}
        role={error ? 'alert' : undefined}
        className={error ? 'mt-1 text-2xs text-danger' : 'sr-only'}
      >
        {error || ''}
      </p>
    </div>
  );
}
