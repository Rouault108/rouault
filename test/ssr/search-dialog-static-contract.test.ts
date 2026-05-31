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
  });
});
