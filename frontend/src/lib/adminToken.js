const STORAGE_KEY = 'ai-portfolio-admin-token';

let cachedToken = null;
let hasLoaded = false;

function readStoredToken() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    /* storage may be unavailable (private mode); the in-memory token still works */
    return '';
  }
}

function persist(value) {
  try {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, value);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* see readStoredToken */
  }
}

/**
 * The operator session token issued by `POST /api/admin/session`.
 *
 * It is never part of the build: the console receives it once at sign-in and
 * keeps it in sessionStorage for the current tab only. It is sent as the
 * `Authorization: Bearer <token>` header on every console request.
 */
export function getAdminToken() {
  if (!hasLoaded) {
    cachedToken = readStoredToken();
    hasLoaded = true;
  }
  return cachedToken;
}

export function setAdminToken(value) {
  cachedToken = String(value ?? '');
  hasLoaded = true;
  persist(cachedToken);
  return cachedToken;
}

export function clearAdminToken() {
  return setAdminToken('');
}

export default getAdminToken;
