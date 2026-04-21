import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it } from 'vitest';

import { expectCssIncludes } from './css-contract-test-helpers.js';

const mainCss = readFileSync(resolve(process.cwd(), 'src/assets/css/main.css'), 'utf8');

describe('footnote endnotes main css contract', () => {
  it('main.css が doc-endnotes 主体の hanging indent 契約を保持すること', () => {
    expectCssIncludes(mainCss, [
      `section[role='doc-endnotes']`,
      'list-style-position: outside',
      'padding-inline-start',
      'li > :first-child',
      'li > :last-child',
      'data-footnote-backref',
    ]);
  });
});
