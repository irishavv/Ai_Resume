import { FIELD_ORDER, fieldLabel, valueToText } from './resume.js';

const TEXT_FIELDS = new Set(['fullName', 'headline', 'summary', 'location', 'email', 'phone']);
const LINE_LIST_FIELDS = new Set(['currentlyLearning', 'achievements']);

function kindOf(key) {
  if (TEXT_FIELDS.has(key)) return 'text';
  if (LINE_LIST_FIELDS.has(key)) return 'lines';
  return 'json';
}

/** Stable, order-insensitive representation used to decide whether two drafts match. */
function normalize(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => (typeof item === 'string' ? item.trim() : item)));
  }
  if (typeof value === 'object') {
    return JSON.stringify(
      Object.entries(value)
        .filter(([, entry]) => entry != null && String(entry).trim() !== '')
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  }
  return String(value).trim();
}

function hasValue(container, key) {
  return key in container && normalize(container[key]) !== '';
}

/**
 * Compares two resume drafts field by field.
 *
 * @param {object} before draft extracted from the older resume
 * @param {object} after draft extracted from the newer resume
 * @returns `{ changes, summary }` where each change carries a `status` of
 *          `added`, `removed`, `changed` or `unchanged`.
 */
export function diffResumeDrafts(before, after) {
  const base = before && typeof before === 'object' ? before : {};
  const next = after && typeof after === 'object' ? after : {};

  const changes = FIELD_ORDER.filter((key) => key in base || key in next).map((key) => {
    const kind = kindOf(key);
    const beforeHas = hasValue(base, key);
    const afterHas = hasValue(next, key);

    let status = 'unchanged';
    if (afterHas && !beforeHas) status = 'added';
    else if (beforeHas && !afterHas) status = 'removed';
    else if (normalize(base[key]) !== normalize(next[key])) status = 'changed';

    return {
      key,
      label: fieldLabel(key),
      status,
      before: beforeHas ? valueToText(kind, base[key]) : '',
      after: afterHas ? valueToText(kind, next[key]) : '',
    };
  });

  const summary = changes.reduce(
    (acc, change) => {
      acc[change.status] += 1;
      return acc;
    },
    { added: 0, removed: 0, changed: 0, unchanged: 0 },
  );

  return { changes, summary };
}

export default diffResumeDrafts;
