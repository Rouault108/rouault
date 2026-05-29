import { describe, expect, it } from 'vitest';
import { createStaticIconHast } from '../../build/rehype/static-icon-hast.js';
import { ICON_NAMES } from '../../shared/icons/icon-paths.js';
import type { HastNode } from '../../build/rehype/hast-utils.js';

const EMPTY_SVG_SHAPE_TAGS = new Set([
  'path',
  'circle',
  'ellipse',
  'line',
  'rect',
  'polyline',
  'polygon',
]);

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

describe('createStaticIconHast', () => {
  it('link icon の path を不正に入れ子化しないこと', () => {
    const icon = createStaticIconHast('link');

    expect(icon.tagName).to.equal('svg');
    expect(icon.properties?.['data-icon']).to.equal('link');

    const paths = collectElements(icon, 'path');
    expect(paths).to.have.length(2);

    for (const path of paths) {
      expect(path.children ?? []).to.have.length(0);
    }

    expect(countNestedPath(icon)).to.equal(0);
    expect(collectShapeViolations(icon, 'link')).to.deep.equal([]);
  });

  it.each(ICON_NAMES)('%s icon の空要素 SVG shape が子要素を持たないこと', (name) => {
    const icon = createStaticIconHast(name);
    expect(collectShapeViolations(icon, name)).to.deep.equal([]);
  });
});
