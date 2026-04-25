import type { IconName } from '../../shared/icons/icons-catalog.js';
import { isIconName } from '../../shared/icons/icons-catalog.js';
import type { NoteStatus } from '../types/article-status.js';

export const ARTICLE_HEADER_ICON_NAMES = [
  'archive',
  'alert-triangle',
  'calendar-clock',
  'chevron-right',
  'clock-3',
  'construction',
  'file-pen',
  'history',
  'link',
  'scale',
] as const satisfies readonly IconName[];

export type ArticleHeaderIconName = (typeof ARTICLE_HEADER_ICON_NAMES)[number];

export interface ArticleHeaderStatusPresentation {
  label: string;
  icon: ArticleHeaderIconName;
  tone: NoteStatus;
}

export interface ArticleHeaderBreadcrumbInput {
  label: string;
  href?: string | undefined;
}

export interface ArticleHeaderBreadcrumb {
  label: string;
  href?: string | undefined;
}

const STATUS_PRESENTATIONS: Readonly<Partial<Record<NoteStatus, ArticleHeaderStatusPresentation>>> =
  {
    draft: { label: '下書き', icon: 'file-pen', tone: 'draft' },
    archived: { label: 'アーカイブ', icon: 'archive', tone: 'archived' },
    wip: { label: '作業中', icon: 'construction', tone: 'wip' },
    deprecated: { label: '非推奨', icon: 'alert-triangle', tone: 'deprecated' },
  };

const MALFORMED_PERCENT_ENCODING = /%(?![0-9A-Fa-f]{2})/u;
const ENCODED_SLASH = /%2f/iu;

const hasAsciiControlOrDelete = (value: string): boolean => {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return true;
    }
  }

  return false;
};

const hasUnsafeRawCodePoint = (value: string): boolean =>
  hasAsciiControlOrDelete(value) || value.includes('\\');

const decodePercentEncoded = (value: string): string | null => {
  if (MALFORMED_PERCENT_ENCODING.test(value)) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const hasUnsafePercentEncodedCodePoint = (
  value: string,
  options: { rejectEncodedSlash?: boolean } = {},
): boolean => {
  if (options.rejectEncodedSlash === true && ENCODED_SLASH.test(value)) {
    return true;
  }

  const decoded = decodePercentEncoded(value);
  return decoded === null || hasUnsafeRawCodePoint(decoded);
};

const hasDotSegment = (pathname: string): boolean => {
  const decodedPathname = decodePercentEncoded(pathname);
  if (decodedPathname === null) {
    return true;
  }

  return decodedPathname.split('/').some((segment) => segment === '.' || segment === '..');
};

export const isArticleHeaderIconName = (value: string): value is ArticleHeaderIconName =>
  ARTICLE_HEADER_ICON_NAMES.includes(value as ArticleHeaderIconName) && isIconName(value);

export const getArticleHeaderStatusPresentation = (
  status: NoteStatus | '' | undefined,
): ArticleHeaderStatusPresentation | null => {
  if (!status) {
    return null;
  }

  return STATUS_PRESENTATIONS[status] ?? null;
};

export const normalizeArticleHeaderTag = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const toArticleHeaderTagHref = (value: string): string =>
  `/tags/${encodeURIComponent(value.trim())}/`;

export const normalizeArticleHeaderBreadcrumbLabel = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const toSafeArticleHeaderBreadcrumbHref = (value: string | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  if (normalized.length === 0 || !normalized.startsWith('/') || normalized.startsWith('//')) {
    return null;
  }

  if (
    hasUnsafeRawCodePoint(normalized) ||
    hasUnsafePercentEncodedCodePoint(normalized, { rejectEncodedSlash: true })
  ) {
    return null;
  }

  const [pathPart = ''] = normalized.split(/[?#]/u, 1);
  if (hasDotSegment(pathPart)) {
    return null;
  }

  try {
    const url = new URL(normalized, 'https://rouault.local');
    if (url.origin !== 'https://rouault.local') {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};

export const normalizeArticleHeaderBreadcrumbs = (
  breadcrumbs: readonly ArticleHeaderBreadcrumbInput[] | undefined,
): ArticleHeaderBreadcrumb[] => {
  if (!breadcrumbs) {
    return [];
  }

  return breadcrumbs.flatMap((item) => {
    const label = normalizeArticleHeaderBreadcrumbLabel(item.label);
    if (label === null) {
      return [];
    }

    const href = toSafeArticleHeaderBreadcrumbHref(item.href);
    return href === null ? [{ label }] : [{ label, href }];
  });
};

export const toSafeArticleHeaderSourceHref = (value: string | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  if (normalized.length === 0 || hasUnsafeRawCodePoint(normalized)) {
    return null;
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    if (url.username.length > 0 || url.password.length > 0) {
      return null;
    }

    const encodedParts = `${url.pathname}${url.search}${url.hash}`;
    if (hasUnsafePercentEncodedCodePoint(encodedParts)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
};

export const normalizeArticleHeaderLicense = (value: string | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

export const normalizeArticleHeaderReadingTime = (
  value: number | null | undefined,
): number | null => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
};
