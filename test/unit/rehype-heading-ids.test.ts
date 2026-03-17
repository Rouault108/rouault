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

    const h2 = tree.children?.[0];
    if (!h2) return;
    const h1 = tree.children?.[1];
    if (!h1) return;

    expect(h2.properties?.['id']).to.equal('導入');

    const h2Children = h2.children ?? [];
    expect(h2Children).to.have.length(2);

    const textWrapper = h2Children[0];
    if (!textWrapper) return;
    expect(textWrapper.tagName).to.equal('span');
    expect(textWrapper.properties?.['className']).to.deep.equal(['heading-text']);

    const anchor = h2Children[1];
    if (!anchor) return;
    expect(anchor.tagName).to.equal('a');
    expect(anchor.properties?.['className']).to.deep.equal(['heading-anchor']);
    expect(anchor.properties?.['href']).to.equal('#導入');
    expect(anchor.properties?.['aria-label']).to.equal('「導入」への固定リンク');

    const icon = anchor.children?.[0];
    if (!icon) return;
    expect(icon.tagName).to.equal('iconify-icon');
    expect(icon.properties?.['icon']).to.equal('lucide:link');

    const h1Children = h1.children ?? [];
    expect(h1Children).to.have.length(1);
  });
});
