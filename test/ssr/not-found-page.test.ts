import { describe, expect, it } from 'vitest';
import {
  ABOUT_PAGE_HREF,
  NOT_FOUND_PAGE_DESCRIPTION,
  NOT_FOUND_PAGE_TITLE,
  SEARCH_PAGE_HREF,
  buildNotFoundPageMarkup,
} from '../../src/components/not-found/not-found-page.js';

describe('buildNotFoundPageMarkup', () => {
  it('404 fallback の基本構造と導線を出力すること', () => {
    const rendered = buildNotFoundPageMarkup();

    expect(rendered).toContain('<not-found-page');
    expect(rendered).toContain('class="not-found-page-fallback"');
    expect(rendered).toContain('aria-labelledby="not-found-page-title"');
    expect(rendered).toContain('aria-label="404 navigation"');
    expect(rendered).toContain(NOT_FOUND_PAGE_TITLE);
    expect(rendered).toContain(NOT_FOUND_PAGE_DESCRIPTION);
    expect(rendered).toContain(`href="${SEARCH_PAGE_HREF}"`);
    expect(rendered).toContain(`href="${ABOUT_PAGE_HREF}"`);
    expect(rendered).toContain('検索ページへ');
    expect(rendered).toContain('このサイトについて');
    expect(rendered).not.toContain('<button');
  });

  it('requestedPath がある場合は meta row と code を出力すること', () => {
    const requestedPath = '/notes/missing-entry?tab=outline#section-2';
    const rendered = buildNotFoundPageMarkup({ requestedPath });

    expect(rendered).toContain('class="not-found-page-fallback__meta"');
    expect(rendered).toContain('要求されたパス');
    expect(rendered).toContain(`<code>${requestedPath}</code>`);
    expect(rendered).toContain(`requested-path="${requestedPath}"`);
  });

  it('requestedPath が空なら meta row を出力しないこと', () => {
    const rendered = buildNotFoundPageMarkup({ requestedPath: '   ' });

    expect(rendered).not.toContain('class="not-found-page-fallback__meta"');
    expect(rendered).not.toContain('要求されたパス');
  });
});
