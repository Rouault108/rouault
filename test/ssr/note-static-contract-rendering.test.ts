import { describe, expect, it } from 'vitest';

import { buildNoteNavigationModel } from '../../build/navigation/index.js';
import { buildNotePageProjection } from '../../build/projections/note-page-projection.js';
import { buildPagefindDocumentData } from '../../build/search/build-pagefind-document-data.js';
import type { IntrinsicNote } from '../../build/data/notes.js';
import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';

const staticNoteHtml = `
  <aside data-callout="true" data-callout-kind="tip" aria-label="Tip">
    <div data-callout-content="true">
      <p data-callout-heading="true">Callout</p>
      <div data-callout-body="true"><p>callout body</p></div>
    </div>
  </aside>
  <section data-info-box="true" data-variant="filled" data-density="comfortable">
    <div data-info-box-body="true"><p>info body</p></div>
  </section>
  <blockquote><p>quote body</p></blockquote>
  <div data-table-root="true" role="region" tabindex="0" aria-label="静的テーブル">
    <table><tbody><tr><td>value</td></tr></tbody></table>
  </div>
  <figure
    data-image="true"
    data-image-zoomable="true"
    data-hydration-key="image-lightbox-enhancer"
    data-hydration-capability="progressive"
    data-hydration-trigger="visible"
    data-image-lightbox-src="/static/example.png"
  >
    <button type="button" data-image-zoom-trigger="true" aria-label="画像を拡大して表示">拡大</button>
    <img src="/static/example.png" alt="example image">
  </figure>
  <p>
    <a
      id="fn-static-1-ref-1"
      href="#fn-static-1"
      role="doc-noteref"
      data-footnote-ref="true"
      data-footnote-id="fn-static-1"
      data-footnote-ref-instance="1"
      data-hydration-key="footnote-popover-enhancer"
      data-hydration-capability="progressive"
      data-hydration-trigger="post-commit"
    ><sup>1</sup></a>
  </p>
  <section role="doc-endnotes">
    <ol>
      <li id="fn-static-1">footnote body <a href="#fn-static-1-ref-1" data-footnote-backref role="doc-backlink">↩︎</a></li>
    </ol>
  </section>
`;

const createProjection = () => {
  const note: IntrinsicNote = {
    rawSlug: 'testing/static-contract',
    slug: 'testing/static-contract',
    permalink: '/notes/testing/static-contract',
    noteKind: 'leaf',
    sortIndex: 0,
    tocHeadings: [],
    tocCapabilities: {
      activeTracking: false,
      dynamicScopes: false,
      mobileSummary: false,
    },
    kind: 'reader',
    title: 'Static Contract',
    genre: ['testing'],
    content: staticNoteHtml,
  };

  return buildNotePageProjection({
    note,
    navigation: buildNoteNavigationModel({ currentNote: note, notes: [note] }),
    pagefindDocument: buildPagefindDocumentData({
      title: note.title,
      description: undefined,
      date: undefined,
      updated: undefined,
      tags: ['testing'],
    }),
  });
};

describe('note final html static contract', () => {
  it('projection/render 後の note HTML が static root を保持し legacy ui-* を再導入しないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({ notePage: createProjection() });

    const requiredSnippets = [
      'data-callout="true"',
      'data-info-box="true"',
      '<blockquote>',
      'data-table-root="true"',
      'figure data-image="true"',
      'data-hydration-key="image-lightbox-enhancer"',
      'data-footnote-ref="true"',
      'role="doc-endnotes"',
      'data-hydration-key="footnote-popover-enhancer"',
    ];

    for (const snippet of requiredSnippets) {
      expect(rendered).toContain(snippet);
    }

    const forbiddenLegacyTags = [
      '<ui-callout',
      '<ui-info-box',
      '<ui-table',
      '<ui-image',
      '<ui-footnote',
      '<ui-blockquote',
      '<ui-divider',
      '<ui-highlight',
    ];

    for (const legacyTag of forbiddenLegacyTags) {
      expect(rendered).not.toContain(legacyTag);
    }
  });
});