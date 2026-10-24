import { copy } from '../constants/copy.js';

export const RESUME_ACCEPT = 'application/pdf,.pdf';
export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
/** Resume extraction calls the LLM, so it is allowed to run longer than a CRUD request. */
export const RESUME_EXTRACT_TIMEOUT_MS = 90000;

const PDF_MIME = 'application/pdf';

/**
 * Keys the AI service may return in a draft, in the order the review screen
 * should present them. Anything else the service returns is ignored.
 */
export const FIELD_ORDER = [
  'fullName',
  'headline',
  'summary',
  'location',
  'email',
  'phone',
  'skills',
  'currentlyLearning',
  'projects',
  'experience',
  'education',
  'achievements',
  'certifications',
  'codingProfiles',
  'links',
  'careerInterests',
];

const FIELD_LABELS = {
  fullName: 'Full name',
  headline: 'Headline',
  summary: 'Summary',
  location: 'Location',
  email: 'Email',
  phone: 'Phone',
  skills: 'Skills',
  currentlyLearning: 'Currently learning',
  projects: 'Projects',
  experience: 'Experience',
  education: 'Education',
  achievements: 'Achievements',
  certifications: 'Certifications',
  codingProfiles: 'Coding profiles',
  links: 'Links',
  careerInterests: 'Career interests',
};

/** Single-line text fields. */
const TEXT_FIELDS = new Set(['fullName', 'headline', 'summary', 'location', 'email', 'phone']);
/** Arrays of plain strings, edited one entry per line. */
const LINE_LIST_FIELDS = new Set(['currentlyLearning', 'achievements']);

/** Objects merged key-by-key so an applied draft never drops existing entries. */
const MERGED_OBJECT_FIELDS = new Set(['skills', 'links', 'careerInterests']);

/** "1.2 MB" / "820 KB" / "512 B" */
export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Client-side pre-flight check. The backend and the AI service repeat every one
 * of these checks; failing fast here only avoids a pointless round trip.
 *
 * @returns an error message, or `null` when the file is acceptable.
 */
export function validateResumeFile(file) {
  if (!file) return copy.validation.resumeRequired;

  const name = String(file.name || '').toLowerCase();
  const type = String(file.type || '').toLowerCase();
  const isPdf = name.endsWith('.pdf') && (type === '' || type === PDF_MIME);
  if (!isPdf) return copy.validation.resumeType;

  if (Number(file.size) > RESUME_MAX_BYTES) return copy.validation.resumeTooLarge;

  return null;
}

/** Normalises an upload so the multipart part always carries the PDF content type. */
export function toPdfUpload(file) {
  if (!file || file.type === PDF_MIME) return file;
  return new File([file], file.name, { type: PDF_MIME });
}

function fieldKind(key) {
  if (TEXT_FIELDS.has(key)) return 'text';
  if (LINE_LIST_FIELDS.has(key)) return 'lines';
  return 'json';
}

export function fieldLabel(key) {
  return FIELD_LABELS[key] || key;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Renders a raw draft value into the string an editor control should show. */
export function valueToText(kind, value) {
  if (kind === 'lines') {
    return Array.isArray(value) ? value.map((item) => String(item)).join('\n') : String(value ?? '');
  }
  if (kind === 'json') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '';
    }
  }
  return value == null ? '' : String(value);
}

/**
 * Converts an extraction draft into the editable field list the review screen
 * renders. Keys outside {@link FIELD_ORDER} and empty values are dropped.
 */
export function buildDraftFields(draft) {
  if (!isPlainObject(draft)) return [];

  return FIELD_ORDER.filter((key) => {
    const value = draft[key];
    if (value == null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return isPlainObject(value) && Object.keys(value).length > 0;
  }).map((key) => {
    const kind = fieldKind(key);
    return {
      key,
      label: fieldLabel(key),
      kind,
      text: valueToText(kind, draft[key]),
      include: true,
    };
  });
}

/** Parses one field's editor text back into a JSON value. */
function textToValue(kind, text) {
  if (kind === 'text') return String(text ?? '').trim();
  if (kind === 'lines') {
    return String(text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return JSON.parse(String(text ?? ''));
}

/**
 * Parses the reviewed fields.
 *
 * @returns `{ values, invalidKeys }` where `values` only contains the fields the
 *          operator kept, and `invalidKeys` lists JSON fields that could not be
 *          parsed (they are reported inline and never applied).
 */
export function compileDraftFields(fields) {
  const values = {};
  const invalidKeys = [];

  for (const field of fields) {
    if (!field.include) continue;
    try {
      const value = textToValue(field.kind, field.text);
      if (field.kind === 'json' && !value) continue;
      if (field.kind === 'lines' && value.length === 0) continue;
      if (field.kind === 'text' && !value) continue;
      values[field.key] = value;
    } catch {
      invalidKeys.push(field.key);
    }
  }

  return { values, invalidKeys };
}

/**
 * Applies a confirmed draft to the current profile.
 *
 * <p>Scalars and collections replace their profile counterparts; `skills`,
 * `links` and `careerInterests` are merged key-by-key so applying a partial
 * extraction never deletes data the candidate already had.</p>
 *
 * @returns `{ profile, appliedKeys }`
 */
export function mergeDraftIntoProfile(profile, draft) {
  const base = isPlainObject(profile) ? { ...profile } : {};
  const appliedKeys = [];

  for (const key of FIELD_ORDER) {
    if (!(key in draft)) continue;
    const value = draft[key];

    if (MERGED_OBJECT_FIELDS.has(key) && isPlainObject(base[key]) && isPlainObject(value)) {
      base[key] = { ...base[key], ...value };
    } else {
      base[key] = value;
    }
    appliedKeys.push(key);
  }

  return { profile: base, appliedKeys };
}
