import { expect } from '@open-wc/testing';
import { rehypeHeadingIds } from '../../lib/rehype/rehype-heading-ids.js';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

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
});
