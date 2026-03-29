import { describe, expect, it } from 'vitest';

import { BaseLayout } from '../../src/layouts/BaseLayout.11ty.js';

describe('BaseLayout', () => {
  it('breadcrumb 規則を note navigation model から受け取ること', () => {
    const layout = new BaseLayout();
    const rendered = layout.render({
      content: '<p>本文</p>',
      note: {
        slug: 'computer-science/algorithms/sorting',
        title: 'ソートアルゴリズム比較',
        permalink: '/notes/computer-science/algorithms/sorting',
        noteKind: 'leaf',
      },
      notes: [
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
    });

    expect(rendered).toContain(
      'breadcrumbs-json="[{&quot;label&quot;:&quot;Notes&quot;,&quot;href&quot;:&quot;/&quot;},{&quot;label&quot;:&quot;計算機科学&quot;,&quot;href&quot;:&quot;/notes/computer-science&quot;},{&quot;label&quot;:&quot;アルゴリズム&quot;,&quot;href&quot;:&quot;/notes/computer-science/algorithms&quot;},{&quot;label&quot;:&quot;ソートアルゴリズム比較&quot;}]"',
    );
  });
});
