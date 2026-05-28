import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { validateNoteContentContracts } from '../../build/content/note-content-contracts.js';
import { rehypeOrderedListContracts } from '../../build/rehype/ordered-list-contracts.js';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
}

const readCss = (fileName: string): string =>
  readFileSync(resolve(process.cwd(), 'src/assets/css', fileName), 'utf8');

describe('lists static contract', () => {
  it('ui-ul / ui-ol は note final HTML に残せないこと', () => {
    for (const tagName of ['ui-ul', 'ui-ol']) {
      expect(() =>
        validateNoteContentContracts({
          kind: 'reader',
          html: `<${tagName}><li>項目</li></${tagName}>`,
          sourceLabel: 'testing/list',
          testingArea: 'media',
        }),
      ).toThrow(tagName);
    }
  });

  it('native ul / ol と inline markup / nested list / native list attributes を保持すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ul',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'li',
              properties: {},
              children: [
                { type: 'text', value: '本文' },
                {
                  type: 'element',
                  tagName: 'strong',
                  properties: {},
                  children: [{ type: 'text', value: '強調' }],
                },
                {
                  type: 'element',
                  tagName: 'ol',
                  properties: { start: '10', reversed: true },
                  children: [
                    {
                      type: 'element',
                      tagName: 'li',
                      properties: { value: '10' },
                      children: [{ type: 'text', value: '十' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    rehypeOrderedListContracts()(tree);

    const ul = tree.children?.[0];
    const li = ul?.children?.[0];
    const strong = li?.children?.[1];
    const nestedOl = li?.children?.[2];
    const nestedLi = nestedOl?.children?.[0];

    expect(ul?.tagName).toBe('ul');
    expect(ul?.properties?.['data-list']).toBe('true');
    expect(strong?.tagName).toBe('strong');
    expect(nestedOl?.tagName).toBe('ol');
    expect(nestedOl?.properties?.['data-list']).toBe('true');
    expect(nestedOl?.properties?.['start']).toBe('10');
    expect(nestedOl?.properties?.['reversed']).toBe(true);
    expect(nestedOl?.properties?.['data-marker-digits']).toBe('2');
    expect(nestedLi?.properties?.['value']).toBe('10');
    expect(nestedLi?.properties?.['data-ol-has-value']).toBe('');
  });

  it('lists.css は marker / counter / nested spacing / forced-colors / print を担うこと', () => {
    const css = readCss('lists.css');

    expect(css).toContain('ul[data-list]');
    expect(css).toContain('ol[data-list]');
    expect(css).toContain('counter-reset: rouault-list-counter');
    expect(css).toContain('counter-increment: rouault-list-counter');
    expect(css).toContain('counter-set: rouault-list-counter');
    expect(css).toContain("ol[data-list][data-marker-digits='2']");
    expect(css).toContain(':is(ol[data-list], ul[data-list])');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('@media print');
  });
});
