import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/select/select.js';
import type { Select, SelectOption } from '../../src/components/ui/select/select.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const FRUIT_OPTIONS: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
  { value: 'elderberry', label: 'Elderberry' },
];

const OPTIONS_WITH_DISABLED: SelectOption[] = [
  { value: 'active1', label: '有効な選択肢 1' },
  { value: 'disabled1', label: '無効な選択肢 1', disabled: true },
  { value: 'active2', label: '有効な選択肢 2' },
  { value: 'disabled2', label: '無効な選択肢 2', disabled: true },
  { value: 'active3', label: '有効な選択肢 3' },
];

const MANY_OPTIONS: SelectOption[] = Array.from({ length: 20 }, (_, index) => ({
  value: `item-${(index + 1).toString()}`,
  label: `選択肢 ${(index + 1).toString()}`,
}));

const SINGLE_OPTION: SelectOption[] = [{ value: 'only', label: '唯一の選択肢' }];
const ALL_DISABLED_OPTIONS: SelectOption[] = [
  { value: 'a', label: '選択肢 A', disabled: true },
  { value: 'b', label: '選択肢 B', disabled: true },
];

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (select: Select): Promise<void> => {
  await waitForLitUpdate(select);
  await nextAnimationFrame();
  await nextAnimationFrame();
  await waitForLitUpdate(select);
};

const getTrigger = (select: Select): HTMLInputElement =>
  expectPresent(select.shadowRoot?.querySelector<HTMLInputElement>('[role="combobox"]'), 'trigger');

const getListbox = (select: Select): HTMLElement | null => select.getListboxElement();

const getOptions = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-ui-select-option]'));

const withControlledTimeout = async (
  run: (controls: { fireLatestTimer: () => void }) => Promise<void>,
): Promise<void> => {
  const originalSetTimeout = window.setTimeout;
  const originalClearTimeout = window.clearTimeout;
  let nextId = 1;
  const scheduled = new Map<number, () => void>();
  let latestTimerId: number | null = null;

  const controlledSetTimeout = ((callback: TimerHandler, _delay?: number) => {
    const id = nextId++;
    scheduled.set(id, () => {
      if (typeof callback === 'function') {
        callback();
        return;
      }
      throw new Error('文字列コールバックの setTimeout はこのテストでは扱いません');
    });
    latestTimerId = id;
    return id;
  }) as unknown as typeof window.setTimeout;
  window.setTimeout = controlledSetTimeout;

  const controlledClearTimeout = ((handle?: number) => {
    if (handle === null || handle === undefined) return;
    scheduled.delete(handle);
    if (latestTimerId === handle) {
      latestTimerId = null;
    }
  }) as unknown as typeof window.clearTimeout;
  window.clearTimeout = controlledClearTimeout;

  try {
    await run({
      fireLatestTimer: () => {
        const timerId = latestTimerId;
        if (timerId === null) {
          throw new Error('typeahead timer が登録されていません');
        }

        const callback = scheduled.get(timerId);
        scheduled.delete(timerId);
        latestTimerId = null;

        if (!callback) {
          throw new Error('typeahead timer が clear 済みです');
        }

        callback();
      },
    });
  } finally {
    window.setTimeout = originalSetTimeout;
    window.clearTimeout = originalClearTimeout;
  }
};

describe('ui-select browser contract', () => {
  it('disabled / readonly を trigger の状態と開閉抑止へ反映すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-select id="disabled" label="無効" disabled .options=${FRUIT_OPTIONS}></ui-select>
        <ui-select
          id="readonly"
          label="読み取り専用"
          readonly
          .options=${FRUIT_OPTIONS}
        ></ui-select>
      </div>
    `);

    const disabledSelect = expectPresent(
      wrapper.querySelector<Select>('#disabled'),
      'disabledSelect',
    );
    const readonlySelect = expectPresent(
      wrapper.querySelector<Select>('#readonly'),
      'readonlySelect',
    );

    await flush(disabledSelect);
    await flush(readonlySelect);

    const disabledTrigger = getTrigger(disabledSelect);
    const readonlyTrigger = getTrigger(readonlySelect);

    expect(disabledTrigger.disabled).to.equal(true);
    expect(disabledTrigger.getAttribute('aria-disabled')).to.equal('true');
    expect(readonlyTrigger.getAttribute('aria-readonly')).to.equal('true');

    disabledTrigger.click();
    readonlyTrigger.click();
    await flush(disabledSelect);
    await flush(readonlySelect);

    expect(disabledSelect.opened).to.equal(false);
    expect(readonlySelect.opened).to.equal(false);
  });

  it('keyboard navigation で listbox を開き、disabled option を飛ばして Home/End/Tab/Escape を処理すること', async () => {
    const select = await fixture<Select>(html`
      <ui-select
        label="キーボード"
        placeholder="選択してください"
        .options=${OPTIONS_WITH_DISABLED}
      ></ui-select>
    `);

    await flush(select);

    const trigger = getTrigger(select);
    dispatchKey(trigger, 'ArrowDown');
    await flush(select);

    expect(select.opened).to.equal(true);
    expect(trigger.getAttribute('aria-activedescendant')).to.not.equal(null);

    dispatchKey(trigger, 'ArrowDown');
    await flush(select);

    let activeId = trigger.getAttribute('aria-activedescendant');
    expect(activeId).to.not.equal(null);
    const secondActive = activeId ? document.getElementById(activeId) : null;
    expect(secondActive?.getAttribute('data-index')).to.equal('2');

    dispatchKey(trigger, 'End');
    await flush(select);

    activeId = trigger.getAttribute('aria-activedescendant');
    const endActive = activeId ? document.getElementById(activeId) : null;
    expect(endActive?.getAttribute('data-index')).to.equal('4');

    dispatchKey(trigger, 'Home');
    await flush(select);

    activeId = trigger.getAttribute('aria-activedescendant');
    const homeActive = activeId ? document.getElementById(activeId) : null;
    expect(homeActive?.getAttribute('data-index')).to.equal('0');

    dispatchKey(trigger, ' ');
    await flush(select);

    expect(select.modelValue).to.equal('active1');
    expect(select.opened).to.equal(false);

    dispatchKey(trigger, 'Enter');
    await flush(select);
    expect(select.opened).to.equal(true);

    dispatchKey(trigger, 'Tab');
    await flush(select);
    expect(select.opened).to.equal(false);

    dispatchKey(trigger, 'Enter');
    await flush(select);
    dispatchKey(trigger, 'Escape');
    await flush(select);
    expect(select.opened).to.equal(false);
  });

  it('FormData と change event を公開し、同じ値の再選択では change を再送しないこと', async () => {
    const options: SelectOption[] = [
      { value: 'tokyo', label: '東京都' },
      { value: 'fukuoka', label: '福岡県' },
    ];

    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <form id="select-form">
          <ui-select
            id="select"
            label="都道府県"
            name="prefecture"
            placeholder="選択してください"
            .options=${options}
          ></ui-select>
        </form>
      </div>
    `);

    const form = expectPresent(wrapper.querySelector<HTMLFormElement>('#select-form'), 'form');
    const select = expectPresent(wrapper.querySelector<Select>('#select'), 'select');
    await flush(select);

    expect(new FormData(form).get('prefecture')).to.equal('');

    let changeCount = 0;
    let changedValue = '';
    select.addEventListener('change', (event: Event) => {
      changeCount += 1;
      if (event instanceof CustomEvent) {
        changedValue = String((event.detail as { value: string }).value);
      }
    });

    const trigger = getTrigger(select);
    dispatchKey(trigger, 'Enter');
    await flush(select);
    dispatchKey(trigger, 'ArrowDown');
    await flush(select);
    dispatchKey(trigger, 'Enter');
    await flush(select);

    expect(select.modelValue).to.equal('fukuoka');
    expect(new FormData(form).get('prefecture')).to.equal('fukuoka');
    expect(changeCount).to.equal(1);
    expect(changedValue).to.equal('fukuoka');

    dispatchKey(trigger, 'Enter');
    await flush(select);
    dispatchKey(trigger, 'Enter');
    await flush(select);

    expect(select.modelValue).to.equal('fukuoka');
    expect(changeCount).to.equal(1);
  });

  it('error state transition で helpText と errorMessage と aria-describedby を切り替えること', async () => {
    const select = await fixture<Select>(html`
      <ui-select
        label="都道府県"
        help-text="通常時の補助文言"
        .options=${FRUIT_OPTIONS}
      ></ui-select>
    `);

    await flush(select);

    const trigger = getTrigger(select);
    const help = expectPresent(select.shadowRoot?.querySelector<HTMLElement>('.help-text'), 'help');

    expect(trigger.getAttribute('aria-describedby')).to.equal(help.id);
    expect(select.shadowRoot?.querySelector('.error-message')).to.equal(null);

    select.error = true;
    select.errorMessage = '選択してください';
    await flush(select);

    const error = expectPresent(
      select.shadowRoot?.querySelector<HTMLElement>('.error-message'),
      'error message',
    );
    expect(trigger.getAttribute('aria-invalid')).to.equal('true');
    expect(trigger.getAttribute('aria-describedby')).to.equal(error.id);
    expect(select.shadowRoot?.querySelector('.help-text')).to.equal(null);

    select.error = false;
    select.errorMessage = '';
    await flush(select);

    const restoredHelp = expectPresent(
      select.shadowRoot?.querySelector<HTMLElement>('.help-text'),
      'restored help',
    );
    expect(trigger.getAttribute('aria-invalid')).to.equal('false');
    expect(trigger.getAttribute('aria-describedby')).to.equal(restoredHelp.id);
  });

  it('長い選択肢リストで ArrowDown 移動と listbox 自体の scroll では閉じないこと', async () => {
    const select = await fixture<Select>(html`
      <ui-select label="多数" .options=${MANY_OPTIONS}></ui-select>
    `);

    await flush(select);

    const trigger = getTrigger(select);
    dispatchKey(trigger, 'ArrowDown');
    await flush(select);

    for (let i = 0; i < 12; i += 1) {
      dispatchKey(trigger, 'ArrowDown');
      await flush(select);
    }

    expect(select.opened).to.equal(true);
    const activeId = trigger.getAttribute('aria-activedescendant');
    const active = activeId ? document.getElementById(activeId) : null;
    expect(active?.getAttribute('data-index')).to.equal('12');

    const listbox = expectPresent(getListbox(select), 'listbox');
    listbox.scrollTop = listbox.scrollHeight;
    listbox.dispatchEvent(new Event('scroll', { bubbles: true }));
    await flush(select);

    expect(select.opened).to.equal(true);
  });

  it('empty options / single option / all-disabled options でクラッシュせず境界動作を維持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <ui-select id="empty" label="空" .options=${[]}></ui-select>
        <ui-select id="single" label="単一" .options=${SINGLE_OPTION}></ui-select>
        <ui-select id="all-disabled" label="全無効" .options=${ALL_DISABLED_OPTIONS}></ui-select>
      </div>
    `);

    const empty = expectPresent(wrapper.querySelector<Select>('#empty'), 'empty');
    const single = expectPresent(wrapper.querySelector<Select>('#single'), 'single');
    const allDisabled = expectPresent(
      wrapper.querySelector<Select>('#all-disabled'),
      'allDisabled',
    );

    await flush(empty);
    await flush(single);
    await flush(allDisabled);

    dispatchKey(getTrigger(empty), 'ArrowDown');
    await flush(empty);
    expect(getOptions()).to.have.length(0);
    dispatchKey(getTrigger(empty), 'Escape');
    await flush(empty);

    const singleTrigger = getTrigger(single);
    dispatchKey(singleTrigger, 'ArrowDown');
    await flush(single);
    dispatchKey(singleTrigger, 'Enter');
    await flush(single);
    expect(single.modelValue).to.equal('only');

    const disabledTrigger = getTrigger(allDisabled);
    dispatchKey(disabledTrigger, 'ArrowDown');
    await flush(allDisabled);
    dispatchKey(disabledTrigger, 'Enter');
    await flush(allDisabled);
    expect(allDisabled.modelValue).to.equal('');
  });

  it('typeahead で aria-activedescendant を更新し、1秒後にバッファをリセットすること', async () => {
    const select = await fixture<Select>(html`
      <ui-select label="フルーツ" .options=${FRUIT_OPTIONS}></ui-select>
    `);

    await flush(select);

    const trigger = getTrigger(select);
    await withControlledTimeout(async ({ fireLatestTimer }) => {
      dispatchKey(trigger, 'c');
      await flush(select);
      dispatchKey(trigger, 'h');
      await flush(select);

      expect(select.opened).to.equal(true);
      let activeId = trigger.getAttribute('aria-activedescendant');
      let active = activeId ? document.getElementById(activeId) : null;
      expect(active?.textContent?.includes('Cherry')).to.equal(true);

      // 実時間待ちを避けつつ、typeahead の 1 秒リセット契約だけを直接進める。
      fireLatestTimer();

      dispatchKey(trigger, 'b');
      await flush(select);

      activeId = trigger.getAttribute('aria-activedescendant');
      active = activeId ? document.getElementById(activeId) : null;
      expect(active?.textContent?.includes('Banana')).to.equal(true);
    });

    dispatchKey(trigger, 'Escape');
    await flush(select);
    expect(select.opened).to.equal(false);
  });
});
