import { describe, expect, it } from 'vitest';

import {
  ARTICLE_HEADER_ICON_NAMES,
  getArticleHeaderStatusPresentation,
  isArticleHeaderIconName,
  normalizeArticleHeaderBreadcrumbLabel,
  normalizeArticleHeaderBreadcrumbs,
  normalizeArticleHeaderLicense,
  normalizeArticleHeaderReadingTime,
  normalizeArticleHeaderTag,
  toArticleHeaderTagHref,
  toSafeArticleHeaderBreadcrumbHref,
  toSafeArticleHeaderSourceHref,
} from '../../src/article-header/article-header-contract.js';

describe('article-header shared contract', () => {
  it('status presentation は class 名を返さず意味論だけを返すこと', () => {
    const presentation = getArticleHeaderStatusPresentation('wip');

    expect(presentation).toEqual({
      label: '作業中',
      icon: 'construction',
      tone: 'wip',
    });
    expect(presentation).not.toHaveProperty('toneClass');
    expect(getArticleHeaderStatusPresentation(undefined)).toBeNull();
  });

  it('article-header icon catalog が有効な icon 名だけを含むこと', () => {
    for (const name of ARTICLE_HEADER_ICON_NAMES) {
      expect(isArticleHeaderIconName(name)).toBe(true);
    }
  });

  it('tag を trim し、空文字を除外し、trim 後の href を生成すること', () => {
    expect(normalizeArticleHeaderTag('  C#  ')).toBe('C#');
    expect(normalizeArticleHeaderTag('   ')).toBeNull();
    expect(toArticleHeaderTagHref('  C#  ')).toBe('/tags/C%23/');
  });

  it('breadcrumb label と item を normalize すること', () => {
    expect(normalizeArticleHeaderBreadcrumbLabel('  Notes  ')).toBe('Notes');
    expect(normalizeArticleHeaderBreadcrumbLabel('  ')).toBeNull();

    expect(
      normalizeArticleHeaderBreadcrumbs([
        { label: '  Notes  ', href: '/notes/' },
        { label: '  ' },
        { label: 'Unsafe', href: '/notes/%00' },
      ]),
    ).toEqual([{ label: 'Notes', href: '/notes/' }, { label: 'Unsafe' }]);
  });

  it('breadcrumb href は same-origin path だけを許可し unsafe sequence を拒否すること', () => {
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/foo?x=1#bar')).toBe('/notes/foo?x=1#bar');
    expect(toSafeArticleHeaderBreadcrumbHref('https://example.com/notes/foo')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('//example.com/notes/foo')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes\\foo')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/\u0000')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/%00')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/%5C')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/%E0%A4%A')).toBeNull();
  });

  it('breadcrumb href は query/hash 内の encoded unsafe、dot segment、encoded slash を拒否すること', () => {
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/foo?x=%00')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/foo?x=%5C')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/foo?x=%E0%A4%A')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/foo#%00')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/foo#%5C')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/foo#%E0%A4%A')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/../secret')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/%2e%2e/secret')).toBeNull();
    expect(toSafeArticleHeaderBreadcrumbHref('/notes/foo%2Fbar')).toBeNull();
  });

  it('source URL は http/https の安全な URL だけを許可すること', () => {
    expect(toSafeArticleHeaderSourceHref(' https://example.com/source ')).toBe(
      'https://example.com/source',
    );
    expect(toSafeArticleHeaderSourceHref('ftp://example.com/source')).toBeNull();
    expect(toSafeArticleHeaderSourceHref('https://user@example.com/source')).toBeNull();
    expect(toSafeArticleHeaderSourceHref('https://example.com/a\\b')).toBeNull();
    expect(toSafeArticleHeaderSourceHref('https://example.com/%00')).toBeNull();
    expect(toSafeArticleHeaderSourceHref('https://example.com/%5C')).toBeNull();
    expect(toSafeArticleHeaderSourceHref('https://example.com/%E0%A4%A')).toBeNull();
  });

  it('source URL は query/hash 内の encoded unsafe も拒否すること', () => {
    expect(toSafeArticleHeaderSourceHref('https://example.com/?x=%00')).toBeNull();
    expect(toSafeArticleHeaderSourceHref('https://example.com/?x=%5C')).toBeNull();
    expect(toSafeArticleHeaderSourceHref('https://example.com/?x=%E0%A4%A')).toBeNull();
    expect(toSafeArticleHeaderSourceHref('https://example.com/#%00')).toBeNull();
    expect(toSafeArticleHeaderSourceHref('https://example.com/#%5C')).toBeNull();
    expect(toSafeArticleHeaderSourceHref('https://example.com/#%E0%A4%A')).toBeNull();
  });

  it('license と reading time を normalize すること', () => {
    expect(normalizeArticleHeaderLicense('  CC BY 4.0  ')).toBe('CC BY 4.0');
    expect(normalizeArticleHeaderLicense('  ')).toBeNull();
    expect(normalizeArticleHeaderReadingTime(2.4)).toBe(2);
    expect(normalizeArticleHeaderReadingTime(0)).toBeNull();
    expect(normalizeArticleHeaderReadingTime(Number.NaN)).toBeNull();
    expect(normalizeArticleHeaderReadingTime(Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeArticleHeaderReadingTime(Number.NEGATIVE_INFINITY)).toBeNull();
  });
});
