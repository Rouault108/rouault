import { describe, expect, it } from 'vitest';
import { renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';

import { AboutPage } from '../../src/components/about/about-page.js';

describe('AboutPage', () => {
  it('about-page の現行構造と本文を出力すること', async () => {
    const page = new AboutPage();
    const rendered = await collectResult(renderThunked(page.render()));

    expect(rendered).toContain('id="about-page-content" class="about-prose"');
    expect(rendered).toContain('About Rouault');
    expect(rendered).toContain('個人ノートを、静かに読むためのアプリケーション');
    expect(rendered).toContain('Rouault の目的と設計方針');
    expect(rendered).toContain('Snapshot');
    expect(rendered).toContain('個人ノートを読むための Web アプリケーション');
    expect(rendered).toContain('本文を優先し、落ち着いて通読できることを重視');
    expect(rendered).toContain('長期的な整理・再編集・参照を前提に設計');
    expect(rendered).toContain('Rouaultについて');
    expect(rendered).toContain('公開方針');
    expect(rendered).toContain('著作権について');
    expect(rendered).toContain('技術構成');
    expect(rendered).toContain('Creative Commons Attribution 4.0 International License');
    expect(rendered).toContain(
      '静的生成を中核に据えつつ、必要な箇所だけに動的な振る舞いを与える構成を採っています。',
    );
    expect(rendered).toContain('layout-toc');
  });
});
