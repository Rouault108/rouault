export const THEME_STORAGE_KEY = 'rouault-theme-preference';
export const THEME_ATTRIBUTE = 'data-theme';
export const RESOLVED_THEME_ATTRIBUTE = 'data-resolved-theme';
export const THEME_CHANGE_EVENT = 'rouault-theme-change';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

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

const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

let themeBootstrapInitialized = false;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : 'system';
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
    return 'system';
  }

  try {
    return normalizeThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function resolveThemePreference(
  preference: ThemePreference,
  mediaQueryList: ThemeMediaQueryLike | null = getDefaultMediaQueryList(),
): ResolvedTheme {
  if (preference === 'system') {
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
      normalizedPreference === 'system' ? 'light dark' : normalizedPreference;
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
    if (readStoredThemePreference() !== 'system') {
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
