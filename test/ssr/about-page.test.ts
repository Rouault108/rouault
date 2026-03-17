import { describe, expect, it } from 'vitest';
import { renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';

import { AboutPage } from '../../src/components/about/about-page.js';

describe('AboutPage', () => {
  it('about-prose に各セクションの本文を出力すること', async () => {
    const page = new AboutPage();
    const rendered = await collectResult(renderThunked(page.render()));

    expect(rendered).toContain('<div class="about-prose">');
    expect(rendered).toContain('このページについて');
    expect(rendered).toContain('Rouaultは、 Ruo Miyataの個人的なメモ帳です。');
    expect(rendered).toContain('Creative Commons Attribution 4.0 International License');
    expect(rendered).toContain('このサイトは、個人的な知的蓄積を長期的に整理・公開するためのナレッジベースとして設計されています。');
  });
});