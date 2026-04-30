import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/button/button.js';
import '../../src/components/ui/input/input.js';
import '../../src/components/ui/search-field/search-field.js';
import '../../src/components/ui/search-trigger/search-trigger.js';
import '../../src/components/ui/select/select.js';
import '../../src/components/ui/textarea/textarea.js';
import { ensureMainCssLoaded } from './helpers/load-main-css.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

type Rgb = readonly [number, number, number];
type Rgba = readonly [number, number, number, number];

const parseColor = (value: string): Rgba => {
  const oklch = value.match(
    /^oklch\(\s*(?<l>[0-9.]+)(?<percent>%?)\s+(?<c>[0-9.]+)\s+(?<h>[0-9.]+)(?:\s*\/\s*(?<a>[0-9.]+))?\s*\)$/u,
  );
  if (oklch?.groups) {
    const l = Number(oklch.groups['l']) / (oklch.groups['percent'] === '%' ? 100 : 1);
    const c = Number(oklch.groups['c']);
    const a = oklch.groups['a'] === undefined ? 1 : Number(oklch.groups['a']);
    const h = (Number(oklch.groups['h']) * Math.PI) / 180;
    const labA = c * Math.cos(h);
    const labB = c * Math.sin(h);
    const long = (l + 0.3963377774 * labA + 0.2158037573 * labB) ** 3;
    const medium = (l - 0.1055613458 * labA - 0.0638541728 * labB) ** 3;
    const short = (l - 0.0894841775 * labA - 1.291485548 * labB) ** 3;
    const toEncoded = (linear: number): number => {
      const encoded =
        linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.abs(linear) ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(Math.max(encoded, 0), 1) * 255);
    };
    return [
      toEncoded(+4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
      toEncoded(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
      toEncoded(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short),
      a,
    ];
  }

  const srgb = value.match(
    /^color\(\s*srgb\s+(?<r>[0-9.]+)\s+(?<g>[0-9.]+)\s+(?<b>[0-9.]+)(?:\s*\/\s*(?<a>[0-9.]+))?\s*\)$/u,
  );
  if (srgb?.groups) {
    const a = srgb.groups['a'] === undefined ? 1 : Number(srgb.groups['a']);
    return [
      Math.round(Number(srgb.groups['r']) * 255),
      Math.round(Number(srgb.groups['g']) * 255),
      Math.round(Number(srgb.groups['b']) * 255),
      a,
    ];
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('canvas context を作成できません');
  }
  context.fillStyle = value;
  const resolved = context.fillStyle;
  const hex = resolved.match(/^#(?<r>[0-9a-f]{2})(?<g>[0-9a-f]{2})(?<b>[0-9a-f]{2})$/iu);
  if (hex?.groups) {
    const r = hex.groups['r'];
    const g = hex.groups['g'];
    const b = hex.groups['b'];
    if (r === undefined || g === undefined || b === undefined) {
      throw new Error(`HEX へ解決できません: ${value} => ${resolved}`);
    }
    return [Number.parseInt(r, 16), Number.parseInt(g, 16), Number.parseInt(b, 16), 1];
  }
  const match = resolved.match(/rgba?\((?<r>\d+),\s*(?<g>\d+),\s*(?<b>\d+)(?:,\s*(?<a>[0-9.]+))?/u);
  if (!match?.groups) {
    throw new Error(`RGB へ解決できません: ${value} => ${resolved}`);
  }
  return [
    Number(match.groups['r']),
    Number(match.groups['g']),
    Number(match.groups['b']),
    match.groups['a'] === undefined ? 1 : Number(match.groups['a']),
  ];
};

const luminance = ([r, g, b]: Rgb): number => {
  const toLinear = (channel: number): number => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

const asRgb = ([r, g, b]: Rgba): Rgb => [r, g, b];

const compositeOver = (foreground: string, background: string): string => {
  const [fr, fg, fb, fa] = parseColor(foreground);
  const [br, bg, bb] = parseColor(background);
  return `rgb(${Math.round(fr * fa + br * (1 - fa))}, ${Math.round(fg * fa + bg * (1 - fa))}, ${Math.round(
    fb * fa + bb * (1 - fa),
  )})`;
};

const contrastRatio = (foreground: string, background: string): number => {
  const fg = luminance(asRgb(parseColor(foreground)));
  const bg = luminance(asRgb(parseColor(background)));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
};

const getToken = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const expectContrast = (label: string, foreground: string, background: string, minimum: number) => {
  expect(contrastRatio(foreground, background), label).to.be.greaterThanOrEqual(minimum);
};

const resolveBackgroundColor = (value: string): string => {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.inset = '-9999px auto auto -9999px';
  probe.style.backgroundColor = value;
  document.body.append(probe);
  const resolved = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return resolved;
};

describe('color token contrast contract', () => {
  beforeEach(async () => {
    await ensureMainCssLoaded();
  });

  it('keeps readable foreground tokens above normal text contrast on allowed surfaces', () => {
    for (const [foreground, background] of [
      ['--fg-default', '--bg-default'],
      ['--fg-muted', '--bg-default'],
      ['--fg-subtle', '--bg-default'],
      ['--fg-subtle', '--bg-surface-2'],
      ['--fg-subtle', '--bg-surface-3'],
      ['--fg-placeholder', '--bg-control-muted'],
      ['--fg-control-label', '--bg-control-muted'],
      ['--fg-control-label', '--bg-default'],
    ] as const) {
      expectContrast(
        `${foreground} on ${background}`,
        getToken(foreground),
        getToken(background),
        4.5,
      );
    }

    for (const background of ['--bg-control-muted', '--bg-default'] as const) {
      expectContrast(
        `--fg-control-affordance on ${background}`,
        getToken('--fg-control-affordance'),
        getToken(background),
        3,
      );
    }

    expectContrast(
      'scrollbar thumb on page background',
      getToken('--scrollbar-thumb'),
      getToken('--bg-default'),
      3,
    );
  });

  it('keeps computed field, button, search trigger, and select state surfaces readable', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-input id="input" label="Input" placeholder="Placeholder"></ui-input>
        <ui-input id="input-readonly" label="Input" placeholder="Placeholder" readonly></ui-input>
        <ui-input
          id="input-outline-readonly"
          label="Input"
          placeholder="Placeholder"
          variant="outline"
          readonly
        ></ui-input>
        <ui-textarea id="textarea" label="Textarea" placeholder="Placeholder"></ui-textarea>
        <ui-textarea
          id="textarea-readonly"
          label="Textarea"
          placeholder="Placeholder"
          readonly
        ></ui-textarea>
        <ui-search-field id="search" label="Search" placeholder="Search"></ui-search-field>
        <ui-search-field
          id="search-readonly"
          label="Search"
          placeholder="Search"
          readonly
        ></ui-search-field>
        <ui-search-trigger id="search-trigger" placeholder="検索..."></ui-search-trigger>
        <ui-button id="button" variant="secondary">Secondary</ui-button>
        <ui-button id="pressed" variant="secondary" pressed>Pressed</ui-button>
        <ui-select id="select" label="Select" placeholder="Choose"></ui-select>
        <ui-select id="outline" label="Select" variant="outline" placeholder="Choose"></ui-select>
        <ui-select id="select-readonly" label="Select" placeholder="Choose" readonly></ui-select>
        <ui-select
          id="outline-readonly"
          label="Select"
          variant="outline"
          placeholder="Choose"
          readonly
        ></ui-select>
        <ui-select id="select-opened" label="Select" placeholder="Choose" opened></ui-select>
        <ui-select
          id="outline-opened"
          label="Select"
          variant="outline"
          placeholder="Choose"
          opened
        ></ui-select>
      </div>
    `);

    await Promise.all(
      Array.from(wrapper.querySelectorAll<HTMLElement>('*')).map((element) =>
        waitForLitUpdate(element),
      ),
    );
    await nextAnimationFrame();

    const input = wrapper.querySelector('ui-input')?.shadowRoot?.querySelector('input');
    const textarea = wrapper.querySelector('ui-textarea')?.shadowRoot?.querySelector('textarea');
    const searchField = wrapper
      .querySelector('ui-search-field')
      ?.shadowRoot?.querySelector('.field');
    const searchTriggerButton = wrapper
      .querySelector('ui-search-trigger')
      ?.shadowRoot?.querySelector('ui-button')
      ?.shadowRoot?.querySelector('button');
    const pressed = wrapper.querySelector('#pressed')?.shadowRoot?.querySelector('button');
    const select = wrapper.querySelector('#select')?.shadowRoot?.querySelector('.trigger');
    const outline = wrapper.querySelector('#outline')?.shadowRoot?.querySelector('.trigger');
    const selectReadonly = wrapper
      .querySelector('#select-readonly')
      ?.shadowRoot?.querySelector('.trigger');
    const outlineReadonly = wrapper
      .querySelector('#outline-readonly')
      ?.shadowRoot?.querySelector('.trigger');
    const selectOpened = wrapper
      .querySelector('#select-opened')
      ?.shadowRoot?.querySelector('.trigger');
    const outlineOpened = wrapper
      .querySelector('#outline-opened')
      ?.shadowRoot?.querySelector('.trigger');

    for (const [label, element] of [
      ['input placeholder', input],
      ['textarea placeholder', textarea],
      ['search placeholder', searchField],
    ] as const) {
      if (!(element instanceof HTMLElement)) throw new Error(`${label} が見つかりません`);
      const style = getComputedStyle(element);
      expectContrast(label, getToken('--fg-placeholder'), style.backgroundColor, 4.5);
    }

    if (
      !(pressed instanceof HTMLElement) ||
      !(searchTriggerButton instanceof HTMLElement) ||
      !(select instanceof HTMLElement) ||
      !(outline instanceof HTMLElement) ||
      !(selectReadonly instanceof HTMLElement) ||
      !(outlineReadonly instanceof HTMLElement) ||
      !(selectOpened instanceof HTMLElement) ||
      !(outlineOpened instanceof HTMLElement)
    ) {
      throw new Error('state surface の検証対象が見つかりません');
    }

    const pressedBackground = getComputedStyle(pressed).backgroundColor;
    expectContrast(
      'secondary pressed label',
      getComputedStyle(pressed).color,
      pressedBackground === 'rgba(0, 0, 0, 0)' ? getToken('--bg-surface-2') : pressedBackground,
      4.5,
    );

    const hoverSurface = compositeOver(
      resolveBackgroundColor('var(--bg-hover)'),
      getToken('--bg-surface-2'),
    );
    const activeSurface = compositeOver(
      resolveBackgroundColor('var(--bg-active)'),
      getToken('--bg-surface-2'),
    );
    expectContrast(
      'secondary hover label on composited surface',
      getComputedStyle(pressed).color,
      hoverSurface,
      4.5,
    );
    expectContrast(
      'secondary pressed label on composited surface',
      getComputedStyle(pressed).color,
      activeSurface,
      4.5,
    );

    const searchTriggerBackground = getComputedStyle(searchTriggerButton).backgroundColor;
    expectContrast(
      'search trigger label',
      getToken('--fg-control-label'),
      searchTriggerBackground,
      4.5,
    );
    expectContrast(
      'search trigger affordance',
      getToken('--fg-control-affordance'),
      searchTriggerBackground,
      3,
    );

    expectContrast(
      'select filled label',
      getToken('--fg-control-label'),
      getComputedStyle(select).backgroundColor,
      4.5,
    );
    expectContrast(
      'select outline label',
      getToken('--fg-control-label'),
      getComputedStyle(outline).backgroundColor,
      4.5,
    );
    expectContrast(
      'select filled readonly label',
      getToken('--fg-control-label'),
      getComputedStyle(selectReadonly).backgroundColor,
      4.5,
    );
    expectContrast(
      'select outline readonly label',
      getToken('--fg-control-label'),
      getComputedStyle(outlineReadonly).backgroundColor,
      4.5,
    );
    expectContrast(
      'select opened filled label',
      getToken('--fg-control-label'),
      compositeOver(resolveBackgroundColor('var(--bg-active)'), getToken('--bg-control-muted')),
      4.5,
    );
    expectContrast(
      'select opened outline label',
      getToken('--fg-control-label'),
      compositeOver(resolveBackgroundColor('var(--bg-active)'), getToken('--bg-default')),
      4.5,
    );
    expectContrast(
      'select opened filled computed label',
      getToken('--fg-control-label'),
      getComputedStyle(selectOpened).backgroundColor,
      4.5,
    );
    expectContrast(
      'select opened outline computed label',
      getToken('--fg-control-label'),
      getComputedStyle(outlineOpened).backgroundColor,
      4.5,
    );
  });
});
