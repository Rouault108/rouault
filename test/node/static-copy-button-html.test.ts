import { describe, expect, it } from 'vitest';

import { renderStaticCopyButtonHtml } from '../../shared/static-copy-button-html.js';

describe('static copy button html renderer', () => {
  it('code copy target を template id 参照だけで描画すること', () => {
    const rendered = renderStaticCopyButtonHtml({
      targetId: 'code-copy-source-1',
      label: 'コードをコピー',
      buttonClassName: 'code-copy-button',
    });

    expect(rendered).toContain('class="static-copy-control"');
    expect(rendered).toContain('class="static-copy-button code-copy-button"');
    expect(rendered).toContain('data-copy-button="true"');
    expect(rendered).toContain('data-copy-target-id="code-copy-source-1"');
    expect(rendered).toContain('data-copy-state="idle"');
    expect(rendered).toContain('aria-describedby="code-copy-source-1-copy-status"');
    expect(rendered).toContain('id="code-copy-source-1-copy-status"');
    expect(rendered).toContain('data-copy-status="true"');
    expect(rendered).toContain('class="static-icon"');
    expect(rendered).toContain('<svg');
    expect(rendered).not.toContain('data-copy-value');
    expect(rendered).not.toContain('data-code-raw');
    expect(rendered).not.toContain('<ui-copy-button');
  });

  it('short-text / permalink 以外の data-copy-value 用途を拒否すること', () => {
    expect(
      renderStaticCopyButtonHtml({
        copyValue: '/notes/example/',
        copyKind: 'permalink',
        label: 'リンクをコピー',
      }),
    ).toContain('data-copy-kind="permalink"');

    expect(() =>
      renderStaticCopyButtonHtml({
        copyValue: 'bad',
        copyKind: 'code' as never,
        label: 'コピー',
      }),
    ).toThrow('copyValue requires copyKind short-text or permalink');
  });
});
