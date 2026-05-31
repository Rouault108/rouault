import { digestForTemplateResult } from '@lit-labs/ssr-client';
import type { TemplateResult } from 'lit';
import { resolveStaticIconBody } from '../../shared/icons/icon-paths.js';
import { THEME_CHROME_BOOTSTRAP_ICON_NAMES, THEME_UI_OPTIONS } from './theme-ui-options.js';

const buildIconBodyMap = (): Record<string, string> =>
  Object.fromEntries(
    THEME_CHROME_BOOTSTRAP_ICON_NAMES.map((name) => [name, resolveStaticIconBody(name)]),
  );

const buildIconMarkerMap = (): Record<string, string> =>
  Object.fromEntries(
    THEME_CHROME_BOOTSTRAP_ICON_NAMES.map((name) => {
      const body = resolveStaticIconBody(name);
      const strings = Object.assign([body], { raw: [body] }) as unknown as TemplateStringsArray;
      const digest = digestForTemplateResult({
        ['_$litType$']: 2,
        strings,
        values: [],
      } as TemplateResult);

      return [name, `lit-part ${digest}`];
    }),
  );

export const buildThemeChromeBootstrapScript = (): string => {
  const themeOptions = THEME_UI_OPTIONS;
  const iconBodies = buildIconBodyMap();
  const iconMarkers = buildIconMarkerMap();

  return `
(() => {
  const themeOptions = ${JSON.stringify(themeOptions)};
  const iconBodies = ${JSON.stringify(iconBodies)};
  const iconMarkers = ${JSON.stringify(iconMarkers)};

  const readPreferenceValue = (value) =>
    value === 'light' || value === 'dark' || value === 'system' ? value : null;

  const normalizePreference = (value) => readPreferenceValue(value) ?? 'system';

  const preference = normalizePreference(document.documentElement.getAttribute('data-theme'));
  const option = themeOptions[preference];

  if (!option) return;

  const patchIcon = (svg, iconName) => {
    if (!(svg instanceof SVGElement)) return;
    const body = iconBodies[iconName];
    const marker = iconMarkers[iconName];
    if (typeof body !== 'string' || typeof marker !== 'string') return;
    svg.setAttribute('data-icon', iconName);

    const nodes = [...svg.childNodes];
    const start = nodes.find(
      (node) => node.nodeType === Node.COMMENT_NODE && node.data.startsWith('lit-part'),
    );
    const end = nodes.find(
      (node) => node.nodeType === Node.COMMENT_NODE && node.data === '/lit-part',
    );

    if (!(start instanceof Comment) || !(end instanceof Comment)) {
      svg.innerHTML = body;
      return;
    }

    start.data = marker;

    let current = start.nextSibling;
    while (current !== null && current !== end) {
      const next = current.nextSibling;
      current.remove();
      current = next;
    }

    const template = document.createElement('template');
    template.innerHTML = '<svg>' + body + '</svg>';
    const source = template.content.querySelector('svg');
    if (!(source instanceof SVGElement)) return;

    for (const child of [...source.childNodes]) {
      svg.insertBefore(child, end);
    }
  };

  const patchHeader = (host) => {
    const root =
      host.shadowRoot ??
      host.querySelector('template[shadowrootmode="open"], template[shadowroot="open"]')?.content ??
      null;

    if (!root) return;

    const trigger = root.querySelector('[data-dropdown="theme"] [slot="trigger"]');
    if (!(trigger instanceof HTMLElement)) return;

    trigger.setAttribute('accessible-name', 'テーマ: ' + option.label);

    const button = trigger.shadowRoot?.querySelector('button');
    if (button instanceof HTMLButtonElement) {
      button.setAttribute('aria-label', 'テーマ: ' + option.label);
    }

    const main = trigger.querySelector('.theme-trigger-main');
    if (main instanceof HTMLElement) {
      main.setAttribute('data-theme-preference', preference);
    }

    const label = trigger.querySelector('.theme-trigger-text');
    if (label instanceof HTMLElement) {
      const text = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      if (text instanceof Text) {
        text.data = option.label;
      }
    }

    patchIcon(trigger.querySelector('.theme-trigger-icon'), option.icon);

    for (const item of root.querySelectorAll('[data-dropdown="theme"] ui-menu-item[value]')) {
      if (!(item instanceof HTMLElement)) continue;

      const value = readPreferenceValue(item.getAttribute('value'));
      if (value === null) {
        item.removeAttribute('data-selected');
        continue;
      }

      const selected = value === preference;

      if (selected) {
        item.setAttribute('data-selected', '');
      } else {
        item.removeAttribute('data-selected');
      }

      const itemOption = themeOptions[value];
      patchIcon(item.querySelector('svg[data-icon]'), selected ? 'check' : itemOption.icon);
    }
  };

  for (const host of document.querySelectorAll('layout-header')) {
    patchHeader(host);
  }
})();
  `.trim();
};
