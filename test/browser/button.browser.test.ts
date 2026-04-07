import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/button/button.js';
import type { Button } from '../../src/components/ui/button/button.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: Button): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const getInnerButton = (host: Button): HTMLButtonElement =>
  expectPresent(host.shadowRoot?.querySelector<HTMLButtonElement>('button'), 'button');

describe('ui-button browser contract', () => {
  it('icon-only では aria-label を、可視ラベル構成では accessible-name を内部 button へ反映すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-button id="icon-only" icon-only aria-label="設定を開く">
          <span aria-hidden="true">⚙</span>
        </ui-button>
        <ui-button id="labeled" aria-label="内部へは出さない">保存</ui-button>
        <ui-button id="explicit-name" accessible-name="検索ダイアログを開く">
          <span aria-hidden="true">検索...</span>
        </ui-button>
      </div>
    `);

    const iconOnly = expectPresent(wrapper.querySelector<Button>('#icon-only'), 'icon-only');
    const labeled = expectPresent(wrapper.querySelector<Button>('#labeled'), 'labeled');
    const explicitName = expectPresent(
      wrapper.querySelector<Button>('#explicit-name'),
      'explicit-name',
    );

    await Promise.all([
      waitForLitUpdate(iconOnly),
      waitForLitUpdate(labeled),
      waitForLitUpdate(explicitName),
    ]);

    expect(getInnerButton(iconOnly).getAttribute('aria-label')).to.equal('設定を開く');
    expect(getInnerButton(labeled).getAttribute('aria-label')).to.equal(null);
    expect(getInnerButton(explicitName).getAttribute('aria-label')).to.equal(
      '検索ダイアログを開く',
    );
  });

  it('loading / disabled は disabled と aria-busy を反映し、click を抑止すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-button id="loading" loading>保存中</ui-button>
        <ui-button id="disabled" disabled>無効</ui-button>
      </div>
    `);

    const loading = expectPresent(wrapper.querySelector<Button>('#loading'), 'loading');
    const disabled = expectPresent(wrapper.querySelector<Button>('#disabled'), 'disabled');

    await flush(loading);
    await flush(disabled);

    const loadingButton = getInnerButton(loading);
    const disabledButton = getInnerButton(disabled);

    expect(loadingButton.disabled).to.equal(true);
    expect(loadingButton.getAttribute('aria-busy')).to.equal('true');
    expect(loading.shadowRoot?.querySelector('.spinner')).to.not.equal(null);
    expect(disabledButton.disabled).to.equal(true);

    let loadingClicks = 0;
    let disabledClicks = 0;
    loading.addEventListener('click', () => {
      loadingClicks += 1;
    });
    disabled.addEventListener('click', () => {
      disabledClicks += 1;
    });

    loading.click();
    disabled.click();
    await flush(loading);
    await flush(disabled);

    expect(loadingClicks).to.equal(0);
    expect(disabledClicks).to.equal(0);
  });

  it('pressed と trigger 系 aria 属性を内部 button へ反映すること', async () => {
    const host = await fixture<Button>(html`
      <ui-button
        pressed
        aria-expanded="true"
        aria-controls="panel-1"
        aria-haspopup="menu"
        aria-describedby="help-id"
      >
        表示切替
      </ui-button>
    `);

    await flush(host);

    const button = getInnerButton(host);
    expect(button.getAttribute('aria-pressed')).to.equal('true');
    expect(button.getAttribute('aria-expanded')).to.equal('true');
    expect(button.getAttribute('aria-controls')).to.equal('panel-1');
    expect(button.getAttribute('aria-haspopup')).to.equal('menu');
    expect(button.getAttribute('aria-describedby')).to.equal('help-id');
  });

  it('submit / reset を Shadow DOM 境界越しにフォームオーナーへ委譲すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <form id="editor-form">
          <input id="title" name="title" value="初期値" />
          <ui-button id="submitter" type="submit">保存</ui-button>
          <ui-button id="resetter" type="reset">リセット</ui-button>
        </form>
      </div>
    `);

    const form = expectPresent(wrapper.querySelector<HTMLFormElement>('#editor-form'), 'form');
    const input = expectPresent(wrapper.querySelector<HTMLInputElement>('#title'), 'input');
    const submitter = expectPresent(wrapper.querySelector<Button>('#submitter'), 'submitter');
    const resetter = expectPresent(wrapper.querySelector<Button>('#resetter'), 'resetter');

    let submitCount = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitCount += 1;
    });

    await flush(submitter);
    await flush(resetter);

    submitter.click();
    await flush(submitter);
    expect(submitCount).to.equal(1);

    input.value = '変更後';
    resetter.click();
    await flush(resetter);

    expect(input.value).to.equal('初期値');
  });
});