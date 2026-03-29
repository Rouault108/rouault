import { expect } from '@open-wc/testing';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { remarkExpandExampleIncludes } from '../../lib/remark/expand-example-includes.js';

describe('remarkExpandExampleIncludes', () => {
  it('registered ref を shared snippet へ展開すること', async () => {
    const tree = unified().use(remarkParse).parse('::example-include{ref="code/core"}');

    await remarkExpandExampleIncludes()(tree, {
      path: 'content/testing/code.md',
    });

    const root = tree as { children?: { type?: string; children?: { value?: string }[] }[] };
    expect(root.children?.[0]?.type).to.equal('heading');
    expect(root.children?.[0]?.children?.[0]?.value).to.equal('コード関係');
  });

  it('未登録 ref は build error にすること', async () => {
    const tree = unified().use(remarkParse).parse('::example-include{ref="missing/example"}');

    const run = async () => {
      await remarkExpandExampleIncludes()(tree, {
        path: 'content/testing/code.md',
      });
    };

    await expect(run()).to.be.rejectedWith(
      '[markdown] example-include の ref "missing/example" は未登録です',
    );
  });

  it('included markdown を GFM table / footnote として再パースすること', async () => {
    const tree = unified().use(remarkParse).parse('::example-include{ref="markdown-basic/core"}');

    await remarkExpandExampleIncludes()(tree, {
      path: 'content/testing/markdown-basic.md',
    });

    const root = tree as {
      children?: { type?: string }[];
    };

    expect(root.children?.some((node) => node.type === 'table')).to.equal(true);
    expect(root.children?.some((node) => node.type === 'footnoteDefinition')).to.equal(true);
  });
});