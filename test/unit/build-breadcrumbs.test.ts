import { expect } from '@open-wc/testing';
import { buildBreadcrumbs } from '../../lib/content/build-breadcrumbs.js';

describe('buildBreadcrumbs', () => {
  it('ノートslugからパンくずを生成できること', () => {
    const breadcrumbs = buildBreadcrumbs({
      slug: 'computer-science/algorithms/sorting',
      title: 'ソートアルゴリズム比較',
      permalink: '/notes/computer-science/algorithms/sorting',
    });

    expect(breadcrumbs).to.deep.equal([
      { label: 'Notes', href: '/' },
      { label: 'Computer Science' },
      { label: 'Algorithms' },
      { label: 'ソートアルゴリズム比較' },
    ]);
  });

  it('slugがない場合は空配列を返すこと', () => {
    expect(buildBreadcrumbs({ title: 'タイトルのみ' })).to.deep.equal([]);
  });
});
