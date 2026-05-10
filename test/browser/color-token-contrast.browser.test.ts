import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/button/button.js';
import '../../src/components/ui/input/input.js';
import '../../src/components/ui/search-field/search-field.js';
import '../../src/components/ui/search-trigger/search-trigger.js';
import '../../src/components/ui/select/select.js';
import '../../src/components/ui/textarea/textarea.js';
import {
  compositeOver as compositeRgbaOver,
  contrastRatio as contrastRgbaRatio,
  resolveComputedColor,
  type ColorProperty,
  type Rgba,
} from './helpers/color-contrast.js';
import { ensureMainCssLoaded } from './helpers/load-main-css.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const toCssColor = (color: Rgba): string => {
  const r = Math.round(color.r);
  const g = Math.round(color.g);
  const b = Math.round(color.b);
  return color.a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${color.a})`;
};

const resolveTokenColor = (value: string, property: ColorProperty): Rgba =>
  resolveComputedColor(value, document.documentElement, property);

const getToken = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const expectContrast = (label: string, foreground: string, background: string, minimum: number) => {
  const foregroundColor = resolveTokenColor(foreground, 'color');
  const backgroundColor = resolveTokenColor(background, 'background-color');

  expect(foregroundColor.a, `${label} foreground alpha`).to.equal(1);
  expect(backgroundColor.a, `${label} background alpha`).to.equal(1);
  expect(contrastRgbaRatio(foregroundColor, backgroundColor), label).to.be.greaterThanOrEqual(
    minimum,
  );
};

const compositeOver = (foreground: string, background: string): string =>
  toCssColor(
    compositeRgbaOver(
      resolveTokenColor(foreground, 'background-color'),
      resolveTokenColor(background, 'background-color'),
    ),
  );


const resolveBackgroundColor = (value: string): string =>
  toCssColor(resolveTokenColor(value, 'background-color'));

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
