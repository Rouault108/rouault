import { expect, test, type Locator, type Page } from '@playwright/test';

const searchQuery = 'csharp';

const getSearchTrigger = (page: Page): Locator =>
  page.locator('layout-header [data-search-dialog-trigger]').first();

const getDialog = (page: Page): Locator => page.locator('#global-search-dialog');

const waitForSearchDialogDom = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const dialog = document.querySelector('#global-search-dialog');
    return (
      dialog instanceof HTMLDialogElement &&
      dialog.querySelector('[data-search-dialog-field]') instanceof HTMLElement &&
      dialog.querySelector('[data-search-dialog-input]') instanceof HTMLInputElement &&
      dialog.querySelector('[data-search-dialog-clear]') instanceof HTMLButtonElement &&
      dialog.querySelector('[data-search-dialog-close]') instanceof HTMLButtonElement &&
      dialog.querySelector('[data-search-dialog-results]') instanceof HTMLUListElement
    );
  });
};

const openSearchDialog = async (page: Page): Promise<void> => {
  await waitForSearchDialogDom(page);
  const trigger = getSearchTrigger(page);
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(getDialog(page)).toHaveAttribute('open', '');
  await expect(page.locator('[data-search-dialog-input]')).toBeFocused();
};

const typeSearchQuery = async (page: Page, query = searchQuery): Promise<void> => {
  const input = page.locator('[data-search-dialog-input]');
  await input.fill(query);
  await expect(input).toHaveValue(query);
};

const renderSyntheticSearchResult = async (page: Page, query = searchQuery): Promise<void> => {
  await page.evaluate((currentQuery) => {
    const input = document.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    if (input === null) throw new Error('search dialog input is unavailable');
    input.value = currentQuery;
    document.dispatchEvent(
      new CustomEvent('search-dialog:query-change', { detail: { query: currentQuery } }),
    );
    document.dispatchEvent(
      new CustomEvent('search-dialog:loading-change', { detail: { loading: false } }),
    );
    document.dispatchEvent(
      new CustomEvent('search-dialog:results-change', {
        detail: {
          query: currentQuery,
          items: [
            {
              id: '/notes/program/csharp/',
              title: 'C#仕様読解と実装理解',
              renderHref: '/notes/program/csharp/',
              canonicalPathname: '/notes/program/csharp/',
              path: 'notes / program / csharp',
              keywords: [currentQuery],
            },
          ],
        },
      }),
    );
  }, query);
  await expect(page.locator('[data-search-dialog-input]')).toHaveValue(query);
};

const waitForSearchResults = async (page: Page): Promise<Locator> => {
  const results = page.locator('[data-search-dialog-results]');
  await expect(results).toBeVisible({ timeout: 15_000 });
  const firstOption = results.locator('[role="option"]').first();
  await expect(firstOption).toBeVisible({ timeout: 15_000 });
  return firstOption;
};

const getSearchTriggerIsFocused = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const header = document.querySelector('layout-header');
    const trigger = header?.shadowRoot?.querySelector('[data-search-dialog-trigger]');
    return (
      trigger === document.activeElement ||
      (header === document.activeElement && trigger === header?.shadowRoot?.activeElement)
    );
  });

test.describe('search dialog static contract', () => {
  test('final HTML keeps the static dialog and listbox contract', async ({ page }) => {
    await page.goto('/');
    await waitForSearchDialogDom(page);

    const html = await page.evaluate(() => document.documentElement.outerHTML);
    expect(html).not.toContain('<ui-search-dialog');
    expect(html).not.toContain('<ui-search-field');
    expect(html).not.toContain('form data-search-dialog-form');
    expect(html).not.toContain('method="dialog"');

    const dialog = getDialog(page);
    await expect(dialog).toHaveAttribute('aria-label', '検索');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('data-search-dialog-root', '');
    await expect(dialog).toHaveAttribute('data-hydration-key', 'search-dialog-enhancer');
    await expect(dialog).toHaveAttribute('data-hydration-capability', 'interactive');
    await expect(dialog).toHaveAttribute('data-hydration-trigger', 'initial');

    const results = page.locator('[data-search-dialog-results]');
    await expect(results).toHaveJSProperty('tagName', 'UL');
    await expect(results).toHaveAttribute('role', 'listbox');
    await expect(results).toHaveAttribute('hidden');

    const input = page.locator('[data-search-dialog-input]');
    const resultsId = await results.getAttribute('id');
    await expect(input).toHaveAttribute('role', 'combobox');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(input).toHaveAttribute('aria-controls', resultsId ?? '');
  });

  test('field CSS and real pointer operations keep the input clickable', async ({ page }) => {
    await page.goto('/');
    await openSearchDialog(page);

    const cssMetrics = await page.locator('[data-search-dialog-field]').evaluate((field) => {
      const input = field.querySelector('[data-search-dialog-input]');
      const icon = field.querySelector('.search-dialog__field-icon');
      if (
        !(field instanceof HTMLElement) ||
        !(input instanceof HTMLElement) ||
        !(icon instanceof HTMLElement)
      ) {
        throw new Error('search dialog field fixture is invalid');
      }

      const inputStyle = getComputedStyle(input);
      const iconRect = icon.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();

      return {
        fieldAfterPointerEvents: getComputedStyle(field, '::after').pointerEvents,
        iconPointerEvents: getComputedStyle(icon).pointerEvents,
        iconSvgPointerEvents: getComputedStyle(icon.querySelector('svg') ?? icon).pointerEvents,
        paddingInlineStart: Number.parseFloat(inputStyle.paddingInlineStart),
        inputLeft: inputRect.left,
        inputTop: inputRect.top,
        inputWidth: inputRect.width,
        inputHeight: inputRect.height,
        iconRightOffset: iconRect.right - inputRect.left,
      };
    });

    expect(cssMetrics.fieldAfterPointerEvents).toBe('none');
    expect(cssMetrics.iconPointerEvents).toBe('none');
    expect(cssMetrics.iconSvgPointerEvents).toBe('none');
    expect(cssMetrics.paddingInlineStart).toBeGreaterThanOrEqual(cssMetrics.iconRightOffset);

    const input = page.locator('[data-search-dialog-input]');
    const clickPoints = [
      {
        x: cssMetrics.inputLeft + cssMetrics.inputWidth / 2,
        y: cssMetrics.inputTop + cssMetrics.inputHeight / 2,
      },
      {
        x: cssMetrics.inputLeft + Math.max(4, cssMetrics.paddingInlineStart / 2),
        y: cssMetrics.inputTop + cssMetrics.inputHeight / 2,
      },
      {
        x: cssMetrics.inputLeft + cssMetrics.paddingInlineStart + 8,
        y: cssMetrics.inputTop + cssMetrics.inputHeight / 2,
      },
    ];

    for (const point of clickPoints) {
      await page.mouse.click(point.x, point.y);
      await expect(input).toBeFocused();
    }

    await typeSearchQuery(page);
    await expect(input).toHaveValue(searchQuery);
    const clearMetrics = await page.locator('[data-search-dialog-clear]').evaluate((clear) => {
      if (!(clear instanceof HTMLElement)) throw new Error('clear button fixture is invalid');
      const clearRect = clear.getBoundingClientRect();
      return {
        clearAfterPointerEvents: getComputedStyle(clear, '::after').pointerEvents,
        clearIconPointerEvents: getComputedStyle(
          clear.querySelector('.search-dialog__clear-icon') ?? clear,
        ).pointerEvents,
        clearSvgPointerEvents: getComputedStyle(clear.querySelector('svg') ?? clear).pointerEvents,
        clearInlineSize: Number.parseFloat(getComputedStyle(clear).inlineSize),
        clearBlockSize: Number.parseFloat(getComputedStyle(clear).blockSize),
        clearWidth: clearRect.width,
        clearHeight: clearRect.height,
      };
    });
    expect(clearMetrics.clearAfterPointerEvents).toBe('none');
    expect(clearMetrics.clearIconPointerEvents).toBe('none');
    expect(clearMetrics.clearSvgPointerEvents).toBe('none');
    expect(clearMetrics.clearInlineSize).toBeGreaterThanOrEqual(44);
    expect(clearMetrics.clearBlockSize).toBeGreaterThanOrEqual(44);
    expect(clearMetrics.clearWidth).toBeGreaterThanOrEqual(43.5);
    expect(clearMetrics.clearHeight).toBeGreaterThanOrEqual(43.5);

    await page.locator('[data-search-dialog-clear]').click();
    await expect(input).toHaveValue('');

    await typeSearchQuery(page);
    await page.locator('[data-search-dialog-clear] svg').click();
    await expect(input).toHaveValue('');

    await page.locator('[data-search-dialog-close] svg').click();
    await expect(getDialog(page)).not.toHaveAttribute('open', '');
  });

  test('keyboard, backdrop, close, and selection lifecycle remain usable', async ({ page }) => {
    await page.goto('/');
    await openSearchDialog(page);

    await page.keyboard.press('Escape');
    await expect(getDialog(page)).not.toHaveAttribute('open', '');
    await expect.poll(() => getSearchTriggerIsFocused(page)).toBe(true);

    await openSearchDialog(page);
    const dialogBox = await getDialog(page).boundingBox();
    if (dialogBox === null) throw new Error('search dialog box is unavailable');
    await page.mouse.click(Math.max(1, dialogBox.x - 12), Math.max(1, dialogBox.y - 12));
    await expect(getDialog(page)).not.toHaveAttribute('open', '');
    await expect.poll(() => getSearchTriggerIsFocused(page)).toBe(true);

    await page.keyboard.press('Control+K');
    await expect(getDialog(page)).toHaveAttribute('open', '');
    await renderSyntheticSearchResult(page);
    const firstOption = await waitForSearchResults(page);
    await expect(firstOption).toHaveAttribute('data-item-id', '/notes/program/csharp/');
    await expect(firstOption.locator('mark').first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(getDialog(page)).not.toHaveAttribute('open', '');

    await page.goto('/');
    await openSearchDialog(page);
    await renderSyntheticSearchResult(page);
    const pointerOption = await waitForSearchResults(page);
    const clickableText =
      (await pointerOption.locator('mark').first().count()) > 0
        ? pointerOption.locator('mark').first()
        : pointerOption.locator('.search-dialog__result-title, .search-dialog__result-path').first();
    await clickableText.click();
    await expect(getDialog(page)).not.toHaveAttribute('open', '');
    await expect.poll(() => getSearchTriggerIsFocused(page)).toBe(false);
  });

  test('unavailable mode opens from the header trigger and shows unavailable state', async ({
    page,
  }) => {
    await page.route('**/assets/internal-document-routes.json**', (route) => route.abort());
    await page.goto('/');
    await waitForSearchDialogDom(page);

    await getSearchTrigger(page).click();
    await expect(getDialog(page)).toHaveAttribute('open', '');
    await expect(page.locator('[data-search-dialog-unavailable]')).toBeVisible();
    await expect(page.locator('[data-search-dialog-loading]')).toBeHidden();
    await expect(page.locator('[data-search-dialog-results]')).toBeHidden();
  });

  test('close/open race does not reopen and reduced motion close completes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await openSearchDialog(page);

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent('search-dialog:close-request', {
          detail: { reason: 'programmatic' },
        }),
      );
      document.dispatchEvent(
        new CustomEvent('search-dialog:open-request', {
          detail: { trigger: null, modality: 'pointer' },
        }),
      );
    });

    await expect(getDialog(page)).not.toHaveAttribute('open', '');
    await expect(getDialog(page)).not.toHaveAttribute('data-closing');

    await openSearchDialog(page);
    await page.locator('[data-search-dialog-close]').click();
    await expect(getDialog(page)).not.toHaveAttribute('open', '');
  });
});
