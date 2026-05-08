import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  REQUIRED_E2E_NOTE_FIXTURE_IDS,
  buildE2ENoteFixtureManifest,
} from '../../build/testing/e2e-note-fixture-manifest.js';
import { e2eNoteFixtures } from '../e2e/support/note-fixtures.js';

describe('buildE2ENoteFixtureManifest', () => {
  it('e2e fixture id から permalink と content root id を引けること', () => {
    const manifest = buildE2ENoteFixtureManifest(
      [
        {
          title: 'Layout Rich',
          slug: 'e2e/layout-rich',
          permalink: '/notes/e2e/layout-rich',
          e2eFixtureId: 'note.layout-rich',
        },
      ],
      {
        requiredFixtureIds: [],
      },
    );

    expect(manifest['note.layout-rich']).toEqual({
      fixtureId: 'note.layout-rich',
      title: 'Layout Rich',
      slug: 'e2e/layout-rich',
      permalink: '/notes/e2e/layout-rich',
      contentRootId: 'note-content-e2e-layout-rich',
    });
  });

  it('fixture id の重複を reject すること', () => {
    expect(() =>
      buildE2ENoteFixtureManifest(
        [
          {
            title: 'first',
            slug: 'testing/first',
            permalink: '/notes/testing/first',
            e2eFixtureId: 'note.duplicate',
          },
          {
            title: 'second',
            slug: 'testing/second',
            permalink: '/notes/testing/second',
            e2eFixtureId: 'note.duplicate',
          },
        ],
        {
          requiredFixtureIds: [],
        },
      ),
    ).toThrowError('Duplicate e2e fixture id detected: "note.duplicate".');
  });

  it('required fixture id が欠けている場合は失敗すること', () => {
    expect(() =>
      buildE2ENoteFixtureManifest(
        [
          {
            title: 'Layout Rich',
            slug: 'e2e/layout-rich',
            permalink: '/notes/e2e/layout-rich',
            e2eFixtureId: 'note.layout-rich',
          },
        ],
        {
          fallbackSourceRoots: [],
        },
      ),
    ).toThrowError(
      `Missing required e2e fixture ids: ${REQUIRED_E2E_NOTE_FIXTURE_IDS.filter(
        (fixtureId) => fixtureId !== 'note.layout-rich',
      )
        .sort()
        .join(', ')}.`,
    );
  });

  it('stale な .velite 入力でも source markdown から required fixture を補完できること', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'rouault-e2e-fixture-manifest-'));

    try {
      const fallbackRoot = join(fixtureRoot, 'test-fixtures');
      const fallbackDir = join(fallbackRoot, 'e2e');
      mkdirSync(fallbackDir, { recursive: true });

      writeFileSync(
        join(fallbackDir, 'layout-rich.md'),
        `---
title: 'Layout Rich'
e2eFixtureId: 'note.layout-rich'
---

# fixture
`,
        'utf8',
      );

      const articleHeaderFixtureDir = join(
        fallbackDir,
        'article-header-static-layout',
        'extraordinarily-long-intermediate-breadcrumb-label-for-mobile-overflow-verification',
      );
      mkdirSync(articleHeaderFixtureDir, { recursive: true });
      writeFileSync(
        join(articleHeaderFixtureDir, 'very-long-breadcrumb-label.md'),
        `---
title: 'Very Long Current Title For Static Article Header Layout Overflow Verification'
e2eFixtureId: 'note.article-header-static-layout'
---

# fixture
`,
        'utf8',
      );

      writeFileSync(
        join(fallbackDir, 'article-header-link-decoration.md'),
        `---
title: 'Article Header Link Decoration Fixture'
e2eFixtureId: 'note.article-header-link-decoration'
---

# fixture
`,
        'utf8',
      );

      writeFileSync(
        join(fallbackDir, 'footnote-endnotes-layout.md'),
        `---
title: 'Footnote Endnotes Layout'
e2eFixtureId: 'note.footnote-endnotes-layout'
---

# fixture
`,
        'utf8',
      );

      writeFileSync(
        join(fallbackDir, 'footnote-long-url.md'),
        `---
title: 'Footnote Long URL'
e2eFixtureId: 'note.footnote-long-url'
---

# fixture
`,
        'utf8',
      );

      const fallbackTestingDir = join(fallbackRoot, 'testing');
      mkdirSync(fallbackTestingDir, { recursive: true });
      writeFileSync(
        join(fallbackTestingDir, 'toc-readable-long-heading.md'),
        `---
title: 'TOC Readable Long Heading'
e2eFixtureId: 'note.toc-readable-long-heading'
---

# fixture
`,
        'utf8',
      );

      const manifest = buildE2ENoteFixtureManifest(
        [
          {
            title: 'Code',
            slug: 'testing/code',
            permalink: '/notes/testing/code',
            e2eFixtureId: 'note.code',
          },
          {
            title: 'Footnote Endnotes Layout',
            slug: 'testing/footnote-endnotes-layout',
            permalink: '/notes/testing/footnote-endnotes-layout',
            e2eFixtureId: 'note.footnote-endnotes-layout',
          },
          {
            title: 'Interactive',
            slug: 'testing/interactive',
            permalink: '/notes/testing/interactive',
            e2eFixtureId: 'note.interactive',
          },
          {
            title: 'Markdown Basic',
            slug: 'testing/markdown-basic',
            permalink: '/notes/testing/markdown-basic',
            e2eFixtureId: 'note.markdown-basic',
          },
          {
            title: 'Sidebar Scroll Source',
            slug: 'testing/sidebar-scroll-source',
            permalink: '/notes/testing/sidebar-scroll-source',
            e2eFixtureId: 'note.sidebar-scroll-source',
          },
          {
            title: 'Sidebar Scroll Target',
            slug: 'testing/sidebar-scroll-target',
            permalink: '/notes/testing/sidebar-scroll-target',
            e2eFixtureId: 'note.sidebar-scroll-target',
          },
          {
            title: 'TOC Absent',
            slug: 'testing/toc-absent',
            permalink: '/notes/testing/toc-absent',
            e2eFixtureId: 'note.toc-absent',
          },
        ],
        {
          fallbackSourceRoots: [fallbackRoot],
        },
      );

      expect(manifest['note.layout-rich']).toEqual({
        fixtureId: 'note.layout-rich',
        title: 'Layout Rich',
        slug: 'e2e/layout-rich',
        permalink: '/notes/e2e/layout-rich',
        contentRootId: 'note-content-e2e-layout-rich',
      });

      expect(manifest['note.article-header-link-decoration']).toEqual({
        fixtureId: 'note.article-header-link-decoration',
        title: 'Article Header Link Decoration Fixture',
        slug: 'e2e/article-header-link-decoration',
        permalink: '/notes/e2e/article-header-link-decoration',
        contentRootId: 'note-content-e2e-article-header-link-decoration',
      });

      expect(manifest['note.footnote-endnotes-layout']).toEqual({
        fixtureId: 'note.footnote-endnotes-layout',
        title: 'Footnote Endnotes Layout',
        slug: 'testing/footnote-endnotes-layout',
        permalink: '/notes/testing/footnote-endnotes-layout',
        contentRootId: 'note-content-testing-footnote-endnotes-layout',
      });

      expect(manifest['note.footnote-long-url']).toEqual({
        fixtureId: 'note.footnote-long-url',
        title: 'Footnote Long URL',
        slug: 'e2e/footnote-long-url',
        permalink: '/notes/e2e/footnote-long-url',
        contentRootId: 'note-content-e2e-footnote-long-url',
      });

      expect(manifest['note.article-header-static-layout']).toEqual({
        fixtureId: 'note.article-header-static-layout',
        title: 'Very Long Current Title For Static Article Header Layout Overflow Verification',
        slug: 'e2e/article-header-static-layout/extraordinarily-long-intermediate-breadcrumb-label-for-mobile-overflow-verification/very-long-breadcrumb-label',
        permalink:
          '/notes/e2e/article-header-static-layout/extraordinarily-long-intermediate-breadcrumb-label-for-mobile-overflow-verification/very-long-breadcrumb-label',
        contentRootId:
          'note-content-e2e-article-header-static-layout-extraordinarily-long-intermediate-breadcrumb-label-for-mobile-overflow-verification-very-long-breadcrumb-label',
      });

      expect(manifest['note.toc-readable-long-heading']).toEqual({
        fixtureId: 'note.toc-readable-long-heading',
        title: 'TOC Readable Long Heading',
        slug: 'testing/toc-readable-long-heading',
        permalink: '/notes/testing/toc-readable-long-heading',
        contentRootId: 'note-content-testing-toc-readable-long-heading',
      });
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('article-header static layout fixture の directPath と normalizedPath を区別すること', () => {
    const fixture = e2eNoteFixtures.articleHeaderStaticLayout;

    expect(fixture.normalizedPath).toBe(
      '/notes/e2e/article-header-static-layout/extraordinarily-long-intermediate-breadcrumb-label-for-mobile-overflow-verification/very-long-breadcrumb-label',
    );
    expect(fixture.directPath).toBe(
      '/notes/e2e/article-header-static-layout/extraordinarily-long-intermediate-breadcrumb-label-for-mobile-overflow-verification/very-long-breadcrumb-label/',
    );
  });
});
