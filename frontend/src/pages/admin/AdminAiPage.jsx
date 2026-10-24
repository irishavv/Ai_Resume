import { useCallback, useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import SectionCard from '../../components/admin/SectionCard.jsx';
import FormField from '../../components/admin/FormField.jsx';
import StatusBanner from '../../components/admin/StatusBanner.jsx';
import Button from '../../components/common/Button.jsx';
import IconButton from '../../components/common/IconButton.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAdminDiagnostics, useAdminSettings, useSaveSettings } from '../../hooks/useAdmin.js';
import { siteSettingsSchema } from '../../schemas/siteSettingsSchema.js';
import { copy } from '../../constants/copy.js';

const EMPTY_VALUES = {
  site: { name: '', shortName: '', initials: '', tagline: '', accentColor: '#4f46e5', logoUrl: '' },
  hero: {
    eyebrow: '',
    headline: '',
    summary: '',
    summaryLabel: '',
    suggestedTitle: '',
    suggestedSubtitle: '',
  },
  features: {
    chat: true,
    jobMatch: true,
    pdfExport: true,
    languageToggle: true,
    voiceInput: true,
    themeToggle: true,
  },
  contact: { showEmail: true, showPhone: true, showLocation: true },
  footer: { text: '', showDisclaimer: true },
  ai: { historyLimit: 20, rateLimitPerMinute: 20, jobMatchRubric: [] },
};

function toFormValues(settings) {
  const site = settings.site ?? {};
  return {
    site: { ...site, logoUrl: typeof site.logoUrl === 'string' ? site.logoUrl : '' },
    hero: { ...EMPTY_VALUES.hero, ...(settings.hero ?? {}) },
    features: { ...EMPTY_VALUES.features, ...(settings.features ?? {}) },
    contact: { ...EMPTY_VALUES.contact, ...(settings.contact ?? {}) },
    footer: { ...EMPTY_VALUES.footer, ...(settings.footer ?? {}) },
    ai: { ...EMPTY_VALUES.ai, ...(settings.ai ?? {}) },
  };
}

/** Operational AI limits and the job-match rubric, plus a service probe. */
export default function AdminAiPage() {
  const { data, isLoading, isError, refetch } = useAdminSettings();
  const { mutateAsync: saveSettings } = useSaveSettings();
  const diagnostics = useAdminDiagnostics({ enabled: false });

  const [feedback, setFeedback] = useState(null);

  const settingsDoc = data?.settings ?? null;
  const updatedAt = data?.updatedAt ?? null;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: EMPTY_VALUES,
    mode: 'onBlur',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'ai.jobMatchRubric' });
  const rubric = useWatch({ control, name: 'ai.jobMatchRubric' });
  const rubricTotal = (rubric ?? []).reduce((total, item) => total + Number(item?.weight || 0), 0);

  const seededFor = useRef(undefined);
  useEffect(() => {
    if (!settingsDoc) return;
    if (seededFor.current === updatedAt) return;
    seededFor.current = updatedAt;
    reset(toFormValues(settingsDoc));
  }, [reset, settingsDoc, updatedAt]);

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    try {
      const result = await saveSettings(values);
      if (result?.settings) {
        seededFor.current = result.updatedAt ?? seededFor.current;
        reset(toFormValues(result.settings));
      }
      setFeedback({
        tone: 'success',
        title: copy.admin.states.savedTitle,
        description: copy.admin.ai.limitsSaved,
      });
      diagnostics.refetch();
    } catch (error) {
      setFeedback({
        tone: 'danger',
        title: copy.admin.states.errorTitle,
        description: error?.message || copy.errors.generic,
      });
    }
  });

  const handleAddCriterion = useCallback(() => {
    append({ criterion: '', weight: 0 });
  }, [append]);

  const runCheck = diagnostics.refetch;
  const report = diagnostics.data ?? null;

  if (isError) {
    return (
      <ErrorState
        title={copy.admin.states.errorTitle}
        description={copy.errors.server}
        onRetry={refetch}
      />
    );
  }

  if (isLoading || !settingsDoc) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-44 w-full" />
        ))}
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <PageHeader
        title={copy.admin.ai.title}
        description={copy.admin.ai.subtitle}
        actions={
          <Button size="sm" type="submit" leftIcon={Save} isLoading={isSubmitting}>
            {isSubmitting ? copy.admin.ai.saving : copy.admin.ai.saveLimits}
          </Button>
        }
      >
        {isDirty ? (
          <p className="text-2xs font-medium text-warning">{copy.admin.settings.unsaved}</p>
        ) : null}
      </PageHeader>

      {feedback ? (
        <StatusBanner
          tone={feedback.tone}
          title={feedback.title}
          description={feedback.description}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={copy.admin.ai.limitsTitle}>
          <div className="space-y-3.5">
            <FormField
              type="number"
              min={1}
              max={200}
              label={copy.admin.ai.historyLimit}
              hint={copy.admin.ai.historyLimitHint}
              error={errors.ai?.historyLimit?.message}
              {...register('ai.historyLimit')}
            />
            <FormField
              type="number"
              min={0}
              max={10000}
              label={copy.admin.ai.rateLimit}
              hint={copy.admin.ai.rateLimitHint}
              error={errors.ai?.rateLimitPerMinute?.message}
              {...register('ai.rateLimitPerMinute')}
            />
          </div>
        </SectionCard>

        <SectionCard
          title={copy.admin.ai.diagnosticsTitle}
          description={copy.admin.ai.diagnosticsBody}
          actions={
            <Button
              size="sm"
              variant="outline"
              leftIcon={RefreshCw}
              isLoading={diagnostics.isFetching}
              onClick={() => runCheck()}
            >
              {diagnostics.isFetching ? copy.admin.ai.running : copy.admin.ai.runCheck}
            </Button>
          }
        >
          {report ? (
            <div className="space-y-3">
              <StatusBanner
                tone={report.reachable ? 'success' : 'danger'}
                title={report.reachable ? copy.admin.overview.reachable : copy.admin.overview.unreachable}
                description={report.message || undefined}
              />

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { label: copy.admin.overview.statusLabel, value: report.status },
                  { label: copy.admin.overview.provider, value: report.provider },
                  { label: copy.admin.overview.model, value: report.model },
                  {
                    label: copy.admin.overview.latency,
                    value: report.latencyMs == null ? '—' : `${report.latencyMs} ms`,
                  },
                ].map((item) => (
                  <div key={item.label} className="min-w-0">
                    <dt className="text-2xs uppercase tracking-wide text-ink-subtle">
                      {item.label}
                    </dt>
                    <dd className="truncate text-xs font-medium text-ink" title={item.value || '—'}>
                      {item.value || '—'}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="border-t border-line pt-3">
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
                  {copy.admin.ai.endpointTitle}
                </p>
                <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    {
                      label: copy.admin.ai.responseTimeout,
                      value: `${report.responseTimeoutMs} ms`,
                    },
                    {
                      label: copy.admin.ai.connectTimeout,
                      value: `${report.connectTimeoutMs} ms`,
                    },
                    {
                      label: copy.admin.ai.resumeMaxBytes,
                      value: `${Math.round(report.resumeMaxBytes / 1024 / 1024)} MB`,
                    },
                  ].map((item) => (
                    <div key={item.label} className="min-w-0">
                      <dt className="text-2xs text-ink-subtle">{item.label}</dt>
                      <dd className="text-xs font-medium text-ink">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-muted">{copy.admin.overview.noDiagnostics}</p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title={copy.admin.ai.rubricTitle}
        description={copy.admin.ai.rubricBody}
        actions={
          <Button
            size="sm"
            variant="outline"
            leftIcon={Plus}
            disabled={fields.length >= 10}
            onClick={handleAddCriterion}
          >
            {copy.admin.ai.addCriterion}
          </Button>
        }
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-2xs text-ink-muted">{copy.admin.ai.total}</span>
            <span
              className={[
                'text-sm font-semibold tabular-nums',
                rubricTotal === 100 ? 'text-success' : 'text-danger',
              ].join(' ')}
            >
              {rubricTotal}
            </span>
          </div>
        }
      >
        {fields.length === 0 ? (
          <p className="text-xs text-ink-muted">{copy.admin.ai.rubricEmpty}</p>
        ) : (
          <ul className="space-y-2.5">
            {fields.map((field, index) => (
              <li key={field.id} className="flex items-end gap-2">
                <FormField
                  containerClassName="flex-1"
                  label={index === 0 ? copy.admin.ai.criterion : undefined}
                  error={errors.ai?.jobMatchRubric?.[index]?.criterion?.message}
                  {...register(`ai.jobMatchRubric.${index}.criterion`)}
                />
                <FormField
                  containerClassName="w-24 shrink-0"
                  type="number"
                  min={0}
                  max={100}
                  label={index === 0 ? copy.admin.ai.weight : undefined}
                  error={errors.ai?.jobMatchRubric?.[index]?.weight?.message}
                  {...register(`ai.jobMatchRubric.${index}.weight`)}
                />
                <IconButton
                  label={copy.admin.ai.removeCriterion}
                  icon={Trash2}
                  variant="danger"
                  size="md"
                  className="mb-0.5"
                  onClick={() => remove(index)}
                />
              </li>
            ))}
          </ul>
        )}

        {rubricTotal !== 100 && fields.length > 0 ? (
          <p className="mt-3 text-2xs font-medium text-danger">
            {copy.admin.ai.totalMustBe100}
          </p>
        ) : null}

        {errors.ai?.jobMatchRubric?.message ? (
          <p className="mt-2 text-2xs font-medium text-danger">
            {errors.ai.jobMatchRubric.message}
          </p>
        ) : null}
      </SectionCard>
    </form>
  );
}
