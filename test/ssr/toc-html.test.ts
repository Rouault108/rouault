import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

import { buildHashHrefFromId } from '../../src/router/url-hash.js';
import { renderTocHtml } from '../../src/layouts/toc-html.js';
import type { NotePageProjection } from '../../build/projections/note-page-projection.js';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];
interface ParentLike {
  childNodes: ChildNode[];
}

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;

const getAttribute = (node: ElementNode, name: string): string | null =>
  node.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const getTextContent = (node: ElementNode): string =>
  node.childNodes
    .map((child) => {
      if ('value' in child) {
        return child.value;
      }
      return isElementNode(child) ? getTextContent(child) : '';
    })
    .join('');

const findElement = (
  node: ParentLike,
  predicate: (element: ElementNode) => boolean,
): ElementNode | null => {
  for (const child of node.childNodes) {
    if (!isElementNode(child)) {
      continue;
    }

    if (predicate(child)) {
      return child;
    }

    const match = findElement(child, predicate);
    if (match) {
      return match;
    }
  }

  return null;
};

const createToc = (headings: NotePageProjection['toc']['headings']): NotePageProjection['toc'] => ({
  sourceId: 'toc-source-test',
  headings,
  capabilities: {
    activeTracking: true,
    dynamicScopes: false,
    mobilePanel: true,
  },
  contentRootId: 'note-content-test',
  homeHref: '/',
  shouldHydrate: true,
});

describe('renderTocHtml', () => {
  it('SSR TOC link に depth と title を出力し、href / attribute / text escape を分離すること', () => {
    const headingText = 'A "quoted" <heading> & detail';
    const headingId = '見出し id "x"&<>';
    const rendered = renderTocHtml(
      createToc([
        { id: 'intro', text: 'Intro', level: 2 },
        { id: headingId, text: headingText, level: 4 },
      ]),
    );
    const fragment = parseFragment(rendered);
    const link = findElement(
      fragment,
      (element) =>
        element.tagName === 'a' &&
        getAttribute(element, 'class') === 'layout-toc__link' &&
        getAttribute(element, 'data-heading-id') === headingId,
    );
    const label = link
      ? findElement(
          link,
          (element) =>
            element.tagName === 'span' &&
            getAttribute(element, 'class') === 'layout-toc__link-label',
        )
      : null;

    expect(link).not.to.equal(null);
    expect(label).not.to.equal(null);
    expect(link ? getAttribute(link, 'data-heading-depth') : null).to.equal('2');
    expect(link ? getAttribute(link, 'title') : null).to.equal(headingText);
    expect(link ? getAttribute(link, 'href') : null).to.equal(buildHashHrefFromId(headingId));
    expect(label ? getTextContent(label) : null).to.equal(headingText);
    expect(rendered).toContain('data-hydration-marker="toc-owner"');
    expect(rendered).toContain('toc-owner-id="toc-source-test"');

    expect(rendered).toContain('title="A &quot;quoted&quot; &lt;heading&gt; &amp; detail"');
    expect(rendered).toContain('A "quoted" &lt;heading&gt; &amp; detail');
    expect(rendered).not.toContain(`href="#${headingId}"`);
  });
});
