export const normalizeHeadingSlug = (value: string): string => {
  const normalized = value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\-_\s]+/gu, '')
    .replace(/\s+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return normalized || 'section';
};
export const createUniqueHeadingId = (text: string, counters: Map<string, number>): string => {
  const base = normalizeHeadingSlug(text);
  const count = (counters.get(base) ?? 0) + 1;
  counters.set(base, count);
  return count === 1 ? base : `${base}-${count.toString()}`;
};
