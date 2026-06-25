import { resolveStaticIconBody } from '../../shared/icons/icon-paths.js';
import { THEME_CHROME_BOOTSTRAP_ICON_NAMES, THEME_UI_OPTIONS } from './theme-ui-options.js';

const buildIconBodyMap = (): Record<string, string> =>
  Object.fromEntries(
    THEME_CHROME_BOOTSTRAP_ICON_NAMES.map((name) => [name, resolveStaticIconBody(name)]),
  );

export const buildThemeChromeBootstrapScript = (): string => {
  const themeOptions = THEME_UI_OPTIONS;
  const iconBodies = buildIconBodyMap();

  return `
(() => {
  const themeOptions = ${JSON.stringify(themeOptions)};
  const iconBodies = ${JSON.stringify(iconBodies)};

  const readPreferenceValue = (value) =>
    value === 'light' || value === 'dark' || value === 'system' ? value : null;

  const preference = readPreferenceValue(document.documentElement.getAttribute('data-theme')) ?? 'system';
  const option = themeOptions[preference];
  if (!option) return;

  const patchIcon = (container, iconName) => {
    if (!(container instanceof HTMLElement)) return;
    const svg = container.querySelector('svg[data-icon]');
    const body = iconBodies[iconName];
    if (!(svg instanceof SVGElement) || typeof body !== 'string') return;
    svg.setAttribute('data-icon', iconName);
    svg.innerHTML = body;
  };

  for (const header of document.querySelectorAll('header[data-layout-header]')) {
    const trigger = header.querySelector('[data-theme-switcher] summary');
    if (trigger instanceof HTMLElement) {
      trigger.setAttribute('aria-label', 'テーマ: ' + option.label);
    }

    const main = header.querySelector('[data-theme-preference]');
    if (main instanceof HTMLElement) {
      main.setAttribute('data-theme-preference', preference);
      patchIcon(main.querySelector('.theme-trigger-icon'), option.icon);
    }

    const label = header.querySelector('[data-theme-current-label]');
    if (label instanceof HTMLElement) {
      label.textContent = option.label;
    }

    for (const item of header.querySelectorAll('[data-theme-value]')) {
      if (!(item instanceof HTMLElement)) continue;
      const value = readPreferenceValue(item.getAttribute('data-theme-value'));
      const selected = value === preference;
      item.setAttribute('aria-pressed', selected ? 'true' : 'false');
      if (selected) {
        item.setAttribute('data-selected', 'true');
      } else {
        item.removeAttribute('data-selected');
      }
      const itemOption = value ? themeOptions[value] : null;
      if (itemOption) {
        patchIcon(item, itemOption.icon);
      }
    }
  }
})();
  `.trim();
};
