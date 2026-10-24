import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ai-portfolio-language';

/** Languages the assistant can answer and generate questions in. */
export const SUPPORTED_LANGUAGES = ['en', 'hi'];
export const DEFAULT_LANGUAGE = 'en';

let currentLanguage = null;
const listeners = new Set();

function readStoredLanguage() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(value) ? value : null;
  } catch {
    return null;
  }
}

export function getLanguageSnapshot() {
  if (currentLanguage === null) {
    currentLanguage = readStoredLanguage() ?? DEFAULT_LANGUAGE;
  }
  return currentLanguage;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setGlobalLanguage(language) {
  const next = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  if (next === getLanguageSnapshot()) return;
  currentLanguage = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage may be unavailable; the in-memory preference still applies */
  }
  listeners.forEach((listener) => listener());
}

/**
 * Answer language shared across the app (the chat composer stays in sync).
 * Persisted in localStorage so the choice survives a reload.
 */
export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getLanguageSnapshot, () => DEFAULT_LANGUAGE);
  const setLanguage = useCallback((next) => setGlobalLanguage(next), []);
  return { language, setLanguage };
}

export default useLanguage;
