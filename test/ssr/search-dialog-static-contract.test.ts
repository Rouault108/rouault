import { describe, expect, it } from 'vitest';

import { renderSearchDialogHtml } from '../../src/layouts/search-dialog-html.js';

describe('search dialog static contract', () => {
  it('state icons are static SVG icons rather than empty wrappers', () => {
    const rendered = renderSearchDialogHtml();

    expect(rendered).toContain('data-search-dialog-root');
    expect(rendered).toContain('aria-label="検索"');
    expect(rendered).toContain('aria-modal="true"');
    expect(rendered).toContain('data-search-dialog-field');
    expect(rendered).toContain('<ul');
    expect(rendered).toContain('role="listbox"');
    expect(rendered).toContain('hidden');
    expect(rendered).not.toContain('method="dialog"');
    expect(rendered).not.toContain('<ui-search-dialog');
    expect(rendered).not.toContain('<ui-search-field');
    expect(rendered).toContain('class="search-dialog__state-icon static-icon"');
    expect(rendered.match(/class="search-dialog__state-icon static-icon"/gu)?.length).toBe(3);
    expect(rendered).toContain('<svg');
    expect(rendered.match(/data-icon="alert-circle"/gu)?.length).toBe(2);
    expect(rendered).toContain('data-icon="search"');
    expect(rendered).not.toContain('<span class="search-dialog__state-icon" aria-hidden="true"></span>');
  });
});
