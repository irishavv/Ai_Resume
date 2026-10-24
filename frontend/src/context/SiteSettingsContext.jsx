import { createContext, useContext, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicSettings } from '../services/settingsService.js';
import { defaultSettings } from '../constants/defaultSettings.js';
import { mergeDeep } from '../lib/mergeDeep.js';
import { applyAccentColor } from '../lib/accent.js';

export const SETTINGS_QUERY_KEY = ['settings'];

const SiteSettingsContext = createContext(null);

/**
 * Loads the site settings the operator edits in the console and makes them
 * available to the public UI.
 *
 * The request result is merged over the bundled defaults, so a section the
 * backend has not been given yet still renders complete copy, and the accent
 * colour is applied to the primary palette.
 */
export function SiteSettingsProvider({ children }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: ({ signal }) => getPublicSettings({ signal }),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const settings = useMemo(
    () => mergeDeep(defaultSettings, data?.settings ?? null),
    [data],
  );

  useEffect(() => {
    applyAccentColor(settings.site?.accentColor);
  }, [settings.site?.accentColor]);

  useEffect(() => {
    const name = settings.site?.name?.trim();
    if (name) document.title = name;
  }, [settings.site?.name]);

  const value = useMemo(
    () => ({
      settings,
      updatedAt: data?.updatedAt ?? null,
      isLoadedFromBackend: Boolean(data?.settings),
      isLoading,
      isError,
      refetch,
    }),
    [data?.settings, data?.updatedAt, isError, isLoading, refetch, settings],
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

/** The site settings, falling back to the bundled defaults before they load. */
export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error('useSiteSettings must be used inside a SiteSettingsProvider.');
  }
  return context;
}

export default SiteSettingsContext;
