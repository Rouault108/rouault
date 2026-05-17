import { expect, test, type Page } from '@playwright/test';

const aboutPath = '/about/';

interface DropdownSnapshot {
  phase: string | null;
  visibility: string | null;
  ariaHidden: string | null;
  left: number | null;
  top: number | null;
  width: number | null;
  height: number | null;
  triggerBottom: number | null;
  activeMenuItemText: string | null;
};

const waitForHeaderDropdown = async (page: Page, selector: string): Promise<void> => {
  await expect
    .poll(async () => {
      return await page.evaluate(async (dropdownSelector) => {
        await customElements.whenDefined('layout-header');
        await customElements.whenDefined('ui-dropdown');

        const header = document.querySelector('layout-header');
        const maybeHeader = header as HTMLElement & { updateComplete?: Promise<unknown> };
        if (maybeHeader.updateComplete instanceof Promise) {
          await maybeHeader.updateComplete;
        }

        const dropdown = header?.shadowRoot?.querySelector<
          HTMLElement & { getMenuElement?: () => HTMLElement | null; updateComplete?: Promise<unknown> }
        >(dropdownSelector);
        if (dropdown?.updateComplete instanceof Promise) {
          await dropdown.updateComplete;
        }

        const trigger = dropdown?.querySelector<HTMLElement>('[slot="trigger"]');
        const panel = dropdown?.getMenuElement?.() ?? null;

        return (
          dropdown instanceof HTMLElement &&
          dropdown.shadowRoot instanceof ShadowRoot &&
          typeof dropdown.getMenuElement === 'function' &&
          trigger instanceof HTMLElement &&
          panel instanceof HTMLElement
        );
      }, selector);
    })
    .toBe(true);
};

const clickHeaderDropdownTrigger = async (page: Page, selector: string): Promise<void> => {
  await page.locator('layout-header').locator(selector).locator('[slot="trigger"] button').click();
};

const clickHeaderDropdownItem = async (
  page: Page,
  selector: string,
  value: string,
): Promise<void> => {
  const dropdown = page.locator('layout-header').locator(selector);
  const commandItem = dropdown.locator(`ui-menu-item[value="${value}"] button`);
  const linkItem = dropdown.locator(`ui-menu-link[href="${value}"] a`);

  if ((await commandItem.count()) > 0) {
    await commandItem.click();
    return;
  }

  await linkItem.click();
};

const readHeaderDropdown = async (page: Page, selector: string): Promise<DropdownSnapshot | null> => {
  return await page.evaluate((dropdownSelector) => {
    const header = document.querySelector('layout-header');
    const dropdown = header?.shadowRoot?.querySelector<HTMLElement & { getMenuElement?: () => HTMLElement | null }>(
      dropdownSelector,
    );
    const trigger = dropdown?.querySelector<HTMLElement>('[slot="trigger"]');
    const panel = dropdown?.getMenuElement?.() ?? null;

    if (!(dropdown instanceof HTMLElement) || !(trigger instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      return null;
    }

    const panelRect = panel.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const items = Array.from(
      dropdown.querySelectorAll<HTMLElement>('ui-menu-item, ui-menu-link'),
    );
    const activeItem = items.find((item) => item.shadowRoot?.activeElement instanceof HTMLElement);

    return {
      phase: panel.dataset['positionPhase'] ?? null,
      visibility: getComputedStyle(panel).visibility,
      ariaHidden: panel.getAttribute('aria-hidden'),
      left: Number.isFinite(panelRect.left) ? Math.round(panelRect.left) : null,
      top: Number.isFinite(panelRect.top) ? Math.round(panelRect.top) : null,
      width: Number.isFinite(panelRect.width) ? Math.round(panelRect.width) : null,
      height: Number.isFinite(panelRect.height) ? Math.round(panelRect.height) : null,
      triggerBottom: Number.isFinite(triggerRect.bottom) ? Math.round(triggerRect.bottom) : null,
      activeMenuItemText: activeItem?.textContent?.trim() ?? null,
    };
  }, selector);
};

test.describe('mobile header dropdown positioning contract', () => {
  // e2e: 実ブラウザでの最終 geometry / pointer 操作を監視する
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
  });

  test('theme dropdown は pointer で開くと trigger 近傍へ出て light / dark を選べること', async ({
    page,
  }) => {
    await page.goto(aboutPath);
    await waitForHeaderDropdown(page, '[data-dropdown="theme"]');

    await clickHeaderDropdownTrigger(page, '[data-dropdown="theme"]');

    await expect
      .poll(async () => {
        return await readHeaderDropdown(page, '[data-dropdown="theme"]');
      })
      .toMatchObject({
        phase: 'ready',
        visibility: 'visible',
        ariaHidden: 'false',
      });

    const ready = await readHeaderDropdown(page, '[data-dropdown="theme"]');
    expect(ready?.width ?? 0).toBeGreaterThan(0);
    expect(ready?.height ?? 0).toBeGreaterThan(0);
    expect(!((ready?.left ?? 0) === 0 && (ready?.top ?? 0) === 0)).toBe(true);
    expect(Math.abs((ready?.top ?? 0) - (ready?.triggerBottom ?? 0))).toBeLessThanOrEqual(96);

    await clickHeaderDropdownItem(page, '[data-dropdown="theme"]', 'light');
    await expect
      .poll(async () => {
        return await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      })
      .toBe('light');

    await clickHeaderDropdownTrigger(page, '[data-dropdown="theme"]');
    await expect
      .poll(async () => {
        return await readHeaderDropdown(page, '[data-dropdown="theme"]');
      })
      .toMatchObject({
        phase: 'ready',
        visibility: 'visible',
        ariaHidden: 'false',
      });

    await clickHeaderDropdownItem(page, '[data-dropdown="theme"]', 'dark');
    await expect
      .poll(async () => {
        return await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      })
      .toBe('dark');
  });

  test('corpus dropdown は初回 open と再 open の両方で左上露出せず、先頭項目を pointer で選べること', async ({
    page,
  }) => {
    await page.goto(aboutPath);
    await waitForHeaderDropdown(page, '.corpus-switcher');

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await clickHeaderDropdownTrigger(page, '.corpus-switcher');

      await expect
        .poll(async () => {
          return await readHeaderDropdown(page, '.corpus-switcher');
        })
        .toMatchObject({
          phase: 'ready',
          visibility: 'visible',
          ariaHidden: 'false',
        });

      const ready = await readHeaderDropdown(page, '.corpus-switcher');
      expect(!((ready?.left ?? 0) === 0 && (ready?.top ?? 0) === 0)).toBe(true);
      expect(ready?.width ?? 0).toBeGreaterThan(0);
      expect(ready?.height ?? 0).toBeGreaterThan(0);
      expect(Math.abs((ready?.top ?? 0) - (ready?.triggerBottom ?? 0))).toBeLessThanOrEqual(96);

      if (attempt === 0) {
        await page.keyboard.press('Escape');
        await expect
          .poll(async () => {
            return await readHeaderDropdown(page, '.corpus-switcher');
          })
          .toMatchObject({
            phase: 'idle',
            visibility: 'hidden',
            ariaHidden: 'true',
          });
      }
    }

    await clickHeaderDropdownItem(page, '.corpus-switcher', '/corpora/');
    await expect(page).toHaveURL(/\/corpora\/$/);
  });
});
