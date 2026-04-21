import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/search-trigger/search-trigger.js';
import type { SearchTrigger } from '../../src/components/ui/search-trigger/search-trigger.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: SearchTrigger): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const getUiButton = (host: SearchTrigger): HTMLElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLElement>('ui-button'), 'ui-button');

const getButton = (host: SearchTrigger): HTMLButtonElement =>
  expectPresent(
    getUiButton(host).shadowRoot?.querySelector<HTMLButtonElement>('button'),
    'nested button',
  );

const getPlaceholder = (host: SearchTrigger): HTMLElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLElement>('.placeholder'), 'placeholder');

const getIconSlot = (host: SearchTrigger): HTMLElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLElement>('.icon'), 'icon slot');

const getUiIcon = (host: SearchTrigger): HTMLElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLElement>('.icon ui-icon'), 'ui-icon');

describe('ui-search-trigger browser contract', () => {
  it('既定状態で ui-button を内部に用い、native button semantics と default aria を提供すること', async () => {
    const host = await fixture<SearchTrigger>(html`
      <ui-search-trigger placeholder="検索..."></ui-search-trigger>
    `);

    await flush(host);

    const uiButton = getUiButton(host);
    const button = getButton(host);
    const placeholder = getPlaceholder(host);
    const icon = host.shadowRoot?.querySelector('ui-icon[name="search"]');

    expect(uiButton.getAttribute('variant')).to.equal('ghost');
    expect(uiButton.dataset['density']).to.equal('auto');
    expect(button.type).to.equal('button');
    expect(button.getAttribute('aria-label')).to.equal('検索ダイアログを開く');
    expect(button.getAttribute('aria-haspopup')).to.equal('dialog');
    expect(button.hasAttribute('aria-keyshortcuts')).to.equal(false);
    expect(placeholder.textContent?.trim()).to.equal('検索...');
    expect(icon).to.not.equal(null);

    host.focus();
    await nextAnimationFrame();
    expect(uiButton.shadowRoot?.activeElement).to.equal(button);
  });

  it('aria delegation と density 正規化と placeholder 正規化を行うこと', async () => {
    const host = await fixture<SearchTrigger>(html`
      <ui-search-trigger
        density="unexpected"
        aria-label="ノート内検索を開く"
        aria-controls="global-search-dialog"
        aria-expanded="true"
        placeholder=${'一行目\n二行目\n三行目'}
      ></ui-search-trigger>
    `);

    await flush(host);

    const uiButton = getUiButton(host);
    const button = getButton(host);
    const placeholder = getPlaceholder(host);

    expect(host.density).to.equal('auto');
    expect(uiButton.dataset['density']).to.equal('auto');
    expect(button.getAttribute('aria-label')).to.equal('ノート内検索を開く');
    expect(button.getAttribute('aria-controls')).to.equal('global-search-dialog');
    expect(button.getAttribute('aria-expanded')).to.equal('true');
    expect(placeholder.textContent?.includes('\n')).to.equal(false);
    expect(placeholder.textContent).to.equal('一行目 二行目 三行目');
  });

  it('click で open-search-dialog を 1 回送出し、disabled 時は送出しないこと', async () => {
    const wrapper = await fixture<HTMLFormElement>(html`
      <form id="search-trigger-form">
        <ui-search-trigger id="enabled-trigger"></ui-search-trigger>
        <ui-search-trigger id="disabled-trigger" disabled></ui-search-trigger>
      </form>
    `);

    const form = wrapper;
    const enabledTrigger = expectPresent(
      form.querySelector<SearchTrigger>('#enabled-trigger'),
      'enabled trigger',
    );
    const disabledTrigger = expectPresent(
      form.querySelector<SearchTrigger>('#disabled-trigger'),
      'disabled trigger',
    );

    await flush(enabledTrigger);
    await flush(disabledTrigger);

    let submitCount = 0;
    let openCount = 0;
    let disabledOpenCount = 0;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitCount += 1;
    });

    enabledTrigger.addEventListener('open-search-dialog', () => {
      openCount += 1;
    });

    disabledTrigger.addEventListener('open-search-dialog', () => {
      disabledOpenCount += 1;
    });

    enabledTrigger.click();
    await nextAnimationFrame();

    disabledTrigger.click();
    await nextAnimationFrame();

    expect(openCount).to.equal(1);
    expect(disabledOpenCount).to.equal(0);
    expect(submitCount).to.equal(0);
  });

  it('density の代表値を inner ui-button[data-density] へ反映すること', async () => {
    const auto = await fixture<SearchTrigger>(html`
      <ui-search-trigger density="auto"></ui-search-trigger>
    `);
    const defaultDensity = await fixture<SearchTrigger>(html`
      <ui-search-trigger density="default"></ui-search-trigger>
    `);
    const compact = await fixture<SearchTrigger>(html`
      <ui-search-trigger density="compact"></ui-search-trigger>
    `);
    const iconOnly = await fixture<SearchTrigger>(html`
      <ui-search-trigger density="icon-only"></ui-search-trigger>
    `);

    await flush(auto);
    await flush(defaultDensity);
    await flush(compact);
    await flush(iconOnly);

    expect(getUiButton(auto).dataset['density']).to.equal('auto');
    expect(getUiButton(defaultDensity).dataset['density']).to.equal('default');
    expect(getUiButton(compact).dataset['density']).to.equal('compact');
    expect(getUiButton(iconOnly).dataset['density']).to.equal('icon-only');
  });

  it('アイコン枠寸法と ui-icon の描画基準寸法を --icon-base に揃えること', async () => {
    const host = await fixture<SearchTrigger>(html`
      <ui-search-trigger></ui-search-trigger>
    `);

    await flush(host);

    const iconSlot = getIconSlot(host);
    const uiIcon = getUiIcon(host);
    const iconSlotStyle = getComputedStyle(iconSlot);
    const uiIconStyle = getComputedStyle(uiIcon);
    const resolvedIconBase = iconSlotStyle.inlineSize;

    expect(resolvedIconBase).to.not.equal('');
    expect(uiIconStyle.fontSize).to.equal(resolvedIconBase);
    expect(uiIconStyle.inlineSize).to.equal(resolvedIconBase);
    expect(uiIconStyle.blockSize).to.equal(iconSlotStyle.blockSize);
  });
});
