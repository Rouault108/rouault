import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { expectCssIncludes } from './css-contract-test-helpers.js';

const footnotesCss = readFileSync(resolve(process.cwd(), 'src/assets/css/footnotes.css'), 'utf8');

describe('footnote endnotes main css contract', () => {
  it('footnotes.css が doc-endnotes 主体の hanging indent 契約を保持すること', () => {
    expectCssIncludes(footnotesCss, [
      `section[role='doc-endnotes']`,
      '> h2#footnote-label',
      'margin-block-end: var(--space-4, 16px)',
      'list-style-position: outside',
      'padding-inline-start',
      'li > :first-child',
      'li > :last-child',
      'data-footnote-backref',
    ]);
  });

  it('footnotes.css が脚注見出しを sr-only 前提で隠さないこと', () => {
    expect(footnotesCss).not.toContain("section[role='doc-endnotes'] .sr-only");
    expect(footnotesCss).not.toContain('section.footnotes .sr-only');
  });
});
