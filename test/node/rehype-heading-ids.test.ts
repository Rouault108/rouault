import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';
import { toHtml } from 'hast-util-to-html';
import { describe, expect, it } from 'vitest';
import { rehypeHeadingIds } from '../../build/rehype/rehype-heading-ids.js';
import type { HastNode } from '../../build/rehype/hast-utils.js';

type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5DocumentFragment = DefaultTreeAdapterMap['documentFragment'];
type Parse5Element = DefaultTreeAdapterMap['element'];

type Parse5SearchNode = Parse5Node | Parse5DocumentFragment;

const EMPTY_SVG_SHAPE_TAGS = new Set([
  'path',
  'circle',
  'ellipse',
  'line',
  'rect',
  'polyline',
  'polygon',
]);

const requireNode = <T>(node: T | undefined, message: string): T => {
  expect(node, message).to.not.equal(undefined);

  if (node === undefined) {
    throw new Error(message);
  }

  return node;
};

const describeNode = (node: HastNode): string => {
  if (node.type === 'element') {
    return node.tagName ?? 'element';
  }

  return node.type ?? 'unknown';
};

const collectElements = (node: HastNode, tagName: string): HastNode[] => {
  const matches: HastNode[] = [];

  if (node.type === 'element' && node.tagName === tagName) {
    matches.push(node);
  }

  for (const child of node.children ?? []) {
    matches.push(...collectElements(child, tagName));
  }

  return matches;
};

const collectShapeViolations = (
  node: HastNode,
  iconName: string,
  ancestors: string[] = [],
): string[] => {
  const currentPath = [...ancestors, describeNode(node)];
  const violations: string[] = [];

  if (
    node.type === 'element' &&
    node.tagName !== undefined &&
    EMPTY_SVG_SHAPE_TAGS.has(node.tagName) &&
    (node.children?.length ?? 0) > 0
  ) {
    violations.push(`${iconName}: ${currentPath.join(' > ')} has children`);
  }

  for (const child of node.children ?? []) {
    violations.push(...collectShapeViolations(child, iconName, currentPath));
  }

  return violations;
};

const countNestedPath = (node: HastNode, insidePath = false): number => {
  const isPath = node.type === 'element' && node.tagName === 'path';
  const nextInsidePath = insidePath || isPath;
  let count = insidePath && isPath ? 1 : 0;

  for (const child of node.children ?? []) {
    count += countNestedPath(child, nextInsidePath);
  }

  return count;
};

const serializeHast = (node: HastNode): string => toHtml(node as Parameters<typeof toHtml>[0]);

const isParse5Element = (node: Parse5SearchNode): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string';

const getChildNodes = (node: Parse5SearchNode): Parse5Node[] =>
  'childNodes' in node && Array.isArray(node.childNodes) ? node.childNodes : [];

const getAttr = (node: Parse5Element, name: string): string | undefined =>
  node.attrs.find((attr) => attr.name === name)?.value;

const findElement = (
  node: Parse5SearchNode,
  predicate: (node: Parse5Element) => boolean,
): Parse5Element | undefined => {
  if (isParse5Element(node) && predicate(node)) {
    return node;
  }

  for (const child of getChildNodes(node)) {
    const found = findElement(child, predicate);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
};

const collectParse5Elements = (node: Parse5SearchNode, tagName: string): Parse5Element[] => {
  const matches: Parse5Element[] = [];

  if (isParse5Element(node) && node.tagName === tagName) {
    matches.push(node);
  }

  for (const child of getChildNodes(node)) {
    matches.push(...collectParse5Elements(child, tagName));
  }

  return matches;
};

const countDescendantPathInsidePath = (node: Parse5SearchNode, insidePath = false): number => {
  const isPath = isParse5Element(node) && node.tagName === 'path';
  const nextInsidePath = insidePath || isPath;
  let count = insidePath && isPath ? 1 : 0;

  for (const child of getChildNodes(node)) {
    count += countDescendantPathInsidePath(child, nextInsidePath);
  }

  return count;
};

describe('rehypeHeadingIds', () => {
  it('h2-h6にidが無い場合は自動で付与すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'h2',
          properties: {},
          children: [{ type: 'text', value: '重複 見出し' }],
        },
        {
          type: 'element',
          tagName: 'h2',
          properties: {},
          children: [{ type: 'text', value: '重複 見出し' }],
        },
      ],
    };

    rehypeHeadingIds()(tree);

    const firstId = tree.children?.[0]?.properties?.['id'];
    const secondId = tree.children?.[1]?.properties?.['id'];

    expect(firstId).to.equal('重複-見出し');
    expect(secondId).to.equal('重複-見出し-2');
  });
  it('h2-h6 に固定リンク用アンカーを追加すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'h2',
          properties: {},
          children: [{ type: 'text', value: '導入' }],
        },
        {
          type: 'element',
          tagName: 'h1',
          properties: {},
          children: [{ type: 'text', value: 'タイトル' }],
        },
      ],
    };

    rehypeHeadingIds()(tree);

    const h2 = requireNode(tree.children?.[0], 'h2 must exist');
    const h1 = requireNode(tree.children?.[1], 'h1 must exist');

    expect(h2.properties?.['id']).to.equal('導入');

    const h2Children = h2.children ?? [];
    expect(h2Children).to.have.length(2);

    const textWrapper = requireNode(h2Children[0], 'heading text wrapper must exist');
    expect(textWrapper.tagName).to.equal('span');
    expect(textWrapper.properties?.['className']).to.deep.equal(['heading-text']);

    const anchor = requireNode(h2Children[1], 'heading anchor must exist');
    expect(anchor.tagName).to.equal('a');
    expect(anchor.properties?.['className']).to.deep.equal(['heading-anchor']);
    expect(anchor.properties?.['href']).to.equal('#導入');
    expect(anchor.properties?.['aria-label']).to.equal('「導入」への固定リンク');

    const icon = requireNode(anchor.children?.[0], 'heading anchor icon must exist');
    expect(icon.tagName).to.equal('svg');
    expect(icon.properties?.['data-icon']).to.equal('link');
    expect(icon.properties?.['aria-hidden']).to.equal('true');
    expect(icon.properties?.['focusable']).to.equal('false');

    const paths = collectElements(icon, 'path');
    expect(paths).to.have.length(2);

    for (const path of paths) {
      expect(path.children ?? []).to.have.length(0);
    }

    expect(countNestedPath(icon)).to.equal(0);
    expect(collectShapeViolations(icon, 'heading-link')).to.deep.equal([]);

    const h1Children = h1.children ?? [];
    expect(h1Children).to.have.length(1);
  });

  it('heading permalink icon を HTML 化して再パースしても nested path を生成しないこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'h2',
          properties: {},
          children: [{ type: 'text', value: '導入' }],
        },
      ],
    };

    rehypeHeadingIds()(tree);

    const html = serializeHast(tree);
    const fragment = parse5.parseFragment(html, { sourceCodeLocationInfo: false });

    const svg = findElement(
      fragment,
      (node) => node.tagName === 'svg' && getAttr(node, 'data-icon') === 'link',
    );

    expect(svg, 'serialized link svg must exist').to.not.equal(undefined);

    if (svg === undefined) {
      throw new Error('serialized link svg must exist');
    }

    expect(collectParse5Elements(svg, 'path')).to.have.length(2);
    expect(countDescendantPathInsidePath(svg)).to.equal(0);
  });

  it('endnotes 内の h2#footnote-label には heading permalink を追加しないこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'section',
          properties: { role: 'doc-endnotes' },
          children: [
            {
              type: 'element',
              tagName: 'h2',
              properties: { id: 'footnote-label' },
              children: [{ type: 'text', value: '脚注' }],
            },
            {
              type: 'element',
              tagName: 'ol',
              properties: {},
              children: [],
            },
          ],
        },
      ],
    };

    rehypeHeadingIds()(tree);

    const section = tree.children?.[0];
    const heading = section?.children?.[0];
    expect(heading?.children).to.deep.equal([{ type: 'text', value: '脚注' }]);
  });

  it('[data-link-card] 配下の heading には id と permalink を付与しないこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'article',
          properties: { 'data-link-card': '' },
          children: [
            {
              type: 'element',
              tagName: 'a',
              properties: { href: 'https://example.com' },
              children: [
                {
                  type: 'element',
                  tagName: 'h2',
                  properties: {},
                  children: [{ type: 'text', value: 'カード見出し' }],
                },
              ],
            },
          ],
        },
        {
          type: 'element',
          tagName: 'h2',
          properties: {},
          children: [{ type: 'text', value: '通常見出し' }],
        },
      ],
    };

    rehypeHeadingIds()(tree);

    const cardHeading = tree.children?.[0]?.children?.[0]?.children?.[0];
    const proseHeading = tree.children?.[1];
    expect(cardHeading?.properties?.['id']).to.equal(undefined);
    expect(cardHeading?.children).to.deep.equal([{ type: 'text', value: 'カード見出し' }]);
    expect(proseHeading?.properties?.['id']).to.equal('通常見出し');
    expect(proseHeading?.children?.[1]?.tagName).to.equal('a');
  });
});
