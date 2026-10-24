const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Relative time such as "just now", "12m ago", "3d ago", falling back to a date. */
export function relativeTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'just now';
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
  if (diff < MONTH) return `${Math.floor(diff / WEEK)}w ago`;
  if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo ago`;
  return formatDate(date);
}

/** Short absolute date, e.g. "16 Oct 2026". */
export function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** "2025-06" or "2025-06-01" -> "Jun 2025". Passes through anything else. */
export function formatMonthYear(value) {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})/.exec(String(value));
  if (!match) return String(value);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return String(value);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    date,
  );
}

/** "2025-06" + "2025-08" -> "Jun 2025 – Aug 2025"; a missing end becomes "Present". */
export function formatDateRange(start, end, presentLabel = 'Present') {
  const from = formatMonthYear(start);
  const to = end ? formatMonthYear(end) : presentLabel;
  if (!from && to === presentLabel) return presentLabel;
  if (!from) return to;
  return `${from} – ${to}`;
}

/** Up to two initials from a name, e.g. "Rishav Kumar" -> "RK". */
export function initials(name, fallback = 'AI') {
  if (!name || typeof name !== 'string') return fallback;
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => /[A-Za-z0-9]/.test(part[0]));

  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Pluralise a noun without pulling in a dependency. */
export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural || `${singular}s`;
}

/** "3 skills" */
export function countLabel(count, singular, plural) {
  return `${count} ${pluralize(count, singular, plural)}`;
}

/**
 * Maps a 0-100 suitability score to a display band.
 * `tone` matches the Badge tone tokens.
 */
export function scoreBand(score) {
  const value = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Number(score))) : 0;
  if (value >= 85) return { key: 'exceptional', label: 'Exceptional match', tone: 'success' };
  if (value >= 70) return { key: 'strong', label: 'Strong match', tone: 'success' };
  if (value >= 55) return { key: 'moderate', label: 'Moderate match', tone: 'primary' };
  if (value >= 40) return { key: 'partial', label: 'Partial match', tone: 'warning' };
  return { key: 'limited', label: 'Limited match', tone: 'danger' };
}

/** Rough conversational title derived from the first question asked. */
export function deriveTitle(text, maxLength = 60) {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Untitled conversation';
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Clamp a number into an inclusive range. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Safe external link props for anchors. */
export const externalLinkProps = {
  target: '_blank',
  rel: 'noopener noreferrer',
};
