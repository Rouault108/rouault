import { expect, test, type Page } from '@playwright/test';

const aboutPath = '/about/';

type DropdownSnapshot = {
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
      return await page.evaluate((dropdownSelector) => {
        const header = document.querySelector('layout-header');
        const dropdown = header?.shadowRoot?.querySelector<HTMLElement>(dropdownSelector);
        const trigger = dropdown?.querySelector<HTMLElement>('[slot="trigger"]');

        return dropdown instanceof HTMLElement && trigger instanceof HTMLElement;
      }, selector);
    })
    .toBe(true);
};

const clickHeaderDropdownTrigger = async (page: Page, selector: string): Promise<void> => {
  await page.evaluate((dropdownSelector) => {
    const header = document.querySelector('layout-header');
    const dropdown = header?.shadowRoot?.querySelector<HTMLElement>(dropdownSelector);
    const trigger = dropdown?.querySelector<HTMLElement>('[slot="trigger"]');

    if (!(trigger instanceof HTMLElement)) {
      throw new Error(`trigger not found: ${dropdownSelector}`);
    }

    trigger.click();
  }, selector);
};

const clickHeaderDropdownTriggerAndRead = async (
  page: Page,
  selector: string,
): Promise<DropdownSnapshot | null> => {
  return await page.evaluate((dropdownSelector) => {
    const waitForLitCommit = async (element: Element): Promise<void> => {
      const maybeReactiveElement = element as Element & { updateComplete?: Promise<unknown> };
      if (maybeReactiveElement.updateComplete instanceof Promise) {
        await maybeReactiveElement.updateComplete;
        return;
      }

      await Promise.resolve();
    };

    const readActiveMenuItemText = (dropdownElement: HTMLElement): string | null => {
      const items = Array.from(dropdownElement.querySelectorAll<HTMLElement>('ui-menu-item'));
      const activeItem = items.find((item) => item.shadowRoot?.activeElement instanceof HTMLElement);
      return activeItem?.textContent?.trim() ?? null;
    };

    const readSnapshot = (): DropdownSnapshot | null => {
      const header = document.querySelector('layout-header');
      const dropdown =
        header?.shadowRoot?.querySelector<HTMLElement & { getMenuElement?: () => HTMLElement | null }>(
          dropdownSelector,
        ) ?? null;
      const trigger = dropdown?.querySelector<HTMLElement>('[slot="trigger"]') ?? null;
      const panel = dropdown?.getMenuElement?.() ?? null;

      if (!(dropdown instanceof HTMLElement) || !(trigger instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
        return null;
      }

      const panelRect = panel.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();

      return {
        phase: panel.dataset['positionPhase'] ?? null,
        visibility: getComputedStyle(panel).visibility,
        ariaHidden: panel.getAttribute('aria-hidden'),
        left: Number.isFinite(panelRect.left) ? Math.round(panelRect.left) : null,
        top: Number.isFinite(panelRect.top) ? Math.round(panelRect.top) : null,
        width: Number.isFinite(panelRect.width) ? Math.round(panelRect.width) : null,
        height: Number.isFinite(panelRect.height) ? Math.round(panelRect.height) : null,
        triggerBottom: Number.isFinite(triggerRect.bottom) ? Math.round(triggerRect.bottom) : null,
        activeMenuItemText: readActiveMenuItemText(dropdown),
      };
    };

    const run = async (): Promise<DropdownSnapshot | null> => {
      const header = document.querySelector('layout-header');
      const dropdown =
        header?.shadowRoot?.querySelector<HTMLElement & { getMenuElement?: () => HTMLElement | null }>(
          dropdownSelector,
        ) ?? null;
      const trigger = dropdown?.querySelector<HTMLElement>('[slot="trigger"]') ?? null;

      if (!(dropdown instanceof HTMLElement) || !(trigger instanceof HTMLElement)) {
        return null;
      }

      trigger.click();
      await waitForLitCommit(dropdown);
      return readSnapshot();
    };

    return run();
  }, selector);
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
    const items = Array.from(dropdown.querySelectorAll<HTMLElement>('ui-menu-item'));
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
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
  });

  test('theme dropdown は open 直後に hidden のまま settling し、ready 後に trigger 近傍へ出ること', async ({
    page,
  }) => {
    await page.goto(aboutPath);
    await waitForHeaderDropdown(page, '[data-dropdown="theme"]');

    const settling = await clickHeaderDropdownTriggerAndRead(page, '[data-dropdown="theme"]');
    expect(settling).not.toBeNull();
    expect(settling?.phase).toBe('settling');
    expect(settling?.visibility).toBe('hidden');
    expect(settling?.ariaHidden).toBe('true');

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
    expect(ready?.left ?? 0).toBeGreaterThan(8);
    expect(Math.abs((ready?.top ?? 0) - (ready?.triggerBottom ?? 0))).toBeLessThanOrEqual(96);
  });

  test('corpus dropdown は初回 open と再 open の両方で左上露出せず、ready 後のみ menu item に到達すること', async ({
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
      expect(ready?.left ?? 0).toBeGreaterThan(8);
      expect(ready?.top ?? 0).toBeGreaterThan(8);
      expect(ready?.width ?? 0).toBeGreaterThan(0);
      expect(ready?.height ?? 0).toBeGreaterThan(0);

      await page.keyboard.press('ArrowDown');
      await expect
        .poll(async () => {
          return await readHeaderDropdown(page, '.corpus-switcher');
        })
        .not.toMatchObject({ activeMenuItemText: null });

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
  });
});
