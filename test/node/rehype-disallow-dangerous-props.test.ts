import { describe, expect, it } from 'vitest';
import { rehypeDisallowDangerousProps } from '../../build/rehype/disallow-dangerous-props.js';
import { RehypeLinkContractError } from '../../build/rehype/link-contract-error.js';

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

  it('Shiki が生成した style 属性は許可すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {
            className: ['shiki', 'shiki-themes', 'github-light', 'github-dark'],
            style: 'background-color:#fff;color:#111',
          },
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'span',
                  properties: { style: 'color:#D73A49;--shiki-dark:#F97583' },
                  children: [],
                },
              ],
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

  it('class 属性で表現された Shiki subtree も許可すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {
            class: 'shiki shiki-themes github-light github-dark',
            style: 'background-color:#fff;color:#111',
          },
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {},
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
    expect(run).to.throw(RehypeLinkContractError);
    expect(run).to.throw('event handler attribute onclick is not allowed');
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
    expect(run).to.throw(RehypeLinkContractError);
    expect(run).to.throw('unsafe link href is forbidden');
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
    expect(run).to.throw(RehypeLinkContractError);
    expect(run).to.throw('style property color is not allowed');
  });

  it('SVG / MathML subtree の URL-bearing attribute を禁止すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'svg',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'a',
              properties: { href: 'https://example.com' },
              children: [],
            },
          ],
        },
      ],
    };

    const run = () => {
      rehypeDisallowDangerousProps()(tree, { path: 'content/notes/sample.md' });
    };
    expect(run).to.throw(RehypeLinkContractError);
    expect(run).to.throw('SVG/MathML attribute href is not allowed');
  });

  it('canonical footnote fragment href と hydration 属性を許可すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: {
            href: '#fn-note-a',
            role: 'doc-noteref',
            'data-footnote-ref': 'true',
            'data-footnote-id': 'fn-note-a',
            'data-hydration-key': 'footnote-popover-enhancer',
            'data-hydration-capability': 'progressive',
            'data-hydration-trigger': 'post-commit',
          },
          children: [],
        },
        {
          type: 'element',
          tagName: 'a',
          properties: {
            href: '#fn-note-a-ref-1',
            role: 'doc-backlink',
            'data-footnote-backref': 'true',
          },
          children: [],
        },
      ],
    };

    const run = () => {
      rehypeDisallowDangerousProps()(tree, { path: 'content/notes/sample.md' });
    };
    expect(run).not.to.throw();
  });

  it('脚注構造リンクでも危険な URL スキームを禁止すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: { href: 'javascript:alert(1)', 'data-footnote-ref': 'true' },
          children: [],
        },
      ],
    };

    const run = () => {
      rehypeDisallowDangerousProps()(tree, { path: 'content/notes/sample.md' });
    };
    expect(run).to.throw(RehypeLinkContractError);
    expect(run).to.throw('unsafe link href is forbidden');
  });
});
