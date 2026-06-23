export const THEME_STORAGE_KEY = 'rouault-theme-preference';
export const THEME_ATTRIBUTE = 'data-theme';
export const RESOLVED_THEME_ATTRIBUTE = 'data-resolved-theme';
export const THEME_CHANGE_EVENT = 'rouault-theme-change';
export const THEME_PREFERENCE_VALUES = ['light', 'dark', 'system'] as const;
export const RESOLVED_THEME_VALUES = ['light', 'dark'] as const;
export const DEFAULT_THEME_PREFERENCE = 'system';
export const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export type ThemePreference = (typeof THEME_PREFERENCE_VALUES)[number];
export type ResolvedTheme = (typeof RESOLVED_THEME_VALUES)[number];

export interface ThemeChangeDetail {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
}

interface ThemeMediaQueryLike {
  matches: boolean;
  addEventListener?: (type: 'change', listener: EventListenerOrEventListenerObject) => void;
}

interface ApplyThemeOptions {
  root?: HTMLElement | null;
  storage?: Storage | null;
  mediaQueryList?: ThemeMediaQueryLike | null;
  persist?: boolean;
  emit?: boolean;
}

let themeBootstrapInitialized = false;

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === 'string' &&
    THEME_PREFERENCE_VALUES.some((preference) => preference === value)
  );
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

function getDefaultRoot(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.documentElement;
}

function getDefaultStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getDefaultMediaQueryList(): ThemeMediaQueryLike | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  return window.matchMedia(DARK_MODE_MEDIA_QUERY);
}

export function readStoredThemePreference(
  storage: Storage | null = getDefaultStorage(),
): ThemePreference {
  if (storage === null) {
    return DEFAULT_THEME_PREFERENCE;
  }

  try {
    return normalizeThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function readAppliedThemePreference(
  root: HTMLElement | null = getDefaultRoot(),
): ThemePreference {
  return normalizeThemePreference(root?.getAttribute(THEME_ATTRIBUTE));
}

export function resolveThemePreference(
  preference: ThemePreference,
  mediaQueryList: ThemeMediaQueryLike | null = getDefaultMediaQueryList(),
): ResolvedTheme {
  if (preference === DEFAULT_THEME_PREFERENCE) {
    return mediaQueryList?.matches === true ? 'dark' : 'light';
  }

  return preference;
}

export function applyThemePreference(
  preference: ThemePreference,
  options: ApplyThemeOptions = {},
): ThemeChangeDetail {
  const normalizedPreference = normalizeThemePreference(preference);
  const root = options.root ?? getDefaultRoot();
  const storage = options.storage ?? getDefaultStorage();
  const mediaQueryList = options.mediaQueryList ?? getDefaultMediaQueryList();
  const resolvedTheme = resolveThemePreference(normalizedPreference, mediaQueryList);
  const persist = options.persist ?? true;
  const emit = options.emit ?? true;

  if (persist && storage !== null) {
    try {
      storage.setItem(THEME_STORAGE_KEY, normalizedPreference);
    } catch {
      /* localStorage へ書き込めない環境では黙って無視する */
    }
  }

  if (root !== null) {
    root.setAttribute(THEME_ATTRIBUTE, normalizedPreference);
    root.setAttribute(RESOLVED_THEME_ATTRIBUTE, resolvedTheme);
    root.style.colorScheme =
      normalizedPreference === DEFAULT_THEME_PREFERENCE ? 'light dark' : normalizedPreference;
  }

  const detail: ThemeChangeDetail = {
    preference: normalizedPreference,
    resolvedTheme,
  };

  if (emit && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<ThemeChangeDetail>(THEME_CHANGE_EVENT, {
        detail,
      }),
    );
  }

  return detail;
}

export function initTheme(): void {
  if (themeBootstrapInitialized || typeof window === 'undefined') {
    return;
  }

  themeBootstrapInitialized = true;

  const mediaQueryList = getDefaultMediaQueryList();
  const applyStoredPreference = (emit: boolean): void => {
    applyThemePreference(readStoredThemePreference(), {
      mediaQueryList,
      emit,
      persist: false,
    });
  };

  applyStoredPreference(false);

  const handleMediaQueryChange = (): void => {
    if (readStoredThemePreference() !== DEFAULT_THEME_PREFERENCE) {
      return;
    }

    applyStoredPreference(true);
  };

  const handleStorage = (event: StorageEvent): void => {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }

    applyStoredPreference(true);
  };

  mediaQueryList?.addEventListener?.('change', handleMediaQueryChange);
  window.addEventListener('storage', handleStorage);
}
