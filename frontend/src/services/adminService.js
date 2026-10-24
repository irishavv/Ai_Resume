import { apiRequest, apiUpload } from './httpClient.js';
import { clearAdminToken, getAdminToken, setAdminToken } from '../lib/adminToken.js';
import { RESUME_EXTRACT_TIMEOUT_MS, toPdfUpload } from '../lib/resume.js';

/**
 * The console API. Every call except `login` carries the operator session as an
 * `Authorization: Bearer <token>` header; a 401 therefore means the session has
 * ended and the caller should send the operator back to the sign-in screen.
 */

let unauthorizedHandler = null;

/**
 * Registers the single callback invoked when the backend rejects the session
 * (an expired token, or one revoked in another tab). The provider uses it to
 * drop the token and move the console back to the sign-in screen.
 */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function authHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** A rejected session is dropped and surfaced once, whatever the request shape. */
function failSession(error) {
  if (error?.status === 401) {
    clearAdminToken();
    unauthorizedHandler?.();
  }
  throw error;
}

async function adminRequest(path, options = {}) {
  try {
    return await apiRequest(path, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers ?? {}) },
    });
  } catch (error) {
    return failSession(error);
  }
}

async function adminUpload(path, formData, options = {}) {
  try {
    return await apiUpload(path, formData, {
      ...options,
      headers: { ...authHeaders(), ...(options.headers ?? {}) },
    });
  } catch (error) {
    return failSession(error);
  }
}

// ------------------------------------------------------------------ session

/** POST /api/admin/session — exchanges credentials for a session token. */
export async function login({ username, password }, options = {}) {
  const payload = await apiRequest('/admin/session', {
    ...options,
    method: 'POST',
    body: { username, password },
  });
  setAdminToken(payload?.token ?? '');
  return {
    username: payload?.username ?? '',
    expiresAt: payload?.expiresAt ?? null,
  };
}

/** GET /api/admin/session — the operator behind the current token. */
export async function fetchSession(options = {}) {
  const payload = await adminRequest('/admin/session', options);
  return {
    username: payload?.username ?? '',
    expiresAt: payload?.expiresAt ?? null,
  };
}

/** DELETE /api/admin/session — revokes the session server side. */
export async function logout(options = {}) {
  try {
    await adminRequest('/admin/session', { ...options, method: 'DELETE' });
  } finally {
    clearAdminToken();
  }
}

// ------------------------------------------------------------------ dashboard

/** GET /api/admin/stats */
export function fetchStats(options = {}) {
  return adminRequest('/admin/stats', options);
}

/** GET /api/admin/ai/diagnostics */
export function fetchDiagnostics(options = {}) {
  return adminRequest('/admin/ai/diagnostics', options);
}

// ------------------------------------------------------------------ resume

/**
 * POST /api/admin/resume/extract — uploads a PDF and returns the extraction
 * draft. The file is validated on the backend, proxied to the AI service and
 * never persisted.
 *
 * @returns `{ draft, detectedSections, warnings, sourceFileName, extractedCharacters, verified }`
 */
export async function extractAdminResume({ file, signal }) {
  const formData = new FormData();
  formData.append('file', toPdfUpload(file), file.name);

  return adminUpload('/admin/resume/extract', formData, {
    signal,
    timeout: RESUME_EXTRACT_TIMEOUT_MS,
  });
}

// ------------------------------------------------------------------ profile

/** GET /api/admin/profile */
export async function fetchAdminProfile(options = {}) {
  const payload = await adminRequest('/admin/profile', options);
  return {
    profile: payload?.profile ?? null,
    updatedAt: payload?.updatedAt ?? null,
  };
}

/** PUT /api/admin/profile — replaces the whole document. */
export async function replaceAdminProfile(profile, options = {}) {
  const payload = await adminRequest('/admin/profile', {
    ...options,
    method: 'PUT',
    body: profile,
  });
  return {
    profile: payload?.profile ?? null,
    updatedAt: payload?.updatedAt ?? null,
  };
}

/** PUT /api/admin/profile/sections/{section} — replaces one top level section. */
export async function replaceProfileSection(section, value, options = {}) {
  const payload = await adminRequest(`/admin/profile/sections/${encodeURIComponent(section)}`, {
    ...options,
    method: 'PUT',
    body: value,
  });
  return {
    profile: payload?.profile ?? null,
    updatedAt: payload?.updatedAt ?? null,
  };
}

// ------------------------------------------------------------------ settings

/** GET /api/admin/settings — the full document, including the internal `ai` section. */
export async function fetchAdminSettings(options = {}) {
  const payload = await adminRequest('/admin/settings', options);
  return {
    settings: payload?.settings ?? null,
    updatedAt: payload?.updatedAt ?? null,
  };
}

/** PUT /api/admin/settings */
export async function replaceAdminSettings(settings, options = {}) {
  const payload = await adminRequest('/admin/settings', {
    ...options,
    method: 'PUT',
    body: settings,
  });
  return {
    settings: payload?.settings ?? null,
    updatedAt: payload?.updatedAt ?? null,
  };
}

/** POST /api/admin/settings/reset — restores the bundled defaults. */
export async function resetAdminSettings(options = {}) {
  const payload = await adminRequest('/admin/settings/reset', { ...options, method: 'POST' });
  return {
    settings: payload?.settings ?? null,
    updatedAt: payload?.updatedAt ?? null,
  };
}

// ------------------------------------------------------------------ conversations

/** GET /api/admin/conversations — one page, newest activity first. */
export function fetchAdminConversations({ page = 0, size = 20 } = {}, options = {}) {
  return adminRequest(`/admin/conversations?page=${page}&size=${size}`, options);
}

/** GET /api/admin/conversations/{id} — the conversation with its messages. */
export function fetchAdminConversation(id, options = {}) {
  return adminRequest(`/admin/conversations/${id}`, options);
}

/** DELETE /api/admin/conversations/{id} */
export function deleteAdminConversation(id, options = {}) {
  return adminRequest(`/admin/conversations/${id}`, { ...options, method: 'DELETE' });
}

// ------------------------------------------------------------------ audit

/** GET /api/admin/audit — one page of the administrative trail. */
export function fetchAuditLog({ page = 0, size = 20 } = {}, options = {}) {
  return adminRequest(`/admin/audit?page=${page}&size=${size}`, options);
}
