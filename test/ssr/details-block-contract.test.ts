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

const getTextContent = (node: HastNode | undefined): string => {
  if (!node) {
    return '';
  }
  if (typeof node.value === 'string') {
    return node.value;
  }
  return (node.children ?? []).map((child) => getTextContent(child)).join('');
};

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
    const summary = details?.children?.[0];
    const body = details?.children?.[1];
    const chevron = summary?.children?.[0];
    const summaryContent = summary?.children?.[1];
    const svg = findElement(chevron, (node) => node.tagName === 'svg');

    expect(details?.tagName).toBe('details');
    expect(getClassList(details?.properties?.['className'])).toEqual(['details-block']);
    expect(details?.properties?.['data-details']).toBe('true');
    expect(details?.properties?.['data-details-source']).toBeUndefined();
    expect(details?.properties?.['summary']).toBeUndefined();
    expect(details?.properties?.['open']).toBe(true);
    expect(summary?.tagName).toBe('summary');
    expect(getClassList(summary?.properties?.['className'])).toEqual(['details-block__summary']);
    expect(getClassList(chevron?.properties?.['className'])).toEqual([
      'details-block__chevron',
      'static-icon',
    ]);
    expect(chevron?.properties?.['aria-hidden']).toBe('true');
    expect(svg?.tagName).toBe('svg');
    expect(chevron?.children?.length).toBeGreaterThan(0);
    expect(getClassList(summaryContent?.properties?.['className'])).toEqual([
      'details-block__summary-content',
    ]);
    expect(getTextContent(summaryContent)).toBe('補足');
    expect(body?.tagName).toBe('div');
    expect(getClassList(body?.properties?.['className'])).toEqual(['details-block__body']);
    expect(getTextContent(body)).toBe('本文');
    expect(findElement(tree, (node) => node.tagName === 'ui-details')).toBeUndefined();
  });
});
