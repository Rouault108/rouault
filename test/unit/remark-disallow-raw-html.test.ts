import { expect } from '@open-wc/testing';
import { remarkDisallowRawHtml } from '../../lib/remark/disallow-raw-html.js';

interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
  position?: {
    start?: {
      line?: number;
      column?: number;
    };
  };
}

describe('remarkDisallowRawHtml', () => {
  it('生HTMLノードを検知したらエラーを投げること', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'before' }],
        },
        {
          type: 'html',
          value: '<ui-callout>forbidden</ui-callout>',
          position: { start: { line: 10, column: 3 } },
        },
      ],
    };

    const run = () => {
      remarkDisallowRawHtml()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.throw('[markdown] 生HTMLは使用できません: content/notes/sample.md:10:3');
  });

  it('生HTMLが存在しない場合はエラーを投げないこと', () => {
    const tree: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'safe markdown' }],
        },
      ],
    };

    const run = () => {
      remarkDisallowRawHtml()(tree, { path: 'content/notes/sample.md' });
    };

    expect(run).to.not.throw();
  });
});
