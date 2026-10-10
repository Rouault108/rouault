import { expect, type Page } from '@playwright/test';

export type HeaderMenuKind = 'corpus' | 'theme';

export const searchTriggerSelector = 'header[data-layout-header] [data-search-dialog-trigger]';

export const headerMenuTriggerSelector = (menu: HeaderMenuKind): string =>
  `header[data-layout-header] [data-header-menu="${menu}"] > [data-header-menu-trigger]`;

export const themeTriggerRootSelector = headerMenuTriggerSelector('theme');

export const searchDialogSelector = 'dialog[data-search-dialog-root]';

export const closeSearchDialog = async (page: Page): Promise<void> => {
  await page.keyboard.press('Escape');
  await expect(page.locator(searchDialogSelector)).not.toHaveAttribute('open', '');
};

export const expectMenuOpen = async (
  page: Page,
  menu: 'corpus' | 'theme',
  open: boolean,
): Promise<void> => {
  const menuLocator = page.locator(`header[data-layout-header] [data-header-menu="${menu}"]`);
  const trigger = menuLocator.locator('[data-header-menu-trigger]');
  if (open) {
    await expect(menuLocator).toHaveAttribute('open', '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  } else {
    await expect(menuLocator).not.toHaveAttribute('open', '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  }
};

export const prepareHeaderMenuItems = async (
  page: Page,
  menu: 'corpus' | 'theme',
  labels: readonly string[],
): Promise<void> => {
  await page.locator(`header[data-layout-header] [data-header-menu="${menu}"]`).evaluate(
    (menuElement, itemLabels) => {
      const list = menuElement.querySelector('ul');
      if (list === null) {
        throw new Error(
          `${menuElement.getAttribute('data-header-menu') ?? 'header'} menu list is missing.`,
        );
      }

      const firstItem = list.querySelector('li');
      if (firstItem === null) {
        throw new Error(
          `${menuElement.getAttribute('data-header-menu') ?? 'header'} menu item is missing.`,
        );
      }

      while (list.children.length < itemLabels.length) {
        list.append(firstItem.cloneNode(true));
      }

      const menuKind = menuElement.getAttribute('data-header-menu');

      for (const [index, label] of itemLabels.entries()) {
        const item = list.querySelectorAll<HTMLElement>('[data-header-menu-item]').item(index);
        item.setAttribute('data-header-menu-text', label);
        const labelNode =
          menuKind === 'corpus'
            ? item.querySelector<HTMLElement>('.corpus-menu-item__label')
            : item.querySelector<HTMLElement>('span');

        if (labelNode === null) {
          throw new Error(`${menuKind ?? 'header'} menu item label is missing.`);
        }

        labelNode.textContent = label;
      }
    },
    [...labels],
  );
};
