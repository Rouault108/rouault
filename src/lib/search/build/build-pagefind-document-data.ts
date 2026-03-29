import { buildPagefindAuxText } from '../indexing/pagefind-aux-text.js';

export interface PagefindDocumentDataInput {
  title?: string | undefined;
  description?: string | undefined;
  date?: string | undefined;
  updated?: string | undefined;
  tags?: readonly string[] | undefined;
}

export interface PagefindDocumentData {
  title: string;
  tokenizedTitle: string;
  description: string;
  tokenizedDescription: string;
  date: string;
  sortDate: string;
  tags: string[];
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTags(value: readonly string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((tag) => normalizeString(tag)).filter((tag) => tag.length > 0);
}

function normalizePagefindSortDate(value: string | undefined): string {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : '0000-00-00';
}

export function buildPagefindDocumentData(input: PagefindDocumentDataInput): PagefindDocumentData {
  const title = normalizeString(input.title);
  const description = normalizeString(input.description);
  const date = normalizeString(input.updated) || normalizeString(input.date);

  return {
    title,
    tokenizedTitle: buildPagefindAuxText(title),
    description,
    tokenizedDescription: buildPagefindAuxText(description),
    date,
    sortDate: normalizePagefindSortDate(date),
    tags: normalizeTags(input.tags),
  };
}
