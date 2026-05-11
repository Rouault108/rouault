import { describe, expect, it } from 'vitest';

import { rehypeOrderedListContracts } from '../../build/rehype/ordered-list-contracts.js';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

describe('rehypeOrderedListContracts', () => {
  it('通常本文の ol には counter 補助属性を付与すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ol',
          properties: { start: '10' },
          children: [
            { type: 'element', tagName: 'li', properties: {}, children: [] },
            { type: 'element', tagName: 'li', properties: {}, children: [] },
          ],
        },
      ],
    };

    rehypeOrderedListContracts()(tree);

    const ol = tree.children?.[0];
    expect(ol?.properties?.['role']).to.equal('list');
    expect(String(ol?.properties?.['style'])).to.contain('--ui-ol-counter-reset');
  });

  it('canonical endnotes の direct ol は ordered-list contract の対象外にすること', () => {
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
              children: [
                { type: 'element', tagName: 'li', properties: { id: 'fn-a' }, children: [] },
              ],
            },
          ],
        },
      ],
    };

    rehypeOrderedListContracts()(tree);

    const section = tree.children?.[0];
    const ol = section?.children?.[1];
    const li = ol?.children?.[0];
    expect(ol?.properties?.['role']).to.equal(undefined);
    expect(ol?.properties?.['data-marker-digits']).to.equal(undefined);
    expect(ol?.properties?.['style']).to.equal(undefined);
    expect(li?.properties?.['role']).to.equal(undefined);
    expect(li?.properties?.['data-ol-has-value']).to.equal(undefined);
    expect(li?.properties?.['style']).to.equal(undefined);
  });
});
