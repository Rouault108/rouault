export const ROUAULT_SYNTAX_PALETTE_SLOTS = [
  'base',
  'subdued',
  'red',
  'amber',
  'green',
  'blue',
  'purple',
] as const;

export type PaletteSlot = (typeof ROUAULT_SYNTAX_PALETTE_SLOTS)[number];

export type RouaultSyntaxThemeName = 'rouault-light' | 'rouault-dark';

export const ROUAULT_SYNTAX_PALETTES = {
  light: {
    base: '#2a2e33',
    subdued: '#5f6469',
    red: '#764b47',
    amber: '#6c5330',
    green: '#3f6246',
    blue: '#3e5b79',
    purple: '#604f73',
  },
  dark: {
    base: '#d9dfe5',
    subdued: '#9a9fa5',
    red: '#c1908c',
    amber: '#b59a75',
    green: '#84a98b',
    blue: '#82a2c3',
    purple: '#a795bd',
  },
} as const satisfies Record<'light' | 'dark', Record<PaletteSlot, string>>;

export const ROUAULT_SYNTAX_THEME_NAMES = {
  light: 'rouault-light',
  dark: 'rouault-dark',
} as const satisfies Record<'light' | 'dark', RouaultSyntaxThemeName>;

export const ROUAULT_SYNTAX_THEME_BACKGROUNDS = {
  light: '#f2f2f2',
  dark: '#020202',
} as const;

export interface RouaultSyntaxRule {
  readonly order: number;
  readonly id: string;
  readonly slot: PaletteSlot;
  readonly scopes: readonly string[];
}

export const ROUAULT_SYNTAX_RULES = [
  {
    order: 10,
    id: 'comment-subdued',
    slot: 'subdued',
    scopes: ['comment', 'punctuation.definition.comment', 'meta.documentation'],
  },
  {
    order: 20,
    id: 'string-green',
    slot: 'green',
    scopes: ['string', 'string.regexp'],
  },
  {
    order: 30,
    id: 'constant-amber',
    slot: 'amber',
    scopes: [
      'constant.numeric',
      'constant.language',
      'constant.character',
      'constant.other',
      'variable.language',
      'support.constant',
    ],
  },
  {
    order: 40,
    id: 'keyword-red',
    slot: 'red',
    scopes: [
      'keyword.control',
      'keyword.declaration',
      'keyword.other',
      'storage.type',
      'storage.modifier',
      'invalid',
    ],
  },
  {
    order: 50,
    id: 'callable-blue',
    slot: 'blue',
    scopes: ['entity.name.function', 'support.function', 'variable.function'],
  },
  {
    order: 60,
    id: 'property-blue',
    slot: 'blue',
    scopes: [
      'entity.other.attribute-name',
      'support.type.property-name',
      'meta.object-literal.key',
      'entity.name.tag',
    ],
  },
  {
    order: 70,
    id: 'type-purple',
    slot: 'purple',
    scopes: [
      'keyword.type',
      'storage.type.built-in.primitive',
      'entity.name.type',
      'entity.name.class',
      'entity.name.interface',
      'entity.name.namespace',
      'support.type',
      'support.class',
    ],
  },
  {
    order: 80,
    id: 'operator-base',
    slot: 'base',
    scopes: ['keyword.operator'],
  },
] as const satisfies readonly RouaultSyntaxRule[];

const LOWERCASE_SIX_DIGIT_HEX = /^#[0-9a-f]{6}$/u;
export const validateRouaultSyntaxThemeDefinition = (): readonly string[] => {
  const issues: string[] = [];
  const themeKeys = Object.keys(ROUAULT_SYNTAX_PALETTES);
  if (themeKeys.length !== 2 || !themeKeys.includes('light') || !themeKeys.includes('dark')) {
    issues.push('palette theme keys must be exactly light and dark');
  }

  const lightKeys = Object.keys(ROUAULT_SYNTAX_PALETTES.light).sort();
  const darkKeys = Object.keys(ROUAULT_SYNTAX_PALETTES.dark).sort();
  if (lightKeys.join('\u0000') !== darkKeys.join('\u0000')) {
    issues.push('light and dark palette keys must be symmetric');
  }

  for (const theme of ['light', 'dark'] as const) {
    const values = Object.values(ROUAULT_SYNTAX_PALETTES[theme]);
    if (values.some((value) => !LOWERCASE_SIX_DIGIT_HEX.test(value))) {
      issues.push(`${theme} palette values must be lowercase six-digit hex`);
    }
    if (new Set(values).size !== values.length) {
      issues.push(`${theme} palette values must be unique`);
    }
  }

  const orders = ROUAULT_SYNTAX_RULES.map((rule) => rule.order);
  if (new Set(orders).size !== orders.length) {
    issues.push('rule order values must be unique');
  }
  const ids = ROUAULT_SYNTAX_RULES.map((rule) => rule.id);
  if (new Set(ids).size !== ids.length) {
    issues.push('rule ids must be unique');
  }

  const knownSlots = new Set<PaletteSlot>(ROUAULT_SYNTAX_PALETTE_SLOTS);
  const reachedSlots = new Set<PaletteSlot>(['base']);
  for (const rule of ROUAULT_SYNTAX_RULES) {
    const scopes: readonly string[] = rule.scopes;
    if (!knownSlots.has(rule.slot)) {
      issues.push(`rule ${rule.id} references an unknown palette slot`);
    }
    reachedSlots.add(rule.slot);
    if (scopes.length === 0 || scopes.some((scope) => scope.trim() === '')) {
      issues.push(`rule ${rule.id} must not contain an empty scope`);
    }
    if (scopes.includes('meta.function-call')) {
      issues.push(`rule ${rule.id} must not include meta.function-call`);
    }
  }

  for (const slot of ROUAULT_SYNTAX_PALETTE_SLOTS) {
    if (!reachedSlots.has(slot)) {
      issues.push(`palette slot ${slot} is unreachable`);
    }
  }

  return issues;
};
