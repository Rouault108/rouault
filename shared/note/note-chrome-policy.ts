import { normalizeNoteChromeProfile } from './note-chrome-profile.js';

export interface NoteChromePolicy {
  readonly sidebar: boolean;
  readonly breadcrumb: boolean;
  readonly tocMobilePanel: boolean;
}

const READER_CHROME_POLICY: NoteChromePolicy = {
  sidebar: true,
  breadcrumb: true,
  tocMobilePanel: true,
};

const PLAIN_CHROME_POLICY: NoteChromePolicy = {
  sidebar: false,
  breadcrumb: true,
  tocMobilePanel: false,
};

export const resolveNoteChromePolicy = (chromeProfile: unknown): NoteChromePolicy => {
  switch (normalizeNoteChromeProfile(chromeProfile) ?? 'plain') {
    case 'reader':
      return READER_CHROME_POLICY;
    case 'plain':
      return PLAIN_CHROME_POLICY;
  }
};

export const isChromeSurfaceEnabledForNoteProfile = (
  chromeProfile: unknown,
  surface: keyof NoteChromePolicy,
): boolean => resolveNoteChromePolicy(chromeProfile)[surface];
