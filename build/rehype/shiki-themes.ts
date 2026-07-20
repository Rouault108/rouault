import { type ThemeRegistrationResolved } from 'shiki';

import {
  ROUAULT_SYNTAX_PALETTES,
  ROUAULT_SYNTAX_RULES,
  ROUAULT_SYNTAX_THEME_BACKGROUNDS,
  ROUAULT_SYNTAX_THEME_NAMES,
  validateRouaultSyntaxThemeDefinition,
} from './shiki-theme-definition.js';

const definitionIssues = validateRouaultSyntaxThemeDefinition();
if (definitionIssues.length > 0) {
  throw new Error(`Invalid Rouault syntax theme definition: ${definitionIssues.join('; ')}`);
}

const compileTheme = (theme: 'light' | 'dark'): ThemeRegistrationResolved => ({
  name: ROUAULT_SYNTAX_THEME_NAMES[theme],
  type: theme,
  fg: ROUAULT_SYNTAX_PALETTES[theme].base,
  bg: ROUAULT_SYNTAX_THEME_BACKGROUNDS[theme],
  settings: ROUAULT_SYNTAX_RULES.map((rule) => ({
    name: rule.id,
    scope: [...rule.scopes],
    settings: {
      foreground: ROUAULT_SYNTAX_PALETTES[theme][rule.slot],
    },
  })),
});

export const ROUAULT_SHIKI_LIGHT_THEME = compileTheme('light');
export const ROUAULT_SHIKI_DARK_THEME = compileTheme('dark');

export const ROUAULT_SHIKI_THEMES = {
  light: ROUAULT_SHIKI_LIGHT_THEME,
  dark: ROUAULT_SHIKI_DARK_THEME,
} as const;
