import { useCallback, useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ai-portfolio-theme';

let currentTheme = null;
const listeners = new Set();

function readStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function getThemeSnapshot() {
  if (currentTheme === null) {
    currentTheme = readStoredTheme() ?? getSystemTheme();
  }
  return currentTheme;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

function setGlobalTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  currentTheme = next;
  applyTheme(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage may be unavailable; the in-memory preference still applies */
  }
  notify();
}

// Follow the OS preference only while the user has not chosen explicitly.
if (typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (readStoredTheme()) return;
    currentTheme = getSystemTheme();
    applyTheme(currentTheme);
    notify();
  };
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onSystemChange);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(onSystemChange);
  }
}

/**
 * Theme state shared across the app (sidebar toggle and top bar toggle stay in sync).
 * Defaults to the stored preference, otherwise the system preference.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => 'light');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next) => setGlobalTheme(next), []);
  const toggleTheme = useCallback(() => {
    setGlobalTheme(getThemeSnapshot() === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, isDark: theme === 'dark', setTheme, toggleTheme };
}

export default useTheme;
