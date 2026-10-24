import { useCallback, useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import PageHeader from '../../components/admin/PageHeader.jsx';
import SectionCard from '../../components/admin/SectionCard.jsx';
import FormField from '../../components/admin/FormField.jsx';
import ToggleRow from '../../components/admin/ToggleRow.jsx';
import StatusBanner from '../../components/admin/StatusBanner.jsx';
import Button from '../../components/common/Button.jsx';
import Skeleton from '../../components/common/Skeleton.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useAdminProfile, useSaveProfile, useSaveProfileSection } from '../../hooks/useAdmin.js';
import { relativeTime } from '../../lib/format.js';
import { copy } from '../../constants/copy.js';

/** The compact scalar sections, laid out two per row. */
const TEXT_SECTIONS = ['fullName', 'headline', 'email', 'phone', 'location'];

/**
 * Every remaining top level key the backend lets the console replace on its
 * own, together with the editor it needs.
 */
const SECTION_EDITORS = [
  { key: 'summary', kind: 'textarea' },
  { key: 'education', kind: 'json' },
  { key: 'skills', kind: 'json' },
  { key: 'currentlyLearning', kind: 'list' },
  { key: 'projects', kind: 'json' },
  { key: 'experience', kind: 'json' },
  { key: 'achievements', kind: 'list' },
  { key: 'certifications', kind: 'json' },
  { key: 'codingProfiles', kind: 'json' },
  { key: 'links', kind: 'json' },
  { key: 'careerInterests', kind: 'json' },
];

function toDraft(kind, value) {
  if (kind === 'boolean') return Boolean(value);
  if (kind === 'list') return Array.isArray(value) ? value.join('\n') : '';
  if (kind === 'json') {
    return value === undefined || value === null ? '' : JSON.stringify(value, null, 2);
  }
  if (typeof value === 'string') return value;
  return value === undefined || value === null ? '' : String(value);
}

function fromDraft(kind, draft) {
  if (kind === 'boolean') return Boolean(draft);
  if (kind === 'list') {
    return draft
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (kind === 'json') {
    const trimmed = draft.trim();
    return trimmed ? JSON.parse(trimmed) : null;
  }
  return draft;
}

function hintFor(kind) {
  if (kind === 'list') return copy.admin.profile.listHint;
  if (kind === 'json') return copy.admin.profile.jsonHint;
  return undefined;
}

/**
 * One editable profile section. The draft is local, the save goes to the
 * section endpoint, and the card reports its own outcome so a failure in one
 * section cannot be mistaken for a failure of the whole document.
 */
function ProfileSectionCard({ section, kind, label, hint, value, saveSection, className = '' }) {
  const initial = useMemo(() => toDraft(kind, value), [kind, value]);
  const [draft, setDraft] = useState(initial);
  const [localError, setLocalError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = draft !== initial;

  const handleChange = useCallback((next) => {
    setDraft(next);
    setLocalError(null);
    setFeedback(null);
  }, []);

  const handleSave = useCallback(async () => {
    setLocalError(null);
    setFeedback(null);

    let payload;
    try {
      payload = fromDraft(kind, draft);
    } catch {
      setLocalError(copy.admin.profile.jsonInvalid);
      return;
    }

    setIsSaving(true);
    try {
      await saveSection({ section, value: payload });
      setFeedback({ tone: 'success', title: copy.admin.states.savedTitle });
    } catch (error) {
      setFeedback({
        tone: 'danger',
        title: copy.admin.states.errorTitle,
        description: error?.message || copy.errors.generic,
      });
    } finally {
      setIsSaving(false);
    }
  }, [draft, kind, saveSection, section]);

  const footer = (
    <>
      {isDirty ? (
        <span className="mr-auto text-2xs font-medium text-warning">
          {copy.admin.profile.unsaved}
        </span>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        leftIcon={RotateCcw}
        disabled={!isDirty || isSaving}
        onClick={() => handleChange(initial)}
      >
        {copy.admin.profile.resetSection}
      </Button>
      <Button
        size="sm"
        leftIcon={Save}
        disabled={!isDirty}
        isLoading={isSaving}
        onClick={handleSave}
      >
        {isSaving ? copy.admin.profile.saving : copy.admin.profile.saveSection}
      </Button>
    </>
  );

  return (
    <SectionCard
      className={className}
      title={label}
      footer={footer}
      bodyClassName="space-y-3 pt-3.5"
    >
      {kind === 'boolean' ? (
        <ToggleRow
          id={`section-${section}`}
          label={label}
          hint={hint}
          checked={draft}
          onChange={handleChange}
        />
      ) : (
        <FormField
          id={`section-${section}`}
          label={label}
          hint={hint}
          as={kind === 'text' ? 'input' : 'textarea'}
          rows={kind === 'json' ? 10 : 4}
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
          className={kind === 'json' ? 'font-mono text-xs' : undefined}
          error={localError}
        />
      )}

      {feedback ? (
        <StatusBanner
          tone={feedback.tone}
          title={feedback.title}
          description={feedback.description}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}
    </SectionCard>
  );
}

/** The advanced whole-document editor. */
function RawProfileCard({ profile, saveProfile, onSaved }) {
  const initial = useMemo(
    () => (profile === null ? '' : JSON.stringify(profile, null, 2)),
    [profile],
  );
  const [draft, setDraft] = useState(initial);
  const [localError, setLocalError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = draft !== initial;

  const handleSave = useCallback(async () => {
    setLocalError(null);
    setFeedback(null);

    let parsed;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setLocalError(copy.admin.profile.jsonInvalid);
      return;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setLocalError(copy.admin.profile.jsonInvalid);
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveProfile(parsed);
      if (result?.profile) setDraft(JSON.stringify(result.profile, null, 2));
      setFeedback({ tone: 'success', title: copy.admin.states.savedTitle });
      onSaved();
    } catch (error) {
      setFeedback({
        tone: 'danger',
        title: copy.admin.states.errorTitle,
        description: error?.message || copy.errors.generic,
      });
    } finally {
      setIsSaving(false);
    }
  }, [draft, onSaved, saveProfile]);

  return (
    <SectionCard
      title={copy.admin.profile.rawTitle}
      description={copy.admin.profile.rawBody}
      footer={
        <>
          {isDirty ? (
            <span className="mr-auto text-2xs font-medium text-warning">
              {copy.admin.profile.unsaved}
            </span>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            leftIcon={RotateCcw}
            disabled={!isDirty || isSaving}
            onClick={() => {
              setDraft(initial);
              setLocalError(null);
              setFeedback(null);
            }}
          >
            {copy.admin.profile.resetSection}
          </Button>
          <Button
            size="sm"
            leftIcon={Save}
            disabled={!isDirty}
            isLoading={isSaving}
            onClick={handleSave}
          >
            {isSaving ? copy.admin.profile.saving : copy.admin.profile.saveAll}
          </Button>
        </>
      }
    >
      <FormField
        id="raw-profile"
        label={copy.admin.profile.rawField}
        as="textarea"
        rows={18}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setLocalError(null);
          setFeedback(null);
        }}
        className="font-mono text-xs"
        error={localError}
      />
      {feedback ? (
        <StatusBanner
          className="mt-3"
          tone={feedback.tone}
          title={feedback.title}
          description={feedback.description}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}
    </SectionCard>
  );
}

/** The console profile editor: one card per editable profile section. */
export default function AdminProfilePage() {
  const { data, isLoading, isError, refetch } = useAdminProfile();
  const { mutateAsync: saveSection } = useSaveProfileSection();
  const { mutateAsync: saveProfile } = useSaveProfile();

  // A whole-document save replaces every section, so the per-section cards are
  // remounted afterwards to pick up the new values.
  const [version, setVersion] = useState(0);
  const handleDocumentSaved = useCallback(() => setVersion((current) => current + 1), []);

  const profile = data?.profile ?? null;
  const updatedAt = data?.updatedAt ?? null;

  return (
    <div className="space-y-5">
      <PageHeader title={copy.admin.profile.title} description={copy.admin.profile.subtitle}>
        {updatedAt ? (
          <p className="text-2xs text-ink-subtle">
            {copy.admin.profile.savedAt}: {relativeTime(updatedAt)}
          </p>
        ) : null}
      </PageHeader>

      {isError ? (
        <ErrorState
          title={copy.states.profileErrorTitle}
          description={copy.states.profileErrorBody}
          onRetry={refetch}
        />
      ) : isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {TEXT_SECTIONS.map((section) => (
              <ProfileSectionCard
                key={`${section}-${version}`}
                section={section}
                kind="text"
                label={copy.admin.profile.sections[section]}
                value={profile?.[section]}
                saveSection={saveSection}
              />
            ))}
            <ProfileSectionCard
              key={`sampleData-${version}`}
              section="sampleData"
              kind="boolean"
              label={copy.admin.profile.sections.sampleData}
              hint={copy.admin.profile.sampleDataHint}
              value={profile?.sampleData}
              saveSection={saveSection}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {SECTION_EDITORS.map(({ key, kind }) => (
              <ProfileSectionCard
                key={`${key}-${version}`}
                section={key}
                kind={kind}
                label={copy.admin.profile.sections[key]}
                hint={hintFor(kind)}
                value={profile?.[key]}
                saveSection={saveSection}
                className={kind === 'json' ? 'lg:col-span-2' : ''}
              />
            ))}
          </div>

          <RawProfileCard
            profile={profile}
            saveProfile={saveProfile}
            onSaved={handleDocumentSaved}
          />
        </>
      )}
    </div>
  );
}
