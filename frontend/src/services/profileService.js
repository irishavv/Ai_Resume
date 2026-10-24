import { apiRequest } from './httpClient.js';

/**
 * GET /profile
 * Returns `{ profile, updatedAt }` for the single candidate profile.
 */
export async function getProfile(options = {}) {
  const payload = await apiRequest('/profile', options);
  return {
    profile: payload?.profile ?? null,
    updatedAt: payload?.updatedAt ?? null,
  };
}

export default getProfile;
