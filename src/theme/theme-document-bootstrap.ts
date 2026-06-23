import {
  DARK_MODE_MEDIA_QUERY,
  DEFAULT_THEME_PREFERENCE,
  RESOLVED_THEME_ATTRIBUTE,
  THEME_ATTRIBUTE,
  THEME_PREFERENCE_VALUES,
  THEME_STORAGE_KEY,
} from './theme-manager.js';

export const buildThemeDocumentBootstrapScript = (): string =>
  `
(() => {
  const root = document.documentElement;
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  const themeAttribute = ${JSON.stringify(THEME_ATTRIBUTE)};
  const resolvedThemeAttribute = ${JSON.stringify(RESOLVED_THEME_ATTRIBUTE)};
  const themePreferenceValues = ${JSON.stringify(THEME_PREFERENCE_VALUES)};
  const defaultThemePreference = ${JSON.stringify(DEFAULT_THEME_PREFERENCE)};
  const darkModeMediaQuery = ${JSON.stringify(DARK_MODE_MEDIA_QUERY)};
  let preference = defaultThemePreference;

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (themePreferenceValues.some((value) => value === stored)) {
      preference = stored;
    }
  } catch {
    preference = defaultThemePreference;
  }

  const resolvedTheme = preference === defaultThemePreference
    ? (window.matchMedia(darkModeMediaQuery).matches ? 'dark' : 'light')
    : preference;

  root.setAttribute(themeAttribute, preference);
  root.setAttribute(resolvedThemeAttribute, resolvedTheme);
  root.style.colorScheme = preference === defaultThemePreference ? 'light dark' : preference;
})();
`.trim();
