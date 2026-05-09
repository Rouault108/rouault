import { describe, expect, it } from 'vitest';

import { buildDocumentTitle, SITE_TITLE } from '../../shared/document-title.js';

describe('buildDocumentTitle', () => {
  it('page title が未指定または空の場合は site title を返すこと', () => {
    expect(buildDocumentTitle(undefined)).toBe(SITE_TITLE);
    expect(buildDocumentTitle(null)).toBe(SITE_TITLE);
    expect(buildDocumentTitle('')).toBe(SITE_TITLE);
    expect(buildDocumentTitle('   ')).toBe(SITE_TITLE);
  });

  it('page title が site title と同一の場合は重複させないこと', () => {
    expect(buildDocumentTitle('Rouault')).toBe('Rouault');
  });

  it('page title が site title の重複済み文書タイトルの場合は site title に正規化すること', () => {
    expect(buildDocumentTitle('Rouault - Rouault')).toBe('Rouault');
  });

  it('page title が site title と異なる場合は site title を接尾辞として付けること', () => {
    expect(buildDocumentTitle('このサイトについて')).toBe('このサイトについて - Rouault');
  });

  it('page title がすでに文書タイトル化済みの場合は再接尾辞化しないこと', () => {
    expect(buildDocumentTitle('このサイトについて - Rouault')).toBe(
      'このサイトについて - Rouault',
    );
  });

  it('page title が重複済み文書タイトルの場合は単一接尾辞に正規化すること', () => {
    expect(buildDocumentTitle('このサイトについて - Rouault - Rouault')).toBe(
      'このサイトについて - Rouault',
    );
  });

  it('末尾の site title suffix は仕様上サイト名接尾辞として扱うこと', () => {
    expect(buildDocumentTitle('研究メモ - Rouault')).toBe('研究メモ - Rouault');
    expect(buildDocumentTitle('研究メモ - Rouault - Rouault')).toBe('研究メモ - Rouault');
  });
});
