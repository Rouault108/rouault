import { describe, expect, it } from '@open-wc/testing';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { remarkExpandExampleIncludes } from '../../lib/remark/expand-example-includes.js';

describe('remarkExpandExampleIncludes', () => {
  it('registered ref を shared snippet へ展開すること', () => {
    const tree = unified().use(remarkParse).parse('::example-include{ref="code/core"}');

    remarkExpandExampleIncludes()(tree, {
      path: 'content/testing/code.md',
    });

    const root = tree as { children?: Array<{ type?: string; children?: Array<{ value?: string }> }> };
    expect(root.children?.[0]?.type).to.equal('heading');
    expect(root.children?.[0]?.children?.[0]?.value).to.equal('コード関係');
  });

  it('未登録 ref は build error にすること', () => {
    const tree = unified().use(remarkParse).parse('::example-include{ref="missing/example"}');

    const run = () => {
      remarkExpandExampleIncludes()(tree, {
        path: 'content/testing/code.md',
      });
    };

    expect(run).to.throw('[markdown] example-include の ref "missing/example" は未登録です');
  });
});
