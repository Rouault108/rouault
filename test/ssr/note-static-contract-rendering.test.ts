import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

import { buildNoteNavigationModel } from '../../build/navigation/index.js';
import { buildNotePageProjection } from '../../build/projections/note-page-projection.js';
import { buildPagefindDocumentData } from '../../build/search/build-pagefind-document-data.js';
import type { IntrinsicNote } from '../../build/data/notes.js';
import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];

interface ParentLike {
  childNodes: ChildNode[];
}

const staticNoteHtml = `
  <aside data-callout="true" data-callout-kind="tip" aria-label="Tip">
    <div data-callout-content="true">
      <p data-callout-heading="true">Callout</p>
      <div data-callout-body="true"><p>callout body</p></div>
    </div>
  </aside>
  <section data-info-box="true" data-variant="filled" data-density="comfortable">
    <div data-info-box-header="true"><p data-info-box-heading="true">Info</p></div>
    <div data-info-box-body="true"><p>info body</p></div>
  </section>
  <blockquote><p>quote body</p></blockquote>
  <div data-table-root="true" role="region" tabindex="0" aria-label="静的テーブル">
    <table>
      <caption>静的テーブル</caption>
      <tbody><tr><td>value</td></tr></tbody>
    </table>
  </div>
  <figure
    data-image="true"
    data-image-zoomable="true"
    data-hydration-key="image-lightbox-enhancer"
    data-hydration-capability="progressive"
    data-hydration-trigger="visible"
    data-image-lightbox-src="/static/example.png"
  >
    <button type="button" data-image-zoom-trigger="true" aria-label="画像を拡大して表示">
      <span class="image-zoom-trigger__icon static-icon" aria-hidden="true"><svg></svg></span>
      <span class="sr-only">画像を拡大して表示</span>
    </button>
    <img src="/static/example.png" alt="example image">
    <figcaption>example caption</figcaption>
  </figure>
  <p>
    <a
      id="fn-static-1-ref-1"
      href="#fn-static-1"
      role="doc-noteref"
      aria-label="脚注 1 を開く"
      data-footnote-ref="true"
      data-footnote-id="fn-static-1"
      data-footnote-index="1"
      data-footnote-ref-instance="1"
      data-footnote-role="primary"
      data-hydration-key="footnote-popover-enhancer"
      data-hydration-capability="progressive"
      data-hydration-trigger="post-commit"
    ><sup>1</sup></a>
  </p>
  <section role="doc-endnotes">
    <h2 id="footnote-label">脚注</h2>
    <ol>
      <li id="fn-static-1">
        <p>footnote body <a href="#fn-static-1-ref-1" data-footnote-backref="true" role="doc-backlink" aria-label="脚注参照 1 に戻る">↩︎</a></p>
      </li>
    </ol>
  </section>
`;

const getAttribute = (node: ElementNode, name: string): string | null => {
  return node.attrs.find((attribute) => attribute.name === name)?.value ?? null;
};

const isElementNode = (node: ChildNode): node is ElementNode => {
  return 'tagName' in node;
};

const hasChildElement = (
  node: ElementNode,
  predicate: (child: ElementNode) => boolean,
): boolean => {
  return node.childNodes.some((child) => isElementNode(child) && predicate(child));
};

const hasElement = (node: ParentLike, predicate: (element: ElementNode) => boolean): boolean => {
  for (const child of node.childNodes) {
    if (!isElementNode(child)) {
      continue;
    }

    if (predicate(child)) {
      return true;
    }

    if (hasElement(child, predicate)) {
      return true;
    }
  }

  return false;
};

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
      mobilePanel: false,
    },
    tocCapabilitySource: 'inferred',
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
  it('projection/render 後の note HTML が static selectors を保持し legacy ui-* を再導入しないこと', () => {
    const layout = new NoteLayout();
    const rendered = layout.render({ notePage: createProjection() });
    const tree = parseFragment(rendered);

    expect(
      hasElement(
        tree,
        (element) =>
          element.tagName === 'aside' && getAttribute(element, 'data-callout') === 'true',
      ),
    ).toBe(true);
    expect(
      hasElement(
        tree,
        (element) =>
          element.tagName === 'section' && getAttribute(element, 'data-info-box') === 'true',
      ),
    ).toBe(true);
    expect(hasElement(tree, (element) => element.tagName === 'blockquote')).toBe(true);
    expect(
      hasElement(
        tree,
        (element) =>
          element.tagName === 'div' &&
          getAttribute(element, 'data-table-root') === 'true' &&
          hasChildElement(element, (child) => child.tagName === 'table'),
      ),
    ).toBe(true);
    expect(
      hasElement(
        tree,
        (element) =>
          element.tagName === 'figure' &&
          getAttribute(element, 'data-image') === 'true' &&
          hasChildElement(element, (child) => child.tagName === 'img'),
      ),
    ).toBe(true);
    expect(
      hasElement(
        tree,
        (element) =>
          element.tagName === 'a' &&
          getAttribute(element, 'data-footnote-ref') === 'true' &&
          getAttribute(element, 'role') === 'doc-noteref',
      ),
    ).toBe(true);
    expect(
      hasElement(
        tree,
        (element) =>
          element.tagName === 'section' && getAttribute(element, 'role') === 'doc-endnotes',
      ),
    ).toBe(true);

    const forbiddenLegacyTags = [
      'ui-callout',
      'ui-info-box',
      'ui-table',
      'ui-image',
      'ui-footnote',
      'ui-blockquote',
      'ui-divider',
      'ui-highlight',
    ] as const;

    for (const legacyTag of forbiddenLegacyTags) {
      expect(hasElement(tree, (element) => element.tagName === legacyTag)).toBe(false);
    }
  });
});
