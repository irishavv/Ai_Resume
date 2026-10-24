const STORAGE_KEY = 'ai-portfolio-client-id';

let cachedClientId = null;

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for browsers without crypto.randomUUID.
  const random = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${random()}${random()}-${random()}-${random()}-${random()}-${random()}${random()}${random()}`;
}

function readStoredId() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

function persist(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage may be unavailable (private mode); the in-memory id still works */
  }
}

/**
 * Opaque per-browser identifier sent as the `X-Client-Id` header on every
 * request. Generated once and kept in localStorage.
 */
export function getClientId() {
  if (cachedClientId) return cachedClientId;

  const stored = readStoredId();
  if (stored) {
    cachedClientId = stored;
    return cachedClientId;
  }

  const generated = createId();
  cachedClientId = generated;
  persist(generated);
  return cachedClientId;
}

export default getClientId;
