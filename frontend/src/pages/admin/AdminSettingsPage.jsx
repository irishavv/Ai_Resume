import { useCallback, useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Save, Trash2, Undo2 } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import SectionCard from '../../components/admin/SectionCard.jsx';
import FormField from '../../components/admin/FormField.jsx';
import ToggleRow from '../../components/admin/ToggleRow.jsx';
import StatusBanner from '../../components/admin/StatusBanner.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import Button from '../../components/common/Button.jsx';
import IconButton from '../../components/common/IconButton.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import { useAdminSettings, useResetSettings, useSaveSettings } from '../../hooks/useAdmin.js';
import { siteSettingsSchema } from '../../schemas/siteSettingsSchema.js';
import { relativeTime } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

const FALLBACK_ACCENT = '#4f46e5';
const HEX_SIX = /^#[0-9a-fA-F]{6}$/;

const FEATURE_FLAGS = ['chat', 'jobMatch', 'pdfExport', 'languageToggle', 'voiceInput', 'themeToggle'];
const CONTACT_FLAGS = ['showEmail', 'showPhone', 'showLocation'];
const STAT_LABELS = ['projects', 'skills', 'education', 'experience', 'learning'];

const EMPTY_VALUES = {
  site: { name: '', shortName: '', initials: '', tagline: '', accentColor: FALLBACK_ACCENT, logoUrl: '' },
  hero: {
    eyebrow: '',
    headline: '',
    summary: '',
    summaryLabel: '',
    suggestedTitle: '',
    suggestedSubtitle: '',
    statLabels: { projects: '', skills: '', education: '', experience: '', learning: '' },
  },
  questions: [],
  features: {
    chat: true,
    jobMatch: true,
    pdfExport: true,
    languageToggle: true,
    voiceInput: true,
    themeToggle: true,
  },
  contact: { showEmail: true, showPhone: true, showLocation: true },
  footer: { text: '', showDisclaimer: true, disclaimerText: '' },
  ai: { historyLimit: 20, rateLimitPerMinute: 20, jobMatchRubric: [] },
};

const EMPTY_QUESTION = { label: '', question: '', featured: false };

/**
 * Turns the stored document into form values. Every key is carried across,
 * including the ones the console does not render, so saving never drops a
 * setting it does not know about.
 */
function toFormValues(settings) {
  const site = settings.site ?? {};
  const hero = settings.hero ?? {};
  const questions = Array.isArray(settings.questions) ? settings.questions : [];
  return {
    site: { ...site, logoUrl: typeof site.logoUrl === 'string' ? site.logoUrl : '' },
    hero: {
      ...EMPTY_VALUES.hero,
      ...hero,
      statLabels: { ...EMPTY_VALUES.hero.statLabels, ...(hero.statLabels ?? {}) },
    },
    questions: questions.map((item) => ({
      label: item?.label ?? '',
      question: item?.question ?? '',
      featured: Boolean(item?.featured),
    })),
    features: { ...EMPTY_VALUES.features, ...(settings.features ?? {}) },
    contact: { ...EMPTY_VALUES.contact, ...(settings.contact ?? {}) },
    footer: { ...EMPTY_VALUES.footer, ...(settings.footer ?? {}) },
    ai: { ...EMPTY_VALUES.ai, ...(settings.ai ?? {}) },
  };
}

/** A switch wired to a nested form path. */
function SettingToggle({ control, setValue, name, label, hint }) {
  const checked = useWatch({ control, name });
  return (
    <ToggleRow
      id={name.replace(/\./g, '-')}
      label={label}
      hint={hint}
      checked={Boolean(checked)}
      onChange={(next) => setValue(name, next, { shouldDirty: true })}
    />
  );
}

/** The accent colour, as a hex field with a native colour picker beside it. */
function AccentField({ control, setValue, error }) {
  const accent = useWatch({ control, name: 'site.accentColor' });
  const swatch = HEX_SIX.test(accent ?? '') ? accent : FALLBACK_ACCENT;

  return (
    <div className="flex items-start gap-2">
      <input
        type="color"
        value={swatch}
        aria-label={copy.admin.settings.fields.accentColor}
        onChange={(event) => setValue('site.accentColor', event.target.value, { shouldDirty: true })}
        className="mt-6 h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-line bg-surface p-0.5"
      />
      <FormField
        id="site-accentColor"
        name="site.accentColor"
        label={copy.admin.settings.fields.accentColor}
        placeholder="#4f46e5"
        className="font-mono"
        error={error}
        onChange={(event) => setValue('site.accentColor', event.target.value, { shouldDirty: true })}
        value={accent ?? ''}
      />
    </div>
  );
}

/**
 * The suggested recruiter prompts. Each row is a form entry; the featured row is
 * promoted above the grid on the public welcome screen.
 */
function QuestionsEditor({ control, register, setValue, errors, fieldArray }) {
  const { fields, append, remove, move } = fieldArray;

  return (
    <SectionCard
      title={copy.admin.settings.groups.questions}
      description={copy.admin.settings.questionsHint}
    >
      {fields.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface-muted/40 px-3 py-4 text-2xs leading-relaxed text-ink-muted">
          {copy.admin.settings.questionsEmpty}
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <li key={field.id} className="rounded-xl border border-line bg-surface-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
                  {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <IconButton
                    size="sm"
                    label={copy.admin.settings.moveQuestionUp}
                    icon={ArrowUp}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  />
                  <IconButton
                    size="sm"
                    label={copy.admin.settings.moveQuestionDown}
                    icon={ArrowDown}
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                  />
                  <IconButton
                    size="sm"
                    variant="danger"
                    label={copy.admin.settings.removeQuestion}
                    icon={Trash2}
                    onClick={() => remove(index)}
                  />
                </div>
              </div>

              <div className="mt-2 space-y-3">
                <FormField
                  label={copy.admin.settings.questionFields.label}
                  error={errors.questions?.[index]?.label?.message}
                  {...register(`questions.${index}.label`)}
                />
                <FormField
                  label={copy.admin.settings.questionFields.prompt}
                  as="textarea"
                  rows={3}
                  error={errors.questions?.[index]?.question?.message}
                  {...register(`questions.${index}.question`)}
                />
                <SettingToggle
                  control={control}
                  setValue={setValue}
                  name={`questions.${index}.featured`}
                  label={copy.admin.settings.questionFields.featured}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {errors.questions?.message ? (
        <p className="mt-2 text-2xs font-medium text-danger">{errors.questions.message}</p>
      ) : null}

      <Button
        className="mt-3"
        size="sm"
        variant="outline"
        leftIcon={Plus}
        onClick={() => append({ ...EMPTY_QUESTION })}
      >
        {copy.admin.settings.addQuestion}
      </Button>
    </SectionCard>
  );
}

/** Site settings: branding, hero copy, prompts, feature flags, contact and footer. */
export default function AdminSettingsPage() {
  const { data, isLoading, isError, refetch } = useAdminSettings();
  const { mutateAsync: saveSettings } = useSaveSettings();
  const { mutateAsync: resetSettings, isPending: isResetting } = useResetSettings();

  const [feedback, setFeedback] = useState(null);
  const [isResetOpen, setIsResetOpen] = useState(false);

  const settingsDoc = data?.settings ?? null;
  const updatedAt = data?.updatedAt ?? null;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: EMPTY_VALUES,
    mode: 'onBlur',
  });

  const fieldArray = useFieldArray({ control, name: 'questions' });

  // The form is re-seeded whenever the stored document changes, but not on an
  // identical refetch, so an edit in progress is never silently discarded.
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
      setFeedback({ tone: 'success', title: copy.admin.states.savedTitle });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        title: copy.admin.states.errorTitle,
        description: error?.message || copy.errors.generic,
      });
    }
  });

  const handleDiscard = useCallback(() => {
    setFeedback(null);
    reset(toFormValues(settingsDoc ?? EMPTY_VALUES));
  }, [reset, settingsDoc]);

  const handleResetToDefaults = useCallback(async () => {
    setFeedback(null);
    try {
      const result = await resetSettings();
      if (result?.settings) {
        seededFor.current = result.updatedAt ?? seededFor.current;
        reset(toFormValues(result.settings));
      }
      setIsResetOpen(false);
      setFeedback({ tone: 'success', title: copy.admin.states.savedTitle });
    } catch (error) {
      setIsResetOpen(false);
      setFeedback({
        tone: 'danger',
        title: copy.admin.states.errorTitle,
        description: error?.message || copy.errors.generic,
      });
    }
  }, [reset, resetSettings]);

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
          <Skeleton key={index} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <PageHeader
        title={copy.admin.settings.title}
        description={copy.admin.settings.subtitle}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              leftIcon={RotateCcw}
              isLoading={isResetting}
              onClick={() => setIsResetOpen(true)}
            >
              {copy.admin.settings.reset}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={Undo2}
              disabled={!isDirty || isSubmitting}
              onClick={handleDiscard}
            >
              {copy.admin.settings.discard}
            </Button>
            <Button size="sm" type="submit" leftIcon={Save} isLoading={isSubmitting}>
              {isSubmitting ? copy.admin.settings.saving : copy.admin.settings.save}
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          {updatedAt ? (
            <p className="text-2xs text-ink-subtle">
              {copy.admin.settings.savedAt}: {relativeTime(updatedAt)}
            </p>
          ) : null}
          {isDirty ? (
            <span className="text-2xs font-medium text-warning">
              {copy.admin.settings.unsaved}
            </span>
          ) : null}
        </div>
      </PageHeader>

      {feedback ? (
        <StatusBanner
          tone={feedback.tone}
          title={feedback.title}
          description={feedback.description}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      <SectionCard title={copy.admin.settings.groups.site}>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <FormField
            label={copy.admin.settings.fields.name}
            error={errors.site?.name?.message}
            {...register('site.name')}
          />
          <FormField
            label={copy.admin.settings.fields.shortName}
            error={errors.site?.shortName?.message}
            {...register('site.shortName')}
          />
          <FormField
            label={copy.admin.settings.fields.initials}
            error={errors.site?.initials?.message}
            {...register('site.initials')}
          />
          <FormField
            label={copy.admin.settings.fields.tagline}
            error={errors.site?.tagline?.message}
            {...register('site.tagline')}
          />
          <AccentField control={control} setValue={setValue} error={errors.site?.accentColor?.message} />
          <FormField
            label={copy.admin.settings.fields.logoUrl}
            hint={copy.admin.settings.fields.logoUrlHint}
            error={errors.site?.logoUrl?.message}
            {...register('site.logoUrl')}
          />
        </div>
      </SectionCard>

      <SectionCard title={copy.admin.settings.groups.hero}>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <FormField
            label={copy.admin.settings.fields.eyebrow}
            error={errors.hero?.eyebrow?.message}
            {...register('hero.eyebrow')}
          />
          <FormField
            label={copy.admin.settings.fields.headline}
            error={errors.hero?.headline?.message}
            {...register('hero.headline')}
          />
          <FormField
            className="sm:col-span-2"
            label={copy.admin.settings.fields.summary}
            as="textarea"
            rows={4}
            error={errors.hero?.summary?.message}
            {...register('hero.summary')}
          />
          <FormField
            label={copy.admin.settings.fields.summaryLabel}
            error={errors.hero?.summaryLabel?.message}
            {...register('hero.summaryLabel')}
          />
          <FormField
            label={copy.admin.settings.fields.suggestedTitle}
            error={errors.hero?.suggestedTitle?.message}
            {...register('hero.suggestedTitle')}
          />
          <FormField
            className="sm:col-span-2"
            label={copy.admin.settings.fields.suggestedSubtitle}
            error={errors.hero?.suggestedSubtitle?.message}
            {...register('hero.suggestedSubtitle')}
          />
        </div>

        <div className="mt-4 border-t border-line pt-3.5">
          <p className="text-2xs font-semibold uppercase tracking-wide text-ink-subtle">
            {copy.admin.settings.statLabelsTitle}
          </p>
          <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">
            {copy.admin.settings.statLabelsHint}
          </p>
          <div className="mt-2.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {STAT_LABELS.map((key) => (
              <FormField
                key={key}
                label={copy.admin.settings.fields[`stat${key[0].toUpperCase()}${key.slice(1)}`]}
                error={errors.hero?.statLabels?.[key]?.message}
                {...register(`hero.statLabels.${key}`)}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      <QuestionsEditor
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
        fieldArray={fieldArray}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={copy.admin.settings.groups.features}>
          <div className="divide-y divide-line">
            {FEATURE_FLAGS.map((flag) => (
              <SettingToggle
                key={flag}
                control={control}
                setValue={setValue}
                name={`features.${flag}`}
                label={copy.admin.settings.fields.features[flag]}
              />
            ))}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title={copy.admin.settings.groups.contact}>
            <div className="divide-y divide-line">
              {CONTACT_FLAGS.map((flag) => (
                <SettingToggle
                  key={flag}
                  control={control}
                  setValue={setValue}
                  name={`contact.${flag}`}
                  label={copy.admin.settings.fields[flag]}
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard title={copy.admin.settings.groups.footer}>
            <div className="space-y-3">
              <FormField
                label={copy.admin.settings.fields.footerText}
                as="textarea"
                rows={3}
                error={errors.footer?.text?.message}
                {...register('footer.text')}
              />
              <FormField
                label={copy.admin.settings.fields.footerDisclaimerText}
                hint={copy.admin.settings.fields.footerDisclaimerHint}
                as="textarea"
                rows={3}
                error={errors.footer?.disclaimerText?.message}
                {...register('footer.disclaimerText')}
              />
              <SettingToggle
                control={control}
                setValue={setValue}
                name="footer.showDisclaimer"
                label={copy.admin.settings.fields.showDisclaimer}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirm={handleResetToDefaults}
        isConfirming={isResetting}
        tone="danger"
        title={copy.admin.settings.resetConfirmTitle}
        body={copy.admin.settings.resetConfirmBody}
        confirmLabel={copy.admin.settings.resetConfirm}
      />
    </form>
  );
}
