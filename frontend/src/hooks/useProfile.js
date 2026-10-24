import { useQuery } from '@tanstack/react-query';
import { getProfile } from '../services/profileService.js';

export const PROFILE_QUERY_KEY = ['profile'];

/**
 * Loads the single candidate profile. Cached for five minutes because the
 * profile changes far less often than the conversation it describes.
 */
export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: ({ signal }) => getProfile({ signal }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export default useProfile;
