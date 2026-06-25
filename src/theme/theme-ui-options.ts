import type { IconName } from '../../shared/icons/icon-paths.js';
import type { ThemePreference } from './theme-manager.js';

export const THEME_UI_OPTIONS: Record<
  ThemePreference,
  {
    readonly icon: IconName;
    readonly label: string;
  }
> = {
  light: {
    icon: 'sun',
    label: 'ライト',
  },
  dark: {
    icon: 'moon',
    label: 'ダーク',
  },
  system: {
    icon: 'monitor',
    label: 'OSテーマ',
  },
};

export const THEME_CHROME_BOOTSTRAP_ICON_NAMES = [
  'sun',
  'moon',
  'monitor',
] as const satisfies readonly IconName[];
