import { expect } from '@open-wc/testing';
import { rehypeDisallowDangerousProps } from '../../lib/rehype/disallow-dangerous-props.js';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

describe('rehypeDisallowDangerousProps', () => {
  it('安全な属性は許可すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: { href: 'https://example.com' },
          children: [],
        },
        {
          type: 'element',
          tagName: 'ol',
          properties: { style: '--ui-ol-counter-reset: 0; --ui-ol-counter-step: 1' },
          children: [
            {
              type: 'element',
              tagName: 'li',
              properties: { style: '--ui-ol-counter-set: 2' },
              children: [],
            },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: { className: ['katex'] },
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: { style: 'height: 1.2em' },
              children: [],
            },
          ],
        },
      ],
    };

    const run = () => {
      rehypeDisallowDangerousProps()(tree, { path: 'content/notes/sample.md' });
    };
    expect(run).not.to.throw();
  });

  it('on* 属性を禁止すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: { onclick: 'alert(1)' },
          children: [],
        },
      ],
    };

    const run = () => {
      rehypeDisallowDangerousProps()(tree, { path: 'content/notes/sample.md' });
    };
    expect(run).to.throw('[markdown] 危険な属性 "onclick" は使用できません: content/notes/sample.md');
  });

  it('危険な URL スキームを禁止すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: { href: 'javascript:alert(1)' },
          children: [],
        },
      ],
    };

    const run = () => {
      rehypeDisallowDangerousProps()(tree, { path: 'content/notes/sample.md' });
    };
    expect(run).to.throw(
      '[markdown] 危険なURL属性 "href" は使用できません: content/notes/sample.md',
    );
  });

  it('不要な style 属性を禁止すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          properties: { style: 'color: red' },
          children: [],
        },
      ],
    };

    const run = () => {
      rehypeDisallowDangerousProps()(tree, { path: 'content/notes/sample.md' });
    };
    expect(run).to.throw(
      '[markdown] 許可されていない style 属性 "color" は使用できません: content/notes/sample.md',
    );
  });
});
