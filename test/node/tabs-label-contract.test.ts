import { describe, expect, it } from 'vitest';
import { parseRouaultDirectiveMdastFromMarkdown } from '../helpers/markdown-directive-test-utils.js';

const source = (label: string): string =>
  [
    '::tabs',
    '',
    '::tab{value="one"}',
    '',
    label,
    '',
    '::',
    '',
    '::panel',
    '',
    '本文',
    '',
    '::',
    '',
    '::',
  ].join('\n');

describe('Tabs label authoring contract', () => {
  it('non-interactive な formatting を変換せず保持する', () => {
    const tree = parseRouaultDirectiveMdastFromMarkdown(
      source('Text *emphasis* **strong** `code`'),
    );
    const label = tree.children?.[0]?.children?.[0]?.children?.[0];
    expect(label?.children?.map((node) => node.type)).toEqual([
      'text',
      'emphasis',
      'text',
      'strong',
      'text',
      'inlineCode',
    ]);
  });
  it.each([
    '[Link](https://example.com)',
    '**[Link](https://example.com)**',
    '[Link][ref]\n\n[ref]: https://example.com',
    '<https://example.com>',
    'https://example.com',
    'Reference[^note]\n\n[^note]: Footnote',
    '![Zoomable](https://example.com/image.png)',
    '- [ ] Task',
  ])('interactive label を build-time error にする: %s', (label) => {
    expect(() => parseRouaultDirectiveMdastFromMarkdown(source(label))).toThrow(
      'tab label は non-interactive content に限定されます',
    );
  });
});
