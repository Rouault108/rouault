import { expect, test } from '@playwright/test';

import {
  closeSearchDialog,
  searchDialogSelector,
  searchTriggerSelector,
} from './support/header-contract.js';
import { waitForRouterDocumentHostReady } from './support/router-document-host.js';

test.describe('header static contract', () => {
  test('検索 trigger は dialog が利用可能な時だけ progressive enhancement されること', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    const trigger = page.locator(searchTriggerSelector);
    const dialog = page.locator(searchDialogSelector);
    const dialogId = await dialog.getAttribute('id');
    expect(dialogId).not.toBeNull();

    await expect(trigger).toHaveAttribute('href', '/search/');
    await expect(trigger).toHaveAttribute('aria-controls', dialogId ?? '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();

    await expect(dialog).toHaveAttribute('open', '');
    await expect(trigger).toHaveAttribute('href', '/search/');
    await expect(trigger).toHaveAttribute('aria-controls', dialogId ?? '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page).toHaveURL(/\/about\/$/u);

    await closeSearchDialog(page);
    await expect(trigger).toHaveAttribute('href', '/search/');
    await expect(trigger).toHaveAttribute('aria-controls', dialogId ?? '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('検索 trigger は anchor semantics と accessible name を維持すること', async ({ page }) => {
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    const trigger = page.locator(searchTriggerSelector);
    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAttribute('href', /\/search\/$/u);
    await expect(trigger).toHaveAttribute('aria-label', '検索ダイアログを開く');
    await expect(trigger.locator('.search-trigger__label')).toHaveAttribute('aria-hidden', 'true');
    await expect(trigger.locator('.search-trigger__label')).toHaveText('検索');
    await expect(trigger).toHaveJSProperty('tagName', 'A');
  });

  test('静的 header は disclosure と search の ARIA seed contract を維持すること', async ({
    page,
  }) => {
    await page.goto('/about/');
    await waitForRouterDocumentHostReady(page);

    const corpusMenu = page.locator('header[data-layout-header] [data-header-menu="corpus"]');
    const corpusTrigger = corpusMenu.locator('[data-header-menu-trigger]');
    const corpusPanel = corpusMenu.locator('[data-header-menu-panel]');
    const corpusItems = corpusPanel.locator('ul > li > a[data-header-menu-item]');
    const currentCorpusItems = corpusPanel.locator(
      'ul > li > a[data-header-menu-item][aria-current="page"]',
    );
    await expect(corpusMenu).toHaveJSProperty('tagName', 'DETAILS');
    await expect(corpusTrigger).toHaveJSProperty('tagName', 'SUMMARY');
    await expect(corpusPanel).toHaveJSProperty('tagName', 'NAV');
    await expect(corpusPanel).not.toHaveAttribute('role', 'menu');
    await expect(corpusMenu.locator('[role="menu"], [role="menuitem"]')).toHaveCount(0);
    await expect(corpusItems.first()).toHaveJSProperty('tagName', 'A');
    await expect(corpusItems.first()).toHaveAttribute('href', /.+/u);
    await expect(corpusItems.first()).not.toHaveAttribute('role', 'menuitem');
    await expect(corpusPanel.locator('[data-header-menu-item][role="menuitem"]')).toHaveCount(0);
    await expect(currentCorpusItems).toHaveCount(1);
    await expect(currentCorpusItems.first()).toHaveJSProperty('tagName', 'A');
    const corpusItemContract = await corpusPanel
      .locator('[data-header-menu-item]')
      .evaluateAll((items) => ({
        directAnchorItemCount: items.filter((item) =>
          item.matches('ul > li > a[data-header-menu-item]'),
        ).length,
        itemCount: items.length,
        missingHrefCount: items.filter(
          (item) =>
            !(item instanceof HTMLAnchorElement) || (item.getAttribute('href') ?? '').trim() === '',
        ).length,
      }));
    expect(corpusItemContract.itemCount).toBeGreaterThan(0);
    expect(corpusItemContract.directAnchorItemCount).toBe(corpusItemContract.itemCount);
    expect(corpusItemContract.missingHrefCount).toBe(0);
    await expect(corpusTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(corpusTrigger).toHaveAttribute('aria-controls', /.+/u);
    const corpusPanelId = await corpusTrigger.getAttribute('aria-controls');
    const corpusTriggerId = await corpusTrigger.getAttribute('id');
    expect(corpusPanelId).not.toBeNull();
    expect(corpusTriggerId).not.toBeNull();
    await expect(corpusTrigger).toHaveAttribute(
      'data-header-menu-trigger-id',
      corpusTriggerId ?? '',
    );
    await expect(corpusPanel).toHaveAttribute('id', corpusPanelId ?? '');
    await expect(corpusPanel).toHaveAttribute('data-header-menu-panel-id', corpusPanelId ?? '');
    await expect(corpusPanel).toHaveAttribute('aria-labelledby', corpusTriggerId ?? '');
    await expect(corpusPanel).toHaveAttribute('aria-label', 'コーパス');
    const corpusLinkage = await page.evaluate(() => {
      const trigger = document.querySelector(
        'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-trigger]',
      );
      const panel = document.querySelector(
        'header[data-layout-header] [data-header-menu="corpus"] [data-header-menu-panel]',
      );
      const controls = trigger?.getAttribute('aria-controls');
      return Boolean(controls && panel && document.getElementById(controls) === panel);
    });
    expect(corpusLinkage).toBe(true);

    const themeMenu = page.locator('header[data-layout-header] [data-header-menu="theme"]');
    const themeTrigger = themeMenu.locator('[data-header-menu-trigger]');
    const themePanel = themeMenu.locator('[data-header-menu-panel]');
    await expect(themePanel).toHaveAttribute('role', 'group');
    await expect(themePanel).not.toHaveAttribute('role', 'menu');
    await expect(themeMenu.locator('[role="menu"], [role="menuitem"]')).toHaveCount(0);
    await expect(themeTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(themeTrigger).toHaveAttribute('aria-controls', /.+/u);
    const themePanelId = await themeTrigger.getAttribute('aria-controls');
    const themeTriggerId = await themeTrigger.getAttribute('id');
    expect(themePanelId).not.toBeNull();
    expect(themeTriggerId).not.toBeNull();
    await expect(themeTrigger).toHaveAttribute('data-header-menu-trigger-id', themeTriggerId ?? '');
    await expect(themePanel).toHaveAttribute('id', themePanelId ?? '');
    await expect(themePanel).toHaveAttribute('data-header-menu-panel-id', themePanelId ?? '');
    await expect(themePanel).toHaveAttribute('aria-labelledby', themeTriggerId ?? '');
    await expect(themePanel).toHaveAttribute('aria-label', 'テーマ');
    const themeLinkage = await page.evaluate(() => {
      const trigger = document.querySelector(
        'header[data-layout-header] [data-header-menu="theme"] [data-header-menu-trigger]',
      );
      const panel = document.querySelector(
        'header[data-layout-header] [data-header-menu="theme"] [data-header-menu-panel]',
      );
      const controls = trigger?.getAttribute('aria-controls');
      return Boolean(controls && panel && document.getElementById(controls) === panel);
    });
    expect(themeLinkage).toBe(true);
    const themeOptions = themePanel.locator('[data-theme-value]');
    await expect(themeOptions.first()).toHaveJSProperty('tagName', 'BUTTON');
    await expect(themeOptions.first()).toHaveAttribute('aria-pressed', /true|false/u);

    const searchTrigger = page.locator(searchTriggerSelector);
    await expect(searchTrigger).toHaveAttribute('href', '/search/');
    await expect(searchTrigger).toHaveAttribute('data-no-router', 'true');
    await expect(searchTrigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(searchTrigger).toHaveAttribute('aria-controls', /.+/u);
    await expect(searchTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(searchTrigger).toHaveAccessibleName('検索ダイアログを開く');
    await expect(searchTrigger.locator('.search-trigger__label')).toBeVisible();
    await expect(searchTrigger.locator('.search-trigger__label')).toHaveText('検索');
  });
});
