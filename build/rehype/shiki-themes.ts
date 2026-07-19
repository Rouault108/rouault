export const ROUAULT_SHIKI_THEMES = {
  light: 'github-light',
  dark: 'github-dark',
} as const;

export const ROUAULT_SHIKI_QUIET_PALETTE = {
  light: {
    redAccent: '#8f4a52',
    purpleAccent: '#67527c',
    blueAccent: '#4f6578',
    deepBlueAccent: '#3f5f66',
    warmAccent: '#7a5b47',
    comment: '#646a71',
  },
  dark: {
    redAccent: '#d08b90',
    purpleAccent: '#b7a0cf',
    blueAccent: '#9bb0c2',
    deepBlueAccent: '#9ab1b4',
    warmAccent: '#c3a087',
    comment: '#8b949e',
  },
} as const;

export const ROUAULT_SHIKI_COLOR_REPLACEMENTS = {
  'github-light': {
    '#d73a49': ROUAULT_SHIKI_QUIET_PALETTE.light.redAccent,
    '#6f42c1': ROUAULT_SHIKI_QUIET_PALETTE.light.purpleAccent,
    '#005cc5': ROUAULT_SHIKI_QUIET_PALETTE.light.blueAccent,
    '#032f62': ROUAULT_SHIKI_QUIET_PALETTE.light.deepBlueAccent,
    '#e36209': ROUAULT_SHIKI_QUIET_PALETTE.light.warmAccent,
    '#6a737d': ROUAULT_SHIKI_QUIET_PALETTE.light.comment,
  },
  'github-dark': {
    '#f97583': ROUAULT_SHIKI_QUIET_PALETTE.dark.redAccent,
    '#b392f0': ROUAULT_SHIKI_QUIET_PALETTE.dark.purpleAccent,
    '#79b8ff': ROUAULT_SHIKI_QUIET_PALETTE.dark.blueAccent,
    '#9ecbff': ROUAULT_SHIKI_QUIET_PALETTE.dark.deepBlueAccent,
    '#ffab70': ROUAULT_SHIKI_QUIET_PALETTE.dark.warmAccent,
    '#6a737d': ROUAULT_SHIKI_QUIET_PALETTE.dark.comment,
  },
} as const;
