import { apiRequest } from './httpClient.js';

/**
 * POST /job-match
 * Returns a JobMatchResult for the supplied job description.
 */
export async function matchJob({ jobDescription }, options = {}) {
  return apiRequest('/job-match', {
    ...options,
    method: 'POST',
    body: { jobDescription },
    timeout: 60000,
  });
}

export default matchJob;
