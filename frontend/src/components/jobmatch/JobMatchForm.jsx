import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import Button from '../common/Button.jsx';
import jobDescriptionSchema, {
  JOB_DESCRIPTION_COUNTER_THRESHOLD,
  JOB_DESCRIPTION_MAX_LENGTH,
} from '../../schemas/jobDescriptionSchema.js';
import { copy } from '../../constants/copy.js';

const COUNTER_WARNING_THRESHOLD = 500;

/** Job description form. Validated with zod before the analysis request runs. */
export default function JobMatchForm({ onSubmit, isSubmitting = false, className = '' }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(jobDescriptionSchema),
    defaultValues: { jobDescription: '' },
    mode: 'onSubmit',
  });

  const value = watch('jobDescription') || '';
  const remaining = JOB_DESCRIPTION_MAX_LENGTH - value.length;
  const showCounter = value.length >= JOB_DESCRIPTION_COUNTER_THRESHOLD;
  const errorMessage = errors.jobDescription?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={className}>
      <h3 className="text-sm font-semibold text-ink">{copy.jobMatch.formTitle}</h3>
      <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">
        {copy.jobMatch.formDescription}
      </p>

      <label htmlFor="job-description" className="label-text mt-3">
        {copy.jobMatch.fieldLabel}
      </label>

      <textarea
        id="job-description"
        rows={8}
        maxLength={JOB_DESCRIPTION_MAX_LENGTH}
        placeholder={copy.jobMatch.fieldPlaceholder}
        disabled={isSubmitting}
        aria-invalid={errorMessage ? 'true' : undefined}
        aria-describedby={errorMessage ? 'job-description-error' : undefined}
        className={[
          'field-base min-h-[9rem] resize-y leading-relaxed',
          errorMessage ? 'border-danger focus-visible:ring-danger' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...register('jobDescription')}
      />

      <p
        id="job-description-error"
        role={errorMessage ? 'alert' : undefined}
        className={errorMessage ? 'mt-1 text-2xs text-danger' : 'sr-only'}
      >
        {errorMessage || ''}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span
          aria-live="polite"
          className={
            showCounter
              ? `text-2xs tabular-nums ${
                  remaining <= COUNTER_WARNING_THRESHOLD ? 'text-warning' : 'text-ink-subtle'
                }`
              : 'sr-only'
          }
        >
          {remaining} {copy.composer.counterHint}
        </span>

        <Button
          type="submit"
          leftIcon={Sparkles}
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="ml-auto"
        >
          {isSubmitting ? copy.jobMatch.analysing : copy.jobMatch.analyse}
        </Button>
      </div>
    </form>
  );
}
