import { forwardRef } from 'react';

/** Labelled text input with inline hint and error text. */
const FormField = forwardRef(function FormField(
  { label, hint, error, as = 'input', rows = 3, className = '', containerClassName = '', ...rest },
  ref,
) {
  const fieldId = rest.id || rest.name;
  const describedBy = [error ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null]
    .filter(Boolean)
    .join(' ');

  const fieldClasses = [
    'field-base',
    as === 'textarea' ? 'resize-y leading-relaxed' : '',
    error ? 'border-danger focus-visible:ring-danger' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const shared = {
    id: fieldId,
    ref,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    className: fieldClasses,
    ...rest,
  };

  return (
    <div className={['min-w-0', containerClassName].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={fieldId} className="label-text">
          {label}
        </label>
      ) : null}

      {as === 'textarea' ? (
        <textarea rows={rows} {...shared} />
      ) : (
        <input {...shared} />
      )}

      {hint ? (
        <p id={`${fieldId}-hint`} className="mt-1 text-2xs leading-relaxed text-ink-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1 text-2xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default FormField;
