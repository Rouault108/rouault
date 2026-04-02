import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/syntax-field/syntax-field.js';
import {
  DOCUMENT_CSS,
  type SyntaxField,
} from '../../src/components/ui/syntax-field/syntax-field.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const DOCUMENT_STYLE_ID = 'ui-syntax-field-document-styles';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: SyntaxField): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

describe('ui-syntax-field browser contract', () => {
  afterEach(() => {
    document.getElementById(DOCUMENT_STYLE_ID)?.remove();
  });

  it('Light DOM で描画し、required / type / default と document style を注入すること', async () => {
    const host = await fixture<SyntaxField>(html`
      <ui-syntax-field
        name="slug"
        type="string"
        required
        default="memo-1"
      >
        URL セグメントです。
      </ui-syntax-field>
    `);

    await flush(host);

    expect(host.shadowRoot).to.equal(host);

    const wrapper = expectPresent(host.querySelector<HTMLElement>('.field-wrapper'), 'field wrapper');
    const required = expectPresent(host.querySelector<HTMLElement>('.field-required'), 'required');
    const typeText = expectPresent(host.querySelector<HTMLElement>('.field-type'), 'field type');
    const defaultText = expectPresent(
      host.querySelector<HTMLElement>('.field-default'),
      'field default',
    );
    const description = expectPresent(
      host.querySelector<HTMLElement>('.field-description'),
      'field description',
    );

    expect(wrapper).to.not.equal(null);
    expect(required.getAttribute('aria-label')).to.equal('必須');
    expect(typeText.textContent?.trim()).to.equal('string');
    expect(defaultText.textContent?.trim()).to.equal('default: memo-1');
    expect(description.textContent?.includes('URL セグメント')).to.equal(true);

    const style = expectPresent(document.getElementById(DOCUMENT_STYLE_ID), 'document style');
    expect(style.textContent?.includes(DOCUMENT_CSS.trim().slice(0, 32))).to.equal(true);
  });

  it('空白のみの type / default は表示せず、style は 1 回しか注入しないこと', async () => {
    const first = await fixture<SyntaxField>(html`
      <ui-syntax-field name="title" type="   " default=" ">
        タイトルです。
      </ui-syntax-field>
    `);
    const second = await fixture<SyntaxField>(html`
      <ui-syntax-field name="body">本文です。</ui-syntax-field>
    `);

    await flush(first);
    await flush(second);

    expect(first.querySelector('.field-type')).to.equal(null);
    expect(first.querySelector('.field-default')).to.equal(null);

    const styles = document.querySelectorAll(`#${DOCUMENT_STYLE_ID}`);
    expect(styles.length).to.equal(1);
  });

  it('後追加の説明文ノードを MutationObserver で dd へ取り込むこと', async () => {
    const host = await fixture<SyntaxField>(html`
      <ui-syntax-field name="tags">初期説明</ui-syntax-field>
    `);

    await flush(host);

    const appended = document.createElement('span');
    appended.textContent = ' / 後追加説明';
    host.append(appended);

    await flush(host);

    const description = expectPresent(
      host.querySelector<HTMLElement>('.field-description'),
      'field description',
    );
    expect(description.textContent?.includes('初期説明')).to.equal(true);
    expect(description.textContent?.includes('後追加説明')).to.equal(true);
  });
});
