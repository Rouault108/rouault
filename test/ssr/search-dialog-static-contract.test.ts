import { describe, expect, it } from 'vitest';

import { renderSearchDialogHtml } from '../../src/layouts/search-dialog-html.js';
import { SEARCH_DIALOG_STATUS_IDLE_MESSAGE } from '../../src/search/search-dialog-constants.js';

describe('search dialog static contract', () => {
  it('state icons are static SVG icons rather than empty wrappers', () => {
    const rendered = renderSearchDialogHtml();

    expect(rendered).toContain('data-search-dialog-root');
    expect(rendered).toContain('data-hydration-key="search-dialog-enhancer"');
    expect(rendered).toContain('data-hydration-capability="interactive"');
    expect(rendered).toContain('data-hydration-trigger="initial"');
    expect(rendered).toContain('aria-label="検索"');
    expect(rendered).toContain('aria-modal="true"');
    expect(rendered).toContain('data-search-dialog-field');
    expect(rendered).toContain(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);
    expect(rendered).toMatch(/<input[\s\S]*role="combobox"[\s\S]*aria-controls="global-search-results"/u);
    expect(rendered).toContain('id="global-search-instructions"');
    expect(rendered).toMatch(
      /<input\b(?=[^>]*\baria-describedby="global-search-instructions")(?=[^>]*\bdata-search-dialog-input\b)[^>]*>/u,
    );
    expect(rendered).toContain(
      '検索結果がある場合は、上下矢印キーで候補を移動し、Enterキーでメモへ移動します。Escapeキーで検索を閉じます。',
    );
    expect(rendered).toMatch(
      /<p\b(?=[^>]*\bdata-search-dialog-status\b)(?=[^>]*\brole="status")(?=[^>]*\baria-live="polite")(?=[^>]*\baria-atomic="true")[^>]*>/u,
    );
    expect(rendered).not.toMatch(
      /<div\b(?=[^>]*\bclass="[^"]*\bsearch-dialog__status-copy\b[^"]*")(?=[^>]*\brole="status")[^>]*>/u,
    );
    expect(rendered).toMatch(/<ul[\s\S]*id="global-search-results"[\s\S]*role="listbox"/u);
    expect(rendered).toContain('hidden');
    expect(rendered).not.toContain('<form');
    expect(rendered).not.toContain('method="dialog"');
    expect(rendered).not.toContain('<ui-search-dialog');
    expect(rendered).not.toContain('<ui-search-field');
    expect(rendered).toContain('class="search-dialog__state-icon static-icon"');
    expect(rendered.match(/class="search-dialog__state-icon static-icon"/gu)?.length).toBe(3);
    expect(rendered).toContain('<svg');
    expect(rendered.match(/data-icon="alert-circle"/gu)?.length).toBe(2);
    expect(rendered).toContain('data-icon="search"');
    expect(rendered).not.toContain('<span class="search-dialog__state-icon" aria-hidden="true"></span>');

    const footerMatch = rendered.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/u);
    expect(footerMatch).not.toBeNull();

    const footerHtml = footerMatch?.[0] ?? '';
    const footerOpenTag = footerHtml.match(/<footer\b[^>]*>/u)?.[0] ?? '';

    expect(footerOpenTag).toContain('aria-hidden="true"');

    const footerClassMatch = footerOpenTag.match(/\bclass="([^"]*)"/u);
    expect(footerClassMatch).not.toBeNull();
    const footerClassValue = footerClassMatch?.[1] ?? '';
    expect(footerClassValue.trim().split(/\s+/)).toContain('search-dialog__footer');

    expect(footerHtml).toMatch(
      /<kbd>↑<\/kbd>[\s\S]*?<kbd>↓<\/kbd>[\s\S]*?候補移動[\s\S]*?<kbd>Enter<\/kbd>\s*メモへ移動[\s\S]*?<kbd>Esc<\/kbd>\s*閉じる/u,
    );
  });
});
