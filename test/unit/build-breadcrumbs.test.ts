import { expect } from '@open-wc/testing';
import { buildBreadcrumbs } from '../../lib/content/build-breadcrumbs.js';

describe('buildBreadcrumbs', () => {
  it('directory-index がある中間階層だけリンク付きパンくずになること', () => {
    const breadcrumbs = buildBreadcrumbs(
      {
        slug: 'computer-science/algorithms/sorting',
        title: 'ソートアルゴリズム比較',
        permalink: '/notes/computer-science/algorithms/sorting',
        noteKind: 'leaf',
      },
      [
        {
          slug: 'computer-science',
          title: '計算機科学',
          permalink: '/notes/computer-science',
          noteKind: 'directory-index',
          directoryPath: 'computer-science',
        },
        {
          slug: 'computer-science/algorithms',
          title: 'アルゴリズム',
          permalink: '/notes/computer-science/algorithms',
          noteKind: 'directory-index',
          directoryPath: 'computer-science/algorithms',
        },
      ],
    );

    expect(breadcrumbs).to.deep.equal([
      { label: 'Notes', href: '/' },
      { label: '計算機科学', href: '/notes/computer-science' },
      { label: 'アルゴリズム', href: '/notes/computer-science/algorithms' },
      { label: 'ソートアルゴリズム比較' },
    ]);
  });

  it('slugがない場合は空配列を返すこと', () => {
    expect(buildBreadcrumbs({ title: 'タイトルのみ' })).to.deep.equal([]);
  });
});
