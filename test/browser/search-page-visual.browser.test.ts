import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import type { ExploreSearchResponse } from '../../shared/search/search-types.js';

import {
  appendSiteUrlContextMeta,
  createSearchPageTestContext,
  createSearchRuntime,
  expectElement,
  renderTagOrderFixture,
  staticResponse,
  tagInput,
} from './helpers/search-page-test-fixture.js';

const { cleanupSearchPageTest, enhanceWithRuntime } = createSearchPageTestContext();

describe('search-page visual', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    appendSiteUrlContextMeta();
  });

  afterEach(() => {
    cleanupSearchPageTest();
  });

  it('light / dark の未選択・選択 checkbox 枠と check は合成後も識別でき、label は24pxの操作領域を持つこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3 },
      tagCounts: { music: 4, architecture: 3 },
    };
    const root = await renderTagOrderFixture(response);
    const controller = enhanceWithRuntime(root);
    const previousTheme = document.documentElement.dataset['theme'];
    const input = tagInput(root, 'music');
    const row = expectElement(input.closest<HTMLElement>('[data-filter-option]'), 'row');
    const label = expectElement(input.closest('label'), 'label');
    const control = expectElement(
      label.querySelector<HTMLElement>('.filter-option-checkbox__control'),
      'control',
    );
    const icon = expectElement(
      control.querySelector<HTMLElement>('.filter-option-checkbox__icon'),
      'icon',
    );
    const colorProbe = document.createElement('span');
    root.append(colorProbe);
    const resolvedColor = (token: string): string => {
      colorProbe.style.color = `var(${token})`;
      return getComputedStyle(colorProbe).color;
    };
    const luminance = (rgb: readonly number[]): number =>
      rgb
        .map((value) => value / 255)
        .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
        .reduce((sum, value, index) => sum + value * ([0.2126, 0.7152, 0.0722][index] ?? 0), 0);
    const composite = (...layers: string[]): number[] => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Missing color measurement context');
      // 透明な色のRGBだけを比較せず、背景へ描画して合成後のpixelを測る。
      for (const color of layers) {
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
      }
      const pixel = context.getImageData(0, 0, 1, 1).data;
      expect(pixel[3]).toBe(255);
      return [...pixel].slice(0, 3);
    };
    const contrast = (left: readonly number[], right: readonly number[]): number => {
      const a = luminance(left);
      const b = luminance(right);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    try {
      for (const theme of ['light', 'dark']) {
        document.documentElement.dataset['theme'] = theme;
        // theme transitionの途中色をcontrastの最終値として判定しない。
        await Promise.all(
          root
            .getAnimations({ subtree: true })
            .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
            .map((animation) => animation.finished),
        );
        for (const checked of [false, true]) {
          // CSS stateの観測だけを行い、選択操作のnative behaviorは別testで固定する。
          input.checked = checked;
          const rowStyle = getComputedStyle(row);
          const controlStyle = getComputedStyle(control);
          const outer = composite(rowStyle.backgroundColor);
          const inside = composite(rowStyle.backgroundColor, controlStyle.backgroundColor);
          const border = composite(
            rowStyle.backgroundColor,
            controlStyle.backgroundColor,
            controlStyle.borderTopColor,
          );
          expect(controlStyle.backgroundColor).toBe(resolvedColor('--bg-default'));
          expect(controlStyle.borderTopColor).toBe(resolvedColor('--fg-control-affordance'));
          expect(
            contrast(border, outer),
            `${theme}/${String(checked)} border/row`,
          ).toBeGreaterThanOrEqual(3);
          expect(
            contrast(border, inside),
            `${theme}/${String(checked)} border/inside`,
          ).toBeGreaterThanOrEqual(3);
          if (checked) {
            expect(getComputedStyle(icon).color).toBe(resolvedColor('--fg-default'));
            expect(
              contrast(
                composite(
                  rowStyle.backgroundColor,
                  controlStyle.backgroundColor,
                  getComputedStyle(icon).color,
                ),
                inside,
              ),
              `${theme} check/background`,
            ).toBeGreaterThanOrEqual(3);
          }
          expect(label.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
          expect(label.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
        }
      }
    } finally {
      controller?.dispose();
      if (previousTheme === undefined) delete document.documentElement.dataset['theme'];
      else document.documentElement.dataset['theme'] = previousTheme;
    }
  });

  it('selected tags は空・1行・解除で後続位置を固定し、wrap と remove icon の中央配置を保つこと', async () => {
    const tags = [
      'architecture',
      'continuous-alphanumeric-tag-1234567890',
      'music',
      'performance',
      'security',
    ];
    const counts = Object.fromEntries(tags.map((tag, index) => [tag, index + 1]));
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: counts,
      tagCounts: counts,
    };
    const root = await renderTagOrderFixture(response);
    root.style.inlineSize = '320px';
    const controller = enhanceWithRuntime(
      root,
      undefined,
      createSearchRuntime(async () => response),
    );
    const selectedTags = expectElement(
      root.querySelector<HTMLElement>('[data-selected-tags]'),
      'selected tags',
    );
    const filterInput = expectElement(
      root.querySelector<HTMLElement>('.filter-search-field'),
      'filter input field',
    );
    const initialSelectedHeight = selectedTags.getBoundingClientRect().height;
    const followingGap = (): number =>
      filterInput.getBoundingClientRect().top - selectedTags.getBoundingClientRect().bottom;
    const initialFollowingGap = followingGap();

    await userEvent.click(tagInput(root, 'architecture'));
    await expect.poll(() => selectedTags.querySelectorAll('[data-selected-tag]').length).toBe(1);
    expect(selectedTags.getBoundingClientRect().height).toBe(initialSelectedHeight);
    expect(Math.abs(followingGap() - initialFollowingGap)).toBeLessThan(0.5);

    const remove = expectElement(
      selectedTags.querySelector<HTMLButtonElement>('.selected-tag__remove'),
      'remove button',
    );
    const icon = expectElement(
      remove.querySelector<HTMLElement>('.selected-tag__remove-icon'),
      'remove icon',
    );
    const removeRect = remove.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    expect(removeRect.width).toBeGreaterThanOrEqual(24);
    expect(removeRect.height).toBeGreaterThanOrEqual(24);
    expect(
      Math.abs(iconRect.left + iconRect.width / 2 - (removeRect.left + removeRect.width / 2)),
    ).toBeLessThan(0.5);
    expect(
      Math.abs(iconRect.top + iconRect.height / 2 - (removeRect.top + removeRect.height / 2)),
    ).toBeLessThan(0.5);

    remove.focus();
    await userEvent.keyboard(' ');
    await expect.poll(() => selectedTags.querySelectorAll('[data-selected-tag]').length).toBe(0);
    expect(selectedTags.getBoundingClientRect().height).toBe(initialSelectedHeight);
    expect(Math.abs(followingGap() - initialFollowingGap)).toBeLessThan(0.5);
    controller?.dispose();
    root.remove();

    const wrappedRoot = await renderTagOrderFixture(response, tags, 'or');
    wrappedRoot.style.inlineSize = '320px';
    const wrappedController = enhanceWithRuntime(
      wrappedRoot,
      undefined,
      createSearchRuntime(async () => response),
    );
    const wrappedSelectedTags = expectElement(
      wrappedRoot.querySelector<HTMLElement>('[data-selected-tags]'),
      'wrapped selected tags',
    );
    await expect
      .poll(() => wrappedSelectedTags.querySelectorAll('[data-selected-tag]').length)
      .toBe(5);
    expect(wrappedSelectedTags.getBoundingClientRect().height).toBeGreaterThan(
      initialSelectedHeight,
    );
    expect(getComputedStyle(wrappedSelectedTags).overflow).toBe('visible');

    wrappedRoot.style.zoom = '2';
    const zoomedRemove = expectElement(
      wrappedSelectedTags.querySelector<HTMLButtonElement>('.selected-tag__remove'),
      'zoomed remove button',
    );
    expect(zoomedRemove.getBoundingClientRect().width).toBeGreaterThanOrEqual(48);
    expect(zoomedRemove.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
    wrappedController?.dispose();
  });

  it('selected / disabled / normal row は light / dark で意味どおりの面を使うこと', async () => {
    const root = await renderTagOrderFixture(
      {
        ...staticResponse,
        allTagCounts: { architecture: 4, music: 3, security: 2 },
        tagCounts: { architecture: 4, music: 0, security: 2 },
      },
      ['architecture'],
      'and',
    );
    const previousTheme = document.documentElement.dataset['theme'];
    const probe = document.createElement('span');
    root.append(probe);
    const colorFor = (token: string): string => {
      probe.style.background = `var(${token})`;
      return getComputedStyle(probe).backgroundColor;
    };
    try {
      for (const theme of ['light', 'dark']) {
        document.documentElement.dataset['theme'] = theme;
        await Promise.all(
          root
            .getAnimations({ subtree: true })
            .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
            .map((animation) => animation.finished),
        );
        const selected = expectElement(
          root.querySelector<HTMLElement>("[data-filter-tag='architecture']"),
          'selected row',
        );
        const disabled = expectElement(
          root.querySelector<HTMLElement>("[data-filter-tag='music']"),
          'disabled row',
        );
        const available = expectElement(
          root.querySelector<HTMLElement>("[data-filter-tag='security']"),
          'available row',
        );
        expect(getComputedStyle(selected).backgroundColor).toBe(colorFor('--bg-fill-muted'));
        expect(getComputedStyle(disabled).backgroundColor).toBe(colorFor('--bg-default'));
        expect(getComputedStyle(disabled).borderStyle).toBe('dashed');
        expect(getComputedStyle(available).backgroundColor).toBe(colorFor('--bg-surface-2'));
        expect(tagInput(root, 'architecture').checked).toBe(true);
        expect(tagInput(root, 'music').disabled).toBe(true);
      }
    } finally {
      if (previousTheme === undefined) delete document.documentElement.dataset['theme'];
      else document.documentElement.dataset['theme'] = previousTheme;
    }
  });
});
