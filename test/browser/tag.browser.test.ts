import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/tag/tag.js';
import type { Tag } from '../../src/components/ui/tag/tag.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

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

describe('ui-tag browser contract', () => {
  it('既定状態では span root の非インタラクティブ tag として描画されること', async () => {
    const tag = await fixture<Tag>(html` <ui-tag id="default-tag">JavaScript</ui-tag> `);

    await waitForLitUpdate(tag);

    const root = getTagRoot(tag);

    expect(root.tagName.toLowerCase()).to.equal('span');
    expect(text(root.textContent)).to.equal('JavaScript');
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
    expect(text(link.textContent)).to.equal('JavaScript');
    expect(getTagRoot(tag)).to.equal(link);
    expect(getTagRemoveButton(tag)).to.equal(null);
    expect(getTagGroup(tag)).to.equal(null);
  });

  it('removable のみを与えた場合は span root + remove button を描画し ui-tag-remove を送出すること', async () => {
    const tag = await fixture<Tag>(html` <ui-tag removable>Python</ui-tag> `);

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
  });

  it('href + removable の場合は group 内に link と remove button を並列配置すること', async () => {
    const tag = await fixture<Tag>(html` <ui-tag href="/tags/rust" removable>Rust</ui-tag> `);

    await waitForLitUpdate(tag);

    const group = expectPresent(getTagGroup(tag), 'tag group');
    const link = expectPresent(getTagLink(tag), 'tag link');
    const removeButton = expectPresent(getTagRemoveButton(tag), 'remove button');

    expect(group.getAttribute('role')).to.equal('group');
    expect(group.getAttribute('aria-label')).to.equal('Rust タグ');
    expect(link.getAttribute('href')).to.equal('/tags/rust');
    expect(text(link.textContent)).to.equal('Rust');
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
    expect(text(textSlot?.textContent)).to.equal('Literature');
  });
});
