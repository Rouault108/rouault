import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const mainCss = readFileSync(resolve(process.cwd(), 'src/assets/css/main.css'), 'utf8');
const tokensCss = readFileSync(resolve(process.cwd(), 'src/assets/css/tokens.css'), 'utf8');

describe('toc scroll css contract', () => {
  it('root scroll-padding は固定ヘッダー分だけを担うこと', () => {
    expect(mainCss).toContain('scroll-padding-top: var(--header-height, 48px);');
    expect(mainCss).not.toContain(
      'scroll-padding-top: calc(var(--header-height) + var(--space-4))',
    );
  });

  it('heading scroll-margin は TOC 専用の読書余白 token を使うこと', () => {
    expect(tokensCss).toContain('--toc-heading-scroll-margin-top: var(--space-8, 32px);');
    expect(mainCss).toContain(
      'scroll-margin-top: var(--toc-heading-scroll-margin-top, var(--space-8, 32px));',
    );
    expect(mainCss).not.toContain('scroll-margin-top: calc(var(--header-height) + var(--space-8');
  });
});
