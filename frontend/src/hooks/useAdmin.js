import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAdminConversation,
  extractAdminResume,
  fetchAdminConversation,
  fetchAdminConversations,
  fetchAdminProfile,
  fetchAdminSettings,
  fetchAuditLog,
  fetchDiagnostics,
  fetchStats,
  replaceAdminProfile,
  replaceAdminSettings,
  replaceProfileSection,
  resetAdminSettings,
} from '../services/adminService.js';
import { SETTINGS_QUERY_KEY } from '../context/SiteSettingsContext.jsx';

export const ADMIN_STATS_KEY = ['admin', 'stats'];
export const ADMIN_PROFILE_KEY = ['admin', 'profile'];
export const ADMIN_SETTINGS_KEY = ['admin', 'settings'];
export const ADMIN_DIAGNOSTICS_KEY = ['admin', 'diagnostics'];

/** Headline counters for the console dashboard. */
export function useAdminStats(options = {}) {
  return useQuery({
    queryKey: ADMIN_STATS_KEY,
    queryFn: ({ signal }) => fetchStats({ signal }),
    staleTime: 30 * 1000,
    ...options,
  });
}

/** The full candidate profile, as the console edits it. */
export function useAdminProfile(options = {}) {
  return useQuery({
    queryKey: ADMIN_PROFILE_KEY,
    queryFn: ({ signal }) => fetchAdminProfile({ signal }),
    staleTime: 30 * 1000,
    ...options,
  });
}

/** The full settings document, including the internal `ai` section. */
export function useAdminSettings(options = {}) {
  return useQuery({
    queryKey: ADMIN_SETTINGS_KEY,
    queryFn: ({ signal }) => fetchAdminSettings({ signal }),
    staleTime: 30 * 1000,
    ...options,
  });
}

/** A live probe of the AI service; only run on request. */
export function useAdminDiagnostics(options = {}) {
  return useQuery({
    queryKey: ADMIN_DIAGNOSTICS_KEY,
    queryFn: ({ signal }) => fetchDiagnostics({ signal }),
    staleTime: 0,
    ...options,
  });
}

/** One page of conversations, newest activity first. */
export function useAdminConversations(page, size, options = {}) {
  return useQuery({
    queryKey: ['admin', 'conversations', page, size],
    queryFn: ({ signal }) => fetchAdminConversations({ page, size }, { signal }),
    placeholderData: (previous) => previous,
    ...options,
  });
}

/** One conversation with its ordered messages. */
export function useAdminConversation(id, options = {}) {
  return useQuery({
    queryKey: ['admin', 'conversation', id],
    queryFn: ({ signal }) => fetchAdminConversation(id, { signal }),
    enabled: Boolean(id),
    ...options,
  });
}

/** One page of the administrative audit trail. */
export function useAuditLog(page, size, options = {}) {
  return useQuery({
    queryKey: ['admin', 'audit', page, size],
    queryFn: ({ signal }) => fetchAuditLog({ page, size }, { signal }),
    placeholderData: (previous) => previous,
    ...options,
  });
}

/**
 * Saves one profile section. The response carries the whole updated document,
 * so the console cache is seeded directly instead of being refetched.
 */
export function useSaveProfileSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ section, value }) => replaceProfileSection(section, value),
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_PROFILE_KEY, data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
    },
  });
}

/**
 * Saves the whole profile document. The response carries the whole updated
 * document, so the console cache is seeded directly instead of being refetched.
 */
export function useSaveProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profile) => replaceAdminProfile(profile),
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_PROFILE_KEY, data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
    },
  });
}

/** Extracts a resume draft. The upload is never persisted; only the draft returns. */
export function useExtractResume() {
  return useMutation({
    mutationFn: ({ file }) => extractAdminResume({ file }),
  });
}

/** Saves the settings document and refreshes the public site's copy of it. */
export function useSaveSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings) => replaceAdminSettings(settings),
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_SETTINGS_KEY, data);
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_DIAGNOSTICS_KEY });
    },
  });
}

/** Restores the bundled default settings. */
export function useResetSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resetAdminSettings(),
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_SETTINGS_KEY, data);
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_DIAGNOSTICS_KEY });
    },
  });
}

/** Removes a conversation and refreshes the surrounding listings. */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteAdminConversation(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['admin', 'conversation', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}
