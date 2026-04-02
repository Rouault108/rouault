import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/textarea/textarea.js';
import type { Textarea } from '../../src/components/ui/textarea/textarea.js';
import { nextAnimationFrame, waitForLitUpdate, waitMs } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (textarea: Textarea): Promise<void> => {
  await waitForLitUpdate(textarea);
  await nextAnimationFrame();
  await waitForLitUpdate(textarea);
};

const getInnerTextarea = (host: Textarea): HTMLTextAreaElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea'), 'textarea');

describe('ui-textarea browser contract', () => {
  it('Auto Grow / maxRows / autoGrow=false を反映すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-textarea id="auto" label="自動伸長" rows="1" auto-grow></ui-textarea>
        <ui-textarea id="max" label="最大行数" rows="1" max-rows="2" auto-grow></ui-textarea>
        <ui-textarea id="manual" label="手動" rows="3" .autoGrow=${false}></ui-textarea>
      </div>
    `);

    const auto = expectPresent(wrapper.querySelector<Textarea>('#auto'), 'auto');
    const max = expectPresent(wrapper.querySelector<Textarea>('#max'), 'max');
    const manual = expectPresent(wrapper.querySelector<Textarea>('#manual'), 'manual');

    await flush(auto);
    await flush(max);
    await flush(manual);

    const autoTextarea = getInnerTextarea(auto);
    const maxTextarea = getInnerTextarea(max);
    const manualTextarea = getInnerTextarea(manual);

    const autoInitialHeight = autoTextarea.offsetHeight;
    auto.value = 'Line 1\nLine 2\nLine 3';
    await flush(auto);
    await waitMs(50);
    expect(autoTextarea.offsetHeight).to.be.greaterThan(autoInitialHeight);

    max.value = 'Line 1\nLine 2\nLine 3\nLine 4';
    await flush(max);
    await waitMs(50);
    expect(maxTextarea.classList.contains('overflow-scroll')).to.equal(true);

    expect(manualTextarea.style.height).to.equal('');
    expect(manualTextarea.style.maxHeight).to.equal('');
    expect(manualTextarea.style.minHeight).to.not.equal('');
  });

  it('input/change/focus/blur を host から再送すること', async () => {
    const host = await fixture<Textarea>(html`
      <ui-textarea label="イベント" rows="3"></ui-textarea>
    `);

    await flush(host);

    const textarea = getInnerTextarea(host);

    let inputCount = 0;
    let changeCount = 0;
    let focusCount = 0;
    let blurCount = 0;

    host.addEventListener('input', () => {
      inputCount += 1;
    });
    host.addEventListener('change', () => {
      changeCount += 1;
    });
    host.addEventListener('focus', () => {
      focusCount += 1;
    });
    host.addEventListener('blur', () => {
      blurCount += 1;
    });

    textarea.value = 'テスト入力';
    textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    host.focus();
    await nextAnimationFrame();
    host.blur();
    await nextAnimationFrame();

    expect(host.value).to.equal('テスト入力');
    expect(inputCount).to.equal(1);
    expect(changeCount).to.equal(1);
    expect(focusCount).to.equal(1);
    expect(blurCount).to.equal(1);
  });

  it('empty label で console.error を出し、required と forced error without message を処理すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-textarea id="empty" label="temp"></ui-textarea>
        <ui-textarea id="required" label="必須" required></ui-textarea>
        <ui-textarea id="forced-error" label="エラー" error error-message=""></ui-textarea>
      </div>
    `);

    const empty = expectPresent(wrapper.querySelector<Textarea>('#empty'), 'empty');
    const requiredField = expectPresent(wrapper.querySelector<Textarea>('#required'), 'required');
    const forcedError = expectPresent(wrapper.querySelector<Textarea>('#forced-error'), 'forcedError');

    await flush(empty);
    await flush(requiredField);
    await flush(forcedError);

    const originalError = console.error;
    let errorCalled = false;
    console.error = (...args: unknown[]) => {
      if (String(args[0]).includes('[ui-textarea]')) {
        errorCalled = true;
      }
    };

    try {
      empty.label = '';
      await flush(empty);
    } finally {
      console.error = originalError;
    }

    expect(errorCalled).to.equal(true);

    const requiredTextarea = getInnerTextarea(requiredField);
    expect(requiredTextarea.required).to.equal(true);
    requiredField.value = '';
    await flush(requiredField);
    expect(requiredField.checkValidity()).to.equal(false);

    requiredField.value = 'テスト入力';
    await flush(requiredField);
    expect(requiredField.checkValidity()).to.equal(true);

    const forcedErrorTextarea = getInnerTextarea(forcedError);
    expect(forcedErrorTextarea.getAttribute('aria-invalid')).to.equal('true');
    expect(forcedErrorTextarea.classList.contains('error')).to.equal(true);
    expect(forcedError.shadowRoot?.querySelector('.error-message--visible')).to.equal(null);
    expect(forcedError.checkValidity()).to.equal(false);
  });

  it('disabled + error を保持しつつ readonly/disabled を内部 textarea へ委譲すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-textarea id="disabled-error" label="無効" disabled error error-message="エラー"></ui-textarea>
        <ui-textarea id="readonly" label="読み取り専用" readonly value="read-only"></ui-textarea>
      </div>
    `);

    const disabledError = expectPresent(
      wrapper.querySelector<Textarea>('#disabled-error'),
      'disabledError',
    );
    const readonlyField = expectPresent(wrapper.querySelector<Textarea>('#readonly'), 'readonly');

    await flush(disabledError);
    await flush(readonlyField);

    const disabledTextarea = getInnerTextarea(disabledError);
    const readonlyTextarea = getInnerTextarea(readonlyField);

    expect(disabledTextarea.disabled).to.equal(true);
    expect(disabledTextarea.classList.contains('error')).to.equal(true);
    expect(disabledTextarea.getAttribute('aria-invalid')).to.equal('true');
    expect(readonlyTextarea.readOnly).to.equal(true);
  });

  it('programmatic value change でも伸長し、clear で縮み、rows/maxRows inversion をそのまま受け入れること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-textarea id="programmatic" label="プログラム" rows="3" auto-grow></ui-textarea>
        <ui-textarea id="inversion" label="逆転" rows="6" max-rows="3" auto-grow></ui-textarea>
      </div>
    `);

    const programmatic = expectPresent(
      wrapper.querySelector<Textarea>('#programmatic'),
      'programmatic',
    );
    const inversion = expectPresent(wrapper.querySelector<Textarea>('#inversion'), 'inversion');

    await flush(programmatic);
    await flush(inversion);

    const programmaticTextarea = getInnerTextarea(programmatic);
    const initialHeight = programmaticTextarea.offsetHeight;

    programmatic.value = Array.from({ length: 10 }, (_, index) => `Line ${index + 1}`).join('\n');
    await flush(programmatic);
    await waitMs(50);
    const expandedHeight = programmaticTextarea.offsetHeight;
    expect(expandedHeight).to.be.greaterThan(initialHeight);

    programmatic.value = '';
    await flush(programmatic);
    await waitMs(50);
    expect(programmaticTextarea.offsetHeight).to.be.lessThan(expandedHeight);

    expect(inversion.rows).to.equal(6);
    expect(inversion.maxRows).to.equal(3);
  });
});
