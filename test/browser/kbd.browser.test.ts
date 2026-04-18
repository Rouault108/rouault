import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/kbd/kbd.js';
import type { Kbd } from '../../src/components/ui/kbd/kbd.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

const must = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

describe('ui-kbd browser contract', () => {
  it('1 トークン入力では単体キーとして <kbd> を 1 つだけ描画すること', async () => {
    const kbd = await fixture<Kbd>(html`<ui-kbd></ui-kbd>`);
    kbd.tokens = ['Esc'];
    await waitForLitUpdate(kbd);

    const root = must(kbd.shadowRoot, 'shadowRoot が見つかりません');
    const keys = Array.from(root.querySelectorAll('kbd'));
    const combo = root.querySelector('[part="combo"]');
    const separators = root.querySelectorAll('[part="separator"]');

    expect(keys).to.have.length(1);
    expect(keys[0]?.textContent?.trim()).to.equal('Esc');
    expect(combo).to.equal(null);
    expect(separators).to.have.length(0);
  });

  it('2 トークン以上では複合キーとして combo / separator / 各 key を描画すること', async () => {
    const kbd = await fixture<Kbd>(html`<ui-kbd></ui-kbd>`);
    kbd.tokens = ['Ctrl', 'K'];
    await waitForLitUpdate(kbd);

    const root = must(kbd.shadowRoot, 'shadowRoot が見つかりません');
    const combo = must(root.querySelector<HTMLElement>('[part="combo"]'), 'combo が見つかりません');
    const keys = Array.from(root.querySelectorAll('kbd'));
    const separators = Array.from(root.querySelectorAll<HTMLElement>('[part="separator"]'));

    expect(combo).not.to.equal(null);
    expect(keys).to.have.length(2);
    expect(keys.map((node) => node.textContent?.trim())).to.deep.equal(['Ctrl', 'K']);
    expect(separators).to.have.length(1);
    expect(separators[0]?.textContent?.trim()).to.equal('+');
  });

  it('tokens がある場合は slot より tokens を優先すること', async () => {
    const kbd = await fixture<Kbd>(html`
      <ui-kbd>
        <span class="sr-only">コマンド</span>
        <span aria-hidden="true">⌘</span>
      </ui-kbd>
    `);

    kbd.tokens = ['Ctrl', 'K'];
    await waitForLitUpdate(kbd);

    const root = must(kbd.shadowRoot, 'shadowRoot が見つかりません');
    const slot = root.querySelector('slot');
    const keys = Array.from(root.querySelectorAll('kbd'));

    expect(slot).to.equal(null);
    expect(keys).to.have.length(2);
    expect(keys.map((node) => node.textContent?.trim())).to.deep.equal(['Ctrl', 'K']);
  });

  it('slot 補助入力では単体キーの <kbd> を 1 つ描画し、slot 内容を保持すること', async () => {
    const kbd = await fixture<Kbd>(html`
      <ui-kbd>
        <span class="sr-only">コマンド</span>
        <span aria-hidden="true">⌘</span>
      </ui-kbd>
    `);
    await waitForLitUpdate(kbd);

    const root = must(kbd.shadowRoot, 'shadowRoot が見つかりません');
    const key = must(root.querySelector<HTMLElement>('kbd'), '単体キーの <kbd> が見つかりません');
    const slot = must(root.querySelector<HTMLSlotElement>('slot'), 'slot が見つかりません');
    const combo = root.querySelector('[part="combo"]');
    const separators = root.querySelectorAll('[part="separator"]');
    const assigned = slot
      .assignedNodes({ flatten: true })
      .filter((node) => (node.textContent ?? '').trim().length > 0);

    expect(key).not.to.equal(null);
    expect(combo).to.equal(null);
    expect(separators).to.have.length(0);
    expect(assigned).to.have.length(2);

    const assignedTexts = assigned
      .map((node) => node.textContent?.trim() ?? '')
      .filter((text) => text.length > 0);

    expect(assignedTexts).to.deep.equal(['コマンド', '⌘']);
  });

  it('plain text child は複合キーへ再解釈せず、slot 内容としてそのまま扱うこと', async () => {
    const kbd = await fixture<Kbd>(html`<ui-kbd>Ctrl + K</ui-kbd>`);
    await waitForLitUpdate(kbd);

    const root = must(kbd.shadowRoot, 'shadowRoot が見つかりません');
    const keys = Array.from(root.querySelectorAll('kbd'));
    const combo = root.querySelector('[part="combo"]');
    const separators = root.querySelectorAll('[part="separator"]');
    const slot = must(root.querySelector<HTMLSlotElement>('slot'), 'slot が見つかりません');
    const assignedText = slot
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();

    expect(keys).to.have.length(1);
    expect(assignedText).to.equal('Ctrl + K');
    expect(combo).to.equal(null);
    expect(separators).to.have.length(0);
  });

  it('⌘ は可視表記と支援技術向け表記を分離すること', async () => {
    const kbd = await fixture<Kbd>(html`<ui-kbd></ui-kbd>`);
    kbd.tokens = ['⌘'];
    await waitForLitUpdate(kbd);

    const root = must(kbd.shadowRoot, 'shadowRoot が見つかりません');
    const key = must(root.querySelector('kbd'), '単体キーの <kbd> が見つかりません');
    const srOnly = must(key.querySelector<HTMLElement>('.sr-only'), '.sr-only が見つかりません');
    const visual = must(
      key.querySelector<HTMLElement>('[aria-hidden="true"]'),
      '可視表記が見つかりません',
    );

    expect(srOnly.textContent?.trim()).to.equal('コマンド');
    expect(visual.textContent?.trim()).to.equal('⌘');
  });

  it('空入力では空の <kbd> を描画しないこと', async () => {
    const kbd = await fixture<Kbd>(html`<ui-kbd></ui-kbd>`);
    await waitForLitUpdate(kbd);

    const root = must(kbd.shadowRoot, 'shadowRoot が見つかりません');
    const keys = root.querySelectorAll('kbd');
    const combo = root.querySelector('[part="combo"]');
    const separators = root.querySelectorAll('[part="separator"]');

    expect(keys).to.have.length(0);
    expect(combo).to.equal(null);
    expect(separators).to.have.length(0);
    expect(root.textContent?.trim() ?? '').to.equal('');
  });
});
