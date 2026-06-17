import { describe, expect, it } from 'vitest';

import {
  EMPTY_STATE_ANNOUNCE_VALUES,
  EMPTY_STATE_VARIANTS,
  renderEmptyStateHtml,
} from '../../src/layouts/empty-state-html.js';

describe('static empty state html renderer', () => {
  it('exposes only the corpus static empty-state variant and announce values', () => {
    expect(EMPTY_STATE_VARIANTS).toEqual(['default']);
    expect(EMPTY_STATE_ANNOUNCE_VALUES).toEqual(['off', 'polite']);
  });

  it('renders the corpus empty-state structure without restoring ui-empty-state', () => {
    const rendered = renderEmptyStateHtml({
      heading: '公開ノートはまだありません',
      description: 'ノートが公開されると、ここに最近更新した項目が表示されます。',
    });

    expect(rendered).toContain(
      '<section class="empty-hint" data-empty-state data-empty-variant="default">',
    );
    expect(rendered).toContain('<div class="empty-hint__message" data-announce="off">');
    expect(rendered).toContain('<div class="empty-hint__icon" aria-hidden="true"></div>');
    expect(rendered).toContain('<h2 class="empty-hint__heading">公開ノートはまだありません</h2>');
    expect(rendered).toContain(
      '<p class="empty-hint__description">ノートが公開されると、ここに最近更新した項目が表示されます。</p>',
    );
    expect(rendered).toContain('<div class="empty-hint__actions" hidden></div>');
    expect(rendered).not.toContain('<ui-empty-state');
    expect(rendered).not.toContain('role="status"');
  });

  it('escapes heading and description inside the helper', () => {
    const rendered = renderEmptyStateHtml({
      heading: 'A&B <C>',
      description: 'D&E <F>',
    });

    expect(rendered).toContain('<h2 class="empty-hint__heading">A&amp;B &lt;C&gt;</h2>');
    expect(rendered).toContain('<p class="empty-hint__description">D&amp;E &lt;F&gt;</p>');
  });

  it('omits description when it is missing or blank', () => {
    expect(renderEmptyStateHtml({ heading: 'Empty' })).not.toContain('empty-hint__description');
    expect(renderEmptyStateHtml({ heading: 'Empty', description: '' })).not.toContain(
      'empty-hint__description',
    );
    expect(renderEmptyStateHtml({ heading: 'Empty', description: '   ' })).not.toContain(
      'empty-hint__description',
    );
  });

  it('keeps announce off silent and polite live without status role', () => {
    const off = renderEmptyStateHtml({ heading: 'Empty', announce: 'off' });
    const polite = renderEmptyStateHtml({ heading: 'Empty', announce: 'polite' });

    expect(off).toContain('<div class="empty-hint__message" data-announce="off">');
    expect(off).not.toContain('aria-live=');
    expect(off).not.toContain('role="status"');
    expect(polite).toContain(
      '<div class="empty-hint__message" data-announce="polite" aria-live="polite">',
    );
    expect(polite).not.toContain('role="status"');
  });

  it('normalizes invalid runtime variant and announce values without widening public types', () => {
    const rendered = renderEmptyStateHtml({
      heading: 'Empty',
      variant: 'search' as never,
      announce: 'assertive' as never,
    });

    expect(rendered).toContain('data-empty-variant="default"');
    expect(rendered).toContain('<div class="empty-hint__message" data-announce="off">');
    expect(rendered).not.toContain('data-empty-variant="search"');
    expect(rendered).not.toContain('aria-live=');
  });
});
