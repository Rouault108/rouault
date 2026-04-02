import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/input/input.js';
import type { Input } from '../../src/components/ui/input/input.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: Input): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const getInnerInput = (host: Input): HTMLInputElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLInputElement>('input'), 'input');

const getLabel = (host: Input): HTMLLabelElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLLabelElement>('label'), 'label');

describe('ui-input browser contract', () => {
  it('helpText / external describedBy / hidden label を統合し、aria-describedby を順序付きで連結すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <p id="external-desc">外部説明</p>
        <ui-input
          id="input"
          label="メールアドレス"
          hide-label
          help-text="内部ヘルプ"
          described-by="external-desc"
        ></ui-input>
      </div>
    `);

    const host = expectPresent(wrapper.querySelector<Input>('#input'), 'input host');
    await flush(host);

    const input = getInnerInput(host);
    const label = getLabel(host);
    const help = expectPresent(host.shadowRoot?.querySelector<HTMLElement>('.help-text'), 'help');

    expect(label.classList.contains('label--hidden')).to.equal(true);
    expect(input.hasAttribute('aria-label')).to.equal(false);
    expect(input.getAttribute('aria-describedby')).to.equal(`external-desc ${help.id}`);
  });

  it('external error と native validation を aria-invalid / error message / help 非表示へ反映すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-input
          id="forced"
          label="ユーザー名"
          help-text="通常時ヘルプ"
          error
          error-message="ユーザー名は3文字以上で入力してください"
        ></ui-input>
        <ui-input
          id="native"
          label="メールアドレス"
          type="email"
          value="invalid-address"
        ></ui-input>
      </div>
    `);

    const forced = expectPresent(wrapper.querySelector<Input>('#forced'), 'forced');
    const native = expectPresent(wrapper.querySelector<Input>('#native'), 'native');

    await flush(forced);
    await flush(native);

    const forcedInput = getInnerInput(forced);
    const forcedError = expectPresent(
      forced.shadowRoot?.querySelector<HTMLElement>('.error-message'),
      'forced error',
    );
    expect(forcedInput.getAttribute('aria-invalid')).to.equal('true');
    expect(forcedError.textContent?.trim()).to.equal('ユーザー名は3文字以上で入力してください');
    expect(forced.shadowRoot?.querySelector('.help-text')).to.equal(null);
    expect(forcedInput.getAttribute('aria-describedby')).to.equal(forcedError.id);

    expect(native.checkValidity()).to.equal(false);
    await flush(native);
    const nativeInput = getInnerInput(native);
    const nativeError = expectPresent(
      native.shadowRoot?.querySelector<HTMLElement>('.error-message'),
      'native error',
    );
    expect(nativeInput.getAttribute('aria-invalid')).to.equal('true');
    expect((nativeError.textContent ?? '').trim().length > 0).to.equal(true);
  });

  it('requiredIndicator modes をラベルへ反映すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-input id="text" label="必須テキスト" required required-indicator="text"></ui-input>
        <ui-input id="asterisk" label="必須記号" required required-indicator="asterisk"></ui-input>
        <ui-input id="none" label="必須非表示" required required-indicator="none"></ui-input>
      </div>
    `);

    const textHost = expectPresent(wrapper.querySelector<Input>('#text'), 'text');
    const asteriskHost = expectPresent(wrapper.querySelector<Input>('#asterisk'), 'asterisk');
    const noneHost = expectPresent(wrapper.querySelector<Input>('#none'), 'none');

    await flush(textHost);
    await flush(asteriskHost);
    await flush(noneHost);

    expect(getLabel(textHost).textContent?.includes('（必須）')).to.equal(true);
    expect(getLabel(asteriskHost).textContent?.includes('*')).to.equal(true);
    expect(getLabel(noneHost).querySelector('.required-indicator')).to.equal(null);
  });

  it('defaultValue reset / disabled / readonly / FormData boundary を維持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <form id="form">
          <ui-input
            id="active"
            label="通常"
            name="active"
            value="現在値"
            default-value="初期値"
          ></ui-input>
          <ui-input
            id="disabled"
            label="無効"
            name="disabledField"
            value="disabled-value"
            disabled
          ></ui-input>
          <ui-input
            id="readonly"
            label="readonly"
            name="readonlyField"
            value="readonly-value"
            readonly
          ></ui-input>
        </form>
      </div>
    `);

    const form = expectPresent(wrapper.querySelector<HTMLFormElement>('#form'), 'form');
    const active = expectPresent(wrapper.querySelector<Input>('#active'), 'active');
    const disabled = expectPresent(wrapper.querySelector<Input>('#disabled'), 'disabled');
    const readonlyField = expectPresent(wrapper.querySelector<Input>('#readonly'), 'readonly');

    await flush(active);
    await flush(disabled);
    await flush(readonlyField);

    form.reset();
    await flush(active);
    expect(active.value).to.equal('初期値');

    expect(getInnerInput(disabled).disabled).to.equal(true);
    expect(disabled.checkValidity()).to.equal(true);
    expect(getInnerInput(readonlyField).readOnly).to.equal(true);

    const formData = new FormData(form);
    expect(formData.get('active')).to.equal('初期値');
    expect(formData.has('disabledField')).to.equal(false);
    expect(formData.get('readonlyField')).to.equal('readonly-value');
  });

  it('unsupported type を text に正規化し、Enter submit と pass-through hints を公開すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-input id="invalid-type" label="数値のつもり" type="number"></ui-input>
        <form id="submit-form">
          <ui-input
            id="submitter"
            label="検索語"
            name="query"
            enterkeyhint="next"
            inputmode="tel"
            autocapitalize="off"
            spellcheck="false"
          ></ui-input>
          <button type="submit">送信</button>
          <output id="submit-count">0</output>
        </form>
      </div>
    `);

    const invalidType = expectPresent(wrapper.querySelector<Input>('#invalid-type'), 'invalidType');
    const submitter = expectPresent(wrapper.querySelector<Input>('#submitter'), 'submitter');
    const form = expectPresent(
      wrapper.querySelector<HTMLFormElement>('#submit-form'),
      'submit form',
    );
    const output = expectPresent(
      wrapper.querySelector<HTMLOutputElement>('#submit-count'),
      'output',
    );

    await flush(invalidType);
    await flush(submitter);

    const invalidInner = getInnerInput(invalidType);
    expect(invalidType.getAttribute('type')).to.equal('text');
    expect(invalidInner.type).to.equal('text');

    const submitInner = getInnerInput(submitter);
    expect(submitInner.getAttribute('inputmode')).to.equal('tel');
    expect(submitInner.getAttribute('enterkeyhint')).to.equal('next');
    expect(['off', 'none']).to.include(submitInner.getAttribute('autocapitalize'));
    expect(submitInner.getAttribute('spellcheck')).to.equal('false');

    let submitCount = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitCount += 1;
      output.textContent = String(submitCount);
    });

    submitInner.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    );
    await flush(submitter);

    expect(output.textContent).to.equal('1');
  });
});
