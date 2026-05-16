const REL_TOKEN_ORDER = ['noopener', 'noreferrer', 'external', 'nofollow', 'ugc', 'sponsored'] as const;
export const FORBIDDEN_REL_TOKENS = ['opener'] as const;

const orderOf = (token: string): number => {
  const index = (REL_TOKEN_ORDER as readonly string[]).indexOf(token);
  return index < 0 ? REL_TOKEN_ORDER.length : index;
};

export const parseRelTokens = (value: string | undefined): readonly string[] => {
  if (value === undefined) return [];
  const tokens = value
    .toLowerCase()
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length > 0);
  return Array.from(new Set(tokens));
};

export const serializeRelTokens = (tokens: readonly string[]): string =>
  Array.from(new Set(tokens.map((token) => token.toLowerCase()).filter(Boolean)))
    .sort((a, b) => {
      const order = orderOf(a) - orderOf(b);
      return order === 0 ? a.localeCompare(b) : order;
    })
    .join(' ');

export const hasForbiddenRelToken = (tokens: readonly string[]): boolean =>
  tokens.some((token) => (FORBIDDEN_REL_TOKENS as readonly string[]).includes(token));
