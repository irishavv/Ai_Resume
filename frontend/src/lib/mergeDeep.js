/** Deep merge for plain objects; arrays and scalars are replaced outright. */
export function mergeDeep(base, override) {
  if (override === undefined || override === null) return base;
  if (Array.isArray(override) || typeof override !== 'object') return override;
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return override;

  const merged = { ...base };
  Object.keys(override).forEach((key) => {
    merged[key] = mergeDeep(base[key], override[key]);
  });
  return merged;
}

export default mergeDeep;
