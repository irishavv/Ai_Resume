import { apiRequest } from './httpClient.js';

/**
 * GET /settings — the public site settings.
 *
 * Returns `{ settings, updatedAt }`. The backend strips the internal `ai`
 * section, so this document only ever contains what the public site renders.
 */
export async function getPublicSettings(options = {}) {
  const payload = await apiRequest('/settings', options);
  return {
    settings: payload?.settings ?? null,
    updatedAt: payload?.updatedAt ?? null,
  };
}

export default getPublicSettings;
