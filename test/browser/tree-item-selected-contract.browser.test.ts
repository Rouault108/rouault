import { html } from 'lit/static-html.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import '../../src/components/ui/tree-item/tree-item.js';

import type { TreeItem } from '../../src/components/ui/tree-item/tree-item.js';
import { ensureMainCssLoaded } from './helpers/load-main-css.js';
import {
  compositeOver,
  expectColorClose,
  expectContrast,
  expectVisibleElementPaint,
  expectVisiblePseudoPaint,
  resolveComputedColor,
  resolvePaintedElementBackground,
  resolvePseudoColor,
  type Rgba,
} from './helpers/color-contrast.js';
import { waitForLitUpdate, waitForStyleRecalc } from './harness/browser-test-utilities.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);
  if (value === null || value === undefined) throw new Error(`${name} が見つかりません`);
  return value;
};

const flush = async (item: TreeItem): Promise<void> => {
  await waitForLitUpdate(item);
  await waitForStyleRecalc();
};

const resolveTreeItemSelectedSurface = (item: TreeItem): Rgba => {
  const surface = expectPresent(
    item.shadowRoot?.querySelector<HTMLElement>('.surface'),
    'tree item surface',
  );
  const color = resolvePseudoColor(surface, '::before', 'background-color');
  expectVisiblePseudoPaint(surface, '::before', color, 'tree item selected surface');
  return color;
};

const resolveTreeItemBaseBackground = (item: TreeItem, wrapper: HTMLElement): Rgba => {
  const surface = item.shadowRoot?.querySelector<HTMLElement>('.surface');
  return resolvePaintedElementBackground(surface ?? item, wrapper);
};

describe('ui-tree-item selected visual contract', () => {
  beforeEach(async () => {
    await ensureMainCssLoaded();
  });

  it('selected leaf の surface / indicator が readable contrast を満たすこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="background: var(--bg-surface-1); padding: 8px;">
        <ui-tree-item label="Leaf" href="/notes/leaf" selected></ui-tree-item>
      </div>
    `);
    const item = expectPresent(wrapper.querySelector<TreeItem>('ui-tree-item'), 'tree item');
    await flush(item);

    const foreground = resolveComputedColor(
      getComputedStyle(expectPresent(item.shadowRoot?.querySelector<HTMLElement>('.item'), 'item'))
        .color,
      item,
      'color',
    );
    const baseBackground = resolveTreeItemBaseBackground(item, wrapper);
    const selectedSurface = resolveTreeItemSelectedSurface(item);
    const paintedSurface = compositeOver(selectedSurface, baseBackground);

    const indicator = expectPresent(
      item.shadowRoot?.querySelector<HTMLElement>('.current-slot-indicator'),
      'current slot indicator',
    );
    const indicatorColor = resolveComputedColor(
      getComputedStyle(indicator).backgroundColor,
      indicator,
      'background-color',
    );
    expectVisibleElementPaint(indicator, indicatorColor, 'current slot indicator');
    const paintedIndicator = compositeOver(indicatorColor, paintedSurface);

    expectContrast(foreground, paintedSurface, 4.5);
    expectContrast(paintedIndicator, paintedSurface, 3);
  });

  it('selected branch glyph が iconify glyph まで active foreground に追従すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="background: var(--bg-surface-1); padding: 8px;">
        <ui-tree-item label="Branch" selected expanded>
          <ui-tree-item slot="children" label="Child"></ui-tree-item>
        </ui-tree-item>
      </div>
    `);
    const item = expectPresent(wrapper.querySelector<TreeItem>('ui-tree-item'), 'tree item');
    await flush(item);

    const currentSlot = expectPresent(
      item.shadowRoot?.querySelector<HTMLElement>('.current-slot.is-branch'),
      'current branch slot',
    );
    const expandGlyph = expectPresent(
      item.shadowRoot?.querySelector<HTMLElement>('.expand-glyph'),
      'expand glyph',
    );
    const svgIcon = expectPresent(
      expandGlyph.querySelector<SVGElement>('svg[data-icon]'),
      'expand icon',
    );
    expect(svgIcon.getAttribute('data-icon'), 'icon attribute').to.equal('chevron-right');
    await waitForStyleRecalc();

    const active = resolveComputedColor(getComputedStyle(currentSlot).color, currentSlot, 'color');
    expectColorClose(
      resolveComputedColor(getComputedStyle(expandGlyph).color, expandGlyph, 'color'),
      active,
    );
    expectColorClose(
      resolveComputedColor(getComputedStyle(svgIcon).color, svgIcon, 'color'),
      active,
    );
  });
});
