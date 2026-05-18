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

    expect(rendered).toContain('data-not-found-page');
    expect(rendered).toContain('class="home-shell not-found-page-fallback"');
    expect(rendered).toContain('aria-labelledby="not-found-page-title"');
    expect(rendered).toContain('aria-label="404 navigation"');
    expect(rendered).toContain(NOT_FOUND_PAGE_TITLE);
    expect(rendered).toContain(NOT_FOUND_PAGE_DESCRIPTION);
    expect(rendered).toContain(`href="${SEARCH_PAGE_HREF}"`);
    expect(rendered).toContain(`href="${ABOUT_PAGE_HREF}"`);
    expect(rendered).toContain('検索ページへ');
    expect(rendered).toContain('このサイトについて');
    expect(rendered).not.toContain('<button');
    expect(rendered).not.toContain('<not-found-page');
    expect(rendered).not.toContain('</not-found-page>');
    expect(rendered).not.toContain(' requested-path=');
    expect(rendered).not.toContain('\nrequested-path=');
  });

  it('404 fallback link styles が本文リンク下線を局所で打ち消すこと', () => {
    const rendered = buildNotFoundPageMarkup();

    expect(rendered).toContain('.not-found-page-fallback__link[href]');
    expect(rendered).toContain('text-decoration-line: none');
    expect(rendered).toContain('.not-found-page-fallback__link[href]:visited');
  });

  it('requestedPath がある場合は meta row と code を出力すること', () => {
    const requestedPath = '/notes/does-not-exist?x=<script>';
    const rendered = buildNotFoundPageMarkup({ requestedPath });

    expect(rendered).toContain('class="not-found-page-fallback__meta"');
    expect(rendered).toContain('要求されたパス');
    expect(rendered).toContain('data-requested-path=');
    expect(rendered).toContain('&lt;script&gt;');
    expect(rendered).not.toContain('<script>');
    expect(rendered).not.toContain(' requested-path=');
  });

  it('requestedPath が空なら meta row を出力しないこと', () => {
    const rendered = buildNotFoundPageMarkup({ requestedPath: '   ' });

    expect(rendered).toContain('data-not-found-page');
    expect(rendered).not.toContain('data-requested-path=');
    expect(rendered).not.toContain('class="not-found-page-fallback__meta"');
    expect(rendered).not.toContain('要求されたパス');
  });
});
