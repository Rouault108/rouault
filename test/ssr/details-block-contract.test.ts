import { describe, expect, it } from 'vitest';

import { rehypeRouaultComponents } from '../../build/rehype/rouault-components.js';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

const findElement = (
  node: HastNode | undefined,
  predicate: (node: HastNode) => boolean,
): HastNode | undefined => {
  if (!node) {
    return undefined;
  }
  if (predicate(node)) {
    return node;
  }
  for (const child of node.children ?? []) {
    const match = findElement(child, predicate);
    if (match) {
      return match;
    }
  }
  return undefined;
};

const getClassList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

describe('details block static contract', () => {
  it('details source は native details と static chevron icon へ収束すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'details',
          properties: { 'data-details-source': 'true', summary: '補足', open: true },
          children: [
            { type: 'element', tagName: 'p', children: [{ type: 'text', value: '本文' }] },
          ],
        },
      ],
    };

    rehypeRouaultComponents()(tree);

    const details = findElement(tree, (node) => node.tagName === 'details');
    const summary = findElement(details, (node) => node.tagName === 'summary');
    const chevron = findElement(summary, (node) =>
      getClassList(node.properties?.['className']).includes('details-block__chevron'),
    );
    const svg = findElement(chevron, (node) => node.tagName === 'svg');

    expect(getClassList(details?.properties?.['className'])).toEqual(['details-block']);
    expect(details?.properties?.['data-details']).toBe('true');
    expect(details?.properties?.['data-details-source']).toBeUndefined();
    expect(summary?.tagName).toBe('summary');
    expect(getClassList(chevron?.properties?.['className'])).toEqual([
      'details-block__chevron',
      'static-icon',
    ]);
    expect(svg?.tagName).toBe('svg');
    expect(chevron?.children?.length).toBeGreaterThan(0);
    expect(findElement(tree, (node) => node.tagName === 'ui-details')).toBeUndefined();
  });
});
