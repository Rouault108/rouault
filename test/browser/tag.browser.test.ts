import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/tag/tag.js';
import type { Tag } from '../../src/components/ui/tag/tag.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

const TOKENS_STYLE_ID = 'test-global-tokens-css';

const ensureTokensCssLoaded = async (): Promise<void> => {
  if (document.getElementById(TOKENS_STYLE_ID)) {
    return;
  }

  const response = await fetch(new URL('../../src/assets/css/tokens.css', import.meta.url).href);

  if (!response.ok) {
    throw new Error(
      `tokens.css の読み込みに失敗しました: ${response.status} ${response.statusText}`,
    );
  }

  const cssText = await response.text();
  const style = document.createElement('style');
  style.id = TOKENS_STYLE_ID;
  style.textContent = cssText;
  document.head.append(style);

  await waitForStyleRecalc();
};

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const getTagRoot = (tag: Tag): HTMLElement =>
  expectPresent(tag.shadowRoot?.querySelector<HTMLElement>('.tag-root'), 'tag root');

const getTagLink = (tag: Tag): HTMLAnchorElement | null =>
  tag.shadowRoot?.querySelector<HTMLAnchorElement>('.tag-link') ?? null;

const getTagRemoveButton = (tag: Tag): HTMLButtonElement | null =>
  tag.shadowRoot?.querySelector<HTMLButtonElement>('.tag-remove-button') ?? null;

const getTagGroup = (tag: Tag): HTMLDivElement | null =>
  tag.shadowRoot?.querySelector<HTMLDivElement>('.tag-group') ?? null;

const text = (value: string | null | undefined): string => value?.replace(/\s+/g, ' ').trim() ?? '';

const parseRgbLightness = (value: string): number | null => {
  const match = value.match(
    /rgba?\(\s*([0-9]+(?:\.[0-9]+)?)\s*[, ]\s*([0-9]+(?:\.[0-9]+)?)\s*[, ]\s*([0-9]+(?:\.[0-9]+)?)/i,
  );

  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);

  return (r + g + b) / (255 * 3);
};

const parseOklchLightness = (value: string): number | null => {
  const match = value.match(/oklch\(\s*([0-9]+(?:\.[0-9]+)?%?)(?:\s+|,)[^)]+/i);

  if (!match || !match[1]) {
    return null;
  }

  const raw = match[1].trim();

  if (raw.endsWith('%')) {
    return Number(raw.slice(0, -1)) / 100;
  }

  return Number(raw);
};

const parsePerceivedLightness = (value: string): number => {
  const rgb = parseRgbLightness(value);
  if (rgb !== null) {
    return rgb;
  }

  const oklch = parseOklchLightness(value);
  if (oklch !== null) {
    return oklch;
  }

  throw new Error(`解釈できない色形式です: ${value}`);
};

const waitForStyleRecalc = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
};

const setRootTheme = (theme: 'light' | 'dark' | 'system'): void => {
  document.documentElement.setAttribute('data-theme', theme);

  if (theme === 'system') {
    document.documentElement.style.colorScheme = 'light dark';
    return;
  }

  document.documentElement.style.colorScheme = theme;
};

const getRootToken = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

describe('ui-tag browser contract', () => {
  before(async () => {
    await ensureTokensCssLoaded();
  });

  afterEach(async () => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('color-scheme');
    await waitForStyleRecalc();
  });

  it('既定状態では span root の非インタラクティブ tag として描画されること', async () => {
    const tag = await fixture<Tag>(html`<ui-tag id="default-tag">JavaScript</ui-tag>`);

    await waitForLitUpdate(tag);

    const root = getTagRoot(tag);

    expect(root.tagName.toLowerCase()).to.equal('span');
    expect(text(tag.textContent)).to.equal('JavaScript');
    expect(getTagLink(tag)).to.equal(null);
    expect(getTagRemoveButton(tag)).to.equal(null);

    expect(tag.variant).to.equal('default');
    expect(tag.size).to.equal('xs');
    expect(tag.color).to.equal('neutral');
    expect(tag.hasAttribute('role')).to.equal(false);
    expect(tag.hasAttribute('tabindex')).to.equal(false);
  });

  it('href のみを与えた場合は link only 構造になり href を反映すること', async () => {
    const tag = await fixture<Tag>(html`
      <ui-tag href="/tags/javascript" color="blue">JavaScript</ui-tag>
    `);

    await waitForLitUpdate(tag);

    const link = expectPresent(getTagLink(tag), 'tag link');

    expect(link.tagName.toLowerCase()).to.equal('a');
    expect(link.getAttribute('href')).to.equal('/tags/javascript');
    expect(text(tag.textContent)).to.equal('JavaScript');
    expect(getTagRemoveButton(tag)).to.equal(null);
    expect(getTagGroup(tag)).to.equal(null);
  });

  it('removable のみを与えた場合は span root + remove button を描画し ui-tag-remove を送出すること', async () => {
    const tag = await fixture<Tag>(html`<ui-tag removable>Python</ui-tag>`);

    await waitForLitUpdate(tag);

    const root = getTagRoot(tag);
    const removeButton = expectPresent(getTagRemoveButton(tag), 'remove button');

    expect(root.tagName.toLowerCase()).to.equal('span');
    expect(removeButton.getAttribute('type')).to.equal('button');
    expect(removeButton.getAttribute('aria-label')).to.equal('Pythonを削除');

    const removeEventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
      tag.addEventListener(
        'ui-tag-remove',
        (event) => {
          resolve(event as CustomEvent<{ value: string }>);
        },
        { once: true },
      );
    });

    removeButton.click();

    const event = await removeEventPromise;
    expect(event.detail.value).to.equal('Python');
    expect(event.bubbles).to.equal(true);
    expect(event.composed).to.equal(true);
    expect(event.cancelable).to.equal(false);
  });

  it('ui-tag-remove は可視ラベル trim 結果とイベント伝播契約を公開すること', async () => {
    const tag = await fixture<Tag>(html`<ui-tag removable> TypeScript </ui-tag>`);

    await waitForLitUpdate(tag);

    const removeButton = expectPresent(getTagRemoveButton(tag), 'remove button');
    const removeEventPromise = new Promise<CustomEvent<{ value: string }>>((resolve) => {
      document.body.addEventListener(
        'ui-tag-remove',
        (event) => {
          resolve(event as CustomEvent<{ value: string }>);
        },
        { once: true },
      );
    });

    removeButton.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );

    const event = await removeEventPromise;
    expect(event.detail.value).to.equal('TypeScript');
    expect(event.bubbles).to.equal(true);
    expect(event.composed).to.equal(true);
    expect(event.cancelable).to.equal(false);
  });

  it('href + removable の場合は group 内に link と remove button を並列配置すること', async () => {
    const tag = await fixture<Tag>(html`<ui-tag href="/tags/rust" removable>Rust</ui-tag>`);

    await waitForLitUpdate(tag);

    const group = expectPresent(getTagGroup(tag), 'tag group');
    const link = expectPresent(getTagLink(tag), 'tag link');
    const removeButton = expectPresent(getTagRemoveButton(tag), 'remove button');

    expect(group.getAttribute('role')).to.equal('group');
    expect(group.getAttribute('aria-label')).to.equal('Rust タグ');
    expect(link.getAttribute('href')).to.equal('/tags/rust');
    expect(text(tag.textContent)).to.equal('Rust');
    expect(removeButton.getAttribute('aria-label')).to.equal('Rustを削除');
  });

  it('disabled + href/removable では link/remove を非活性化し remove event を抑止すること', async () => {
    const tag = await fixture<Tag>(html`
      <ui-tag href="/tags/rust" removable disabled>Rust</ui-tag>
    `);

    await waitForLitUpdate(tag);

    const link = expectPresent(getTagLink(tag), 'tag link');
    const removeButton = expectPresent(getTagRemoveButton(tag), 'remove button');

    expect(link.hasAttribute('href')).to.equal(false);
    expect(link.getAttribute('aria-disabled')).to.equal('true');
    expect(link.getAttribute('tabindex')).to.equal('-1');

    expect(removeButton.disabled).to.equal(true);
    expect(removeButton.getAttribute('aria-disabled')).to.equal('true');
    expect(removeButton.getAttribute('tabindex')).to.equal('-1');

    let removeCount = 0;
    tag.addEventListener('ui-tag-remove', () => {
      removeCount += 1;
    });

    removeButton.click();
    await waitForLitUpdate(tag);

    expect(removeCount).to.equal(0);

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    link.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).to.equal(true);
  });

  it('icon slot を与えた場合は icon-slot を描画すること', async () => {
    const tag = await fixture<Tag>(html`
      <ui-tag color="gold">
        <svg slot="icon" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="5"></circle>
        </svg>
        Literature
      </ui-tag>
    `);

    await waitForLitUpdate(tag);

    const iconSlot = tag.shadowRoot?.querySelector('.icon-slot');
    const textSlot = tag.shadowRoot?.querySelector('.text-slot');

    expect(iconSlot).to.not.equal(null);
    expect(textSlot).to.not.equal(null);
    expect(text(tag.textContent)).to.equal('Literature');
  });

  it('data-theme=light では light token に従うこと', async () => {
    setRootTheme('light');
    await waitForStyleRecalc();

    const tag = await fixture<Tag>(html`<ui-tag color="blue">JavaScript</ui-tag>`);
    await waitForLitUpdate(tag);
    await waitForStyleRecalc();

    expect(getRootToken('--tag-surface-l')).to.equal('96%');
    expect(getRootToken('--tag-content-l')).to.equal('45%');

    const style = getComputedStyle(tag);
    const background = parsePerceivedLightness(style.backgroundColor);
    const foreground = parsePerceivedLightness(style.color);

    expect(background).to.be.greaterThan(foreground);
  });

  it('data-theme=dark では dark token に従うこと', async () => {
    setRootTheme('dark');
    await waitForStyleRecalc();

    const tag = await fixture<Tag>(html`<ui-tag color="blue">JavaScript</ui-tag>`);
    await waitForLitUpdate(tag);
    await waitForStyleRecalc();

    expect(getRootToken('--tag-surface-l')).to.equal('17%');
    expect(getRootToken('--tag-content-l')).to.equal('90%');

    const style = getComputedStyle(tag);
    const background = parsePerceivedLightness(style.backgroundColor);
    const foreground = parsePerceivedLightness(style.color);

    expect(background).to.be.lessThan(foreground);
  });

  it('同一タグでも data-theme の切り替えで computed style が変化すること', async () => {
    setRootTheme('light');
    await waitForStyleRecalc();

    const tag = await fixture<Tag>(html`<ui-tag color="violet">TypeScript</ui-tag>`);
    await waitForLitUpdate(tag);
    await waitForStyleRecalc();

    const lightBackground = getComputedStyle(tag).backgroundColor;
    const lightForeground = getComputedStyle(tag).color;

    setRootTheme('dark');
    await waitForStyleRecalc();

    const darkBackground = getComputedStyle(tag).backgroundColor;
    const darkForeground = getComputedStyle(tag).color;

    expect(getRootToken('--tag-surface-l')).to.equal('17%');
    expect(getRootToken('--tag-content-l')).to.equal('90%');
    expect(darkBackground).to.not.equal(lightBackground);
    expect(darkForeground).to.not.equal(lightForeground);
  });

  it('variant=solid でも data-theme 切り替えで computed background が変化すること', async () => {
    setRootTheme('light');
    await waitForStyleRecalc();

    const tag = await fixture<Tag>(html`
      <ui-tag variant="solid" color="neutral">Solid Neutral</ui-tag>
    `);
    await waitForLitUpdate(tag);
    await waitForStyleRecalc();

    const lightBackground = getComputedStyle(tag).backgroundColor;

    setRootTheme('dark');
    await waitForStyleRecalc();

    const darkBackground = getComputedStyle(tag).backgroundColor;

    expect(getRootToken('--tag-solid-neutral-surface-l')).to.equal('30%');
    expect(darkBackground).to.not.equal(lightBackground);
  });

  it('plain variant は data-theme 切り替え後も transparent background を維持すること', async () => {
    setRootTheme('light');
    await waitForStyleRecalc();

    const tag = await fixture<Tag>(html`<ui-tag variant="plain" color="gold">Plain</ui-tag>`);
    await waitForLitUpdate(tag);
    await waitForStyleRecalc();

    expect(getComputedStyle(tag).backgroundColor).to.equal('rgba(0, 0, 0, 0)');

    setRootTheme('dark');
    await waitForStyleRecalc();

    expect(getComputedStyle(tag).backgroundColor).to.equal('rgba(0, 0, 0, 0)');
  });
});
