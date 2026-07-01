export const ROUAULT_SHIKI_THEMES = {
  light: 'github-light',
  dark: 'github-dark',
} as const;

export const ROUAULT_SHIKI_COLOR_REPLACEMENTS = {
  'github-light': {
    '#d73a49': '#8f4a52',
    '#6f42c1': '#67527c',
  },
  'github-dark': {
    '#f97583': '#d08b90',
    '#b392f0': '#b7a0cf',
  },
} as const;
