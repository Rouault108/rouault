import type { Meta, StoryObj } from '@storybook/web-components';
import { html, nothing } from 'lit';
import './dropdown';
import { type Dropdown } from './dropdown';

const triggerStyle = `
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: 32px;
  border: 1px solid oklch(90% 0.01 250 / 0.3);
  border-radius: 6px;
  background: oklch(97% 0 0);
  cursor: pointer;
  font-size: 14px;
`;

const createTrigger = (label: string, id?: string) => html`
  <button id="${id ?? nothing}" slot="trigger" style="${triggerStyle}">
    ${label}
    <iconify-icon
      icon="lucide:chevron-down"
      aria-hidden="true"
      style="width: 14px; height: 14px;"
    ></iconify-icon>
  </button>
`;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitUntil = async (
  predicate: () => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> => {
  const timeoutMs = options.timeoutMs ?? 1000;
  const intervalMs = options.intervalMs ?? 16;
  const startedAt = performance.now();

  while (!predicate()) {
    if (performance.now() - startedAt > timeoutMs) {
      throw new Error(`条件待機がタイムアウトしました: ${String(timeoutMs)}ms`);
    }
    await wait(intervalMs);
  }
};

const getPanel = (dropdown: Dropdown): HTMLElement => {
  const panel = dropdown.shadowRoot?.querySelector<HTMLElement>('.panel');
  if (!panel) {
    throw new Error('panel 要素が見つかりませんでした');
  }
  return panel;
};

const getMenuButton = (item: HTMLElement): HTMLButtonElement => {
  const button = item.shadowRoot?.querySelector<HTMLButtonElement>('button');
  if (!button) {
    throw new Error('menu item 内の button が見つかりませんでした');
  }
  return button;
};

const getFocusedValue = (canvasElement: HTMLElement): string | null => {
  const items = canvasElement.querySelectorAll<HTMLElement>('ui-menu-item');
  for (const item of items) {
    if (item.shadowRoot?.activeElement instanceof HTMLButtonElement) {
      return item.getAttribute('value');
    }
  }
  return null;
};

const meta: Meta<Dropdown> = {
  title: 'Components/Dropdown',
  component: 'ui-dropdown',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
command menu family の dropdown です。用途は command の提示と選択に限定し、navigation menu や arbitrary popover の代替としては扱いません。

## 公開契約

- \`opened\` が唯一の公開開閉状態です
- 配置の正式入力は \`side\` と \`align\` です
- 選択イベントは \`menu-item-select\` だけを公開します
- \`ui-menu-item[text-value]\` は type-ahead と機械可読ラベルの一次情報源です
        `,
      },
    },
  },
  argTypes: {
    opened: {
      control: 'boolean',
      description: '開閉状態',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
      description: 'panel を出す辺',
      table: {
        type: { summary: `'top' | 'right' | 'bottom' | 'left'` },
        defaultValue: { summary: 'bottom' },
      },
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end'],
      description: 'panel の整列',
      table: {
        type: { summary: `'start' | 'center' | 'end'` },
        defaultValue: { summary: 'start' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'dropdown の開閉無効化',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<Dropdown>;

export const Default: Story = {
  args: {
    opened: false,
    side: 'bottom',
    align: 'start',
    disabled: false,
  },
  render: (args) => html`
    <div style="padding: 2rem;">
      <ui-dropdown
        id="default-dropdown"
        ?opened="${args.opened}"
        side="${args.side}"
        align="${args.align}"
        ?disabled="${args.disabled}"
      >
        ${createTrigger('メニュー')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#default-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    if (dropdown.opened) throw new Error('初期状態は閉状態である必要があります');
    if (dropdown.side !== 'bottom') throw new Error('既定 side は bottom である必要があります');

    dropdown.open();
    await dropdown.updateComplete;
    if (!dropdown.opened) throw new Error('open() 後に opened=true になる必要があります');

    dropdown.close();
    await dropdown.updateComplete;
    if (dropdown.opened) throw new Error('close() 後に opened=false になる必要があります');
  },
};

export const DefaultVariantNormal: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="default-variant-dropdown" opened>
        ${createTrigger('操作')}
        <ui-menu-item value="new">新規作成</ui-menu-item>
        <ui-menu-item value="open">開く</ui-menu-item>
        <ui-menu-item value="save">保存</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#default-variant-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    if (getPanel(dropdown).getAttribute('role') !== 'menu') {
      throw new Error('panel は role="menu" を持つ必要があります');
    }
  },
};

export const DangerVariantNormal: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown opened>
        ${createTrigger('危険操作')}
        <ui-menu-item value="archive">アーカイブ</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: ({ canvasElement }) => {
    const dangerItem = canvasElement.querySelector<HTMLElement>('ui-menu-item[variant="danger"]');
    if (!dangerItem) throw new Error('danger 項目が見つかりませんでした');
  },
};

export const DefaultVariantDisabledItem: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown opened>
        ${createTrigger('通常項目')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy" disabled>コピー</ui-menu-item>
        <ui-menu-item value="paste">貼り付け</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const item = canvasElement.querySelector<HTMLElement>('ui-menu-item[disabled]');
    if (!item) throw new Error('disabled item が見つかりませんでした');
    await wait(0);

    const button = getMenuButton(item);
    if (!button.disabled)
      throw new Error('disabled item の内部 button は disabled である必要があります');
    if (button.getAttribute('aria-disabled') !== 'true') {
      throw new Error('disabled item の内部 button は aria-disabled="true" を持つ必要があります');
    }
  },
};

export const DangerVariantDisabledItem: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown opened>
        ${createTrigger('権限付き操作')}
        <ui-menu-item value="view">詳細を見る</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger" disabled>削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const item = canvasElement.querySelector<HTMLElement>(
      'ui-menu-item[variant="danger"][disabled]',
    );
    if (!item) throw new Error('danger かつ disabled の項目が見つかりませんでした');
    await wait(0);
    if (!getMenuButton(item).disabled)
      throw new Error('danger disabled 項目は操作不能である必要があります');
  },
};

export const DropdownDisabled: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="dropdown-disabled" disabled>
        ${createTrigger('無効な dropdown')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#dropdown-disabled');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    dropdown.open();
    await dropdown.updateComplete;
    if (dropdown.opened) throw new Error('disabled dropdown は開いてはなりません');
  },
};

export const WithIcons: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown opened>
        ${createTrigger('ファイル')}
        <ui-menu-item value="new" text-value="新規作成">
          <iconify-icon icon="lucide:file-plus"></iconify-icon>
          新規作成
        </ui-menu-item>
        <ui-menu-item value="open" text-value="開く">
          <iconify-icon icon="lucide:folder-open"></iconify-icon>
          開く
        </ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger" text-value="削除">
          <iconify-icon icon="lucide:trash-2"></iconify-icon>
          削除
        </ui-menu-item>
      </ui-dropdown>
    </div>
  `,
};

export const WithSeparators: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown opened>
        ${createTrigger('編集')}
        <ui-menu-item value="cut">切り取り</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="select-all">すべて選択</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const separator = canvasElement.querySelector<HTMLElement>('ui-menu-separator');
    if (!separator) throw new Error('separator が見つかりませんでした');
    await wait(0);

    const node = separator.shadowRoot?.querySelector('.separator');
    if (node?.getAttribute('role') !== 'separator') {
      throw new Error('separator は role="separator" を持つ必要があります');
    }
  },
};

export const EventHandling: Story = {
  render: () => html`
    <div style="padding: 2rem; display: flex; flex-direction: column; gap: 1rem;">
      <ui-dropdown id="event-dropdown">
        ${createTrigger('操作を選択')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
      <div id="event-log" style="font-size: 13px;">未選択</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#event-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    const detailPromise = new Promise<{ value: string; label: string }>((resolve) => {
      dropdown.addEventListener(
        'menu-item-select',
        (event) => {
          resolve((event as CustomEvent<{ value: string; label: string }>).detail);
        },
        { once: true },
      );
    });

    dropdown.open();
    await dropdown.updateComplete;
    await wait(30);

    const item = canvasElement.querySelector<HTMLElement>('ui-menu-item[value="edit"]');
    if (!item) throw new Error('選択対象が見つかりませんでした');
    getMenuButton(item).click();

    const detail = await detailPromise;
    if (detail.value !== 'edit') throw new Error('menu-item-select.detail.value が不正です');
    if (detail.label !== '編集') throw new Error('menu-item-select.detail.label が不正です');
    if (dropdown.opened) throw new Error('選択後は dropdown が閉じる必要があります');
  },
};

export const KeyboardNavigation: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="keyboard-dropdown">
        ${createTrigger('キーボード操作', 'keyboard-trigger')}
        <ui-menu-item value="new">新規作成</ui-menu-item>
        <ui-menu-item value="copy" disabled>コピー</ui-menu-item>
        <ui-menu-item value="paste">貼り付け</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#keyboard-dropdown');
    const trigger = canvasElement.querySelector<HTMLElement>('#keyboard-trigger');
    if (!dropdown || !trigger) throw new Error('必要な要素が見つかりませんでした');
    await dropdown.updateComplete;

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await waitUntil(() => dropdown.opened);
    await waitUntil(() => getFocusedValue(canvasElement) === 'new');

    getPanel(dropdown).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }),
    );
    await waitUntil(() => getFocusedValue(canvasElement) === 'paste');

    getPanel(dropdown).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }),
    );
    await waitUntil(() => getFocusedValue(canvasElement) === 'delete');

    getPanel(dropdown).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    await waitUntil(() => !dropdown.opened);
  },
};

export const AllItemsDisabled: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown opened>
        ${createTrigger('全項目無効')}
        <ui-menu-item value="edit" disabled>編集</ui-menu-item>
        <ui-menu-item value="copy" disabled>コピー</ui-menu-item>
        <ui-menu-item value="delete" variant="danger" disabled>削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: ({ canvasElement }) => {
    const items = canvasElement.querySelectorAll('ui-menu-item[disabled]');
    if (items.length !== 3) throw new Error('全項目が disabled である必要があります');
  },
};

export const SingleItem: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown opened>
        ${createTrigger('単一項目')}
        <ui-menu-item value="confirm" variant="danger">実行して削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: ({ canvasElement }) => {
    if (canvasElement.querySelectorAll('ui-menu-item').length !== 1) {
      throw new Error('単一項目 Story は 1 項目である必要があります');
    }
  },
};

export const ManyItems: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="many-items-dropdown" opened>
        ${createTrigger('多数項目')}
        ${Array.from(
          { length: 15 },
          (_, index) =>
            html`<ui-menu-item value="item-${String(index + 1)}"
              >項目 ${String(index + 1)}</ui-menu-item
            >`,
        )}
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#many-items-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;
    if (getComputedStyle(getPanel(dropdown)).overflowY !== 'auto') {
      throw new Error('多数項目時の panel はスクロール可能である必要があります');
    }
  },
};

export const LongLabels: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="long-labels-dropdown" opened>
        ${createTrigger('長いラベル')}
        <ui-menu-item value="short">短いラベル</ui-menu-item>
        <ui-menu-item value="long">非常に長いラベルのメニュー項目がここに表示されます</ui-menu-item>
        <ui-menu-item value="danger-long" variant="danger"
          >破壊的アクション: この操作は元に戻せません</ui-menu-item
        >
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#long-labels-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;
    if (getComputedStyle(getPanel(dropdown)).maxWidth !== '280px') {
      throw new Error('panel の最大幅は 280px である必要があります');
    }
  },
};

export const ProgrammaticControl: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="programmatic-dropdown">
        ${createTrigger('プログラム制御')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#programmatic-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    dropdown.open();
    await dropdown.updateComplete;
    dropdown.open();
    await dropdown.updateComplete;
    if (!dropdown.opened) throw new Error('open() は冪等に開状態を保つ必要があります');

    dropdown.toggle();
    await dropdown.updateComplete;
    if (dropdown.opened) throw new Error('toggle() は閉状態へ遷移できる必要があります');

    dropdown.close();
    await dropdown.updateComplete;
    if (dropdown.opened) throw new Error('close() は冪等に閉状態を保つ必要があります');
  },
};

export const AriaAttributes: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="aria-dropdown">
        ${createTrigger('ARIA 確認', 'aria-trigger')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#aria-dropdown');
    const trigger = canvasElement.querySelector<HTMLElement>('#aria-trigger');
    if (!dropdown || !trigger) throw new Error('必要な要素が見つかりませんでした');
    await dropdown.updateComplete;

    if (trigger.getAttribute('aria-haspopup') !== 'menu') {
      throw new Error('trigger は aria-haspopup="menu" を持つ必要があります');
    }

    const panel = getPanel(dropdown);
    if (panel.getAttribute('aria-labelledby') !== trigger.id) {
      throw new Error('panel は trigger を aria-labelledby で参照する必要があります');
    }

    dropdown.open();
    await dropdown.updateComplete;
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('展開時は aria-expanded="true" である必要があります');
    }
  },
};

export const SideTop: Story = {
  args: { side: 'top', align: 'start' },
  render: (args) => html`
    <div style="padding: 2rem; padding-top: 8rem;">
      <ui-dropdown id="side-top-dropdown" opened side="${args.side}" align="${args.align}">
        ${createTrigger('上方向に展開')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy">コピー</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#side-top-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;
    if (dropdown.side !== 'top') throw new Error('side="top" が保持される必要があります');
  },
};

export const ContextMenuExample: Story = {
  render: () => html`
    <div style="padding: 2rem; display: grid; gap: 0.5rem; max-width: 420px;">
      ${['原稿', '断章', '索引'].map(
        (name, index) => html`
          <div
            style="display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px;"
          >
            <span>${name}</span>
            <span style="font-size: 13px; color: oklch(48% 0.01 250);">更新済み</span>
            <ui-dropdown>
              <button
                slot="trigger"
                aria-label="${name} の操作メニュー"
                style="width: 32px; height: 32px; border: none; border-radius: 6px; background: transparent; cursor: pointer;"
              >
                ⋯
              </button>
              <ui-menu-item value="duplicate-${String(index)}">複製</ui-menu-item>
              <ui-menu-item value="rename-${String(index)}">名前を変更</ui-menu-item>
              <ui-menu-separator></ui-menu-separator>
              <ui-menu-item value="delete-${String(index)}" variant="danger">削除</ui-menu-item>
            </ui-dropdown>
          </div>
        `,
      )}
    </div>
  `,
};

export const ForcedColorsMode: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown opened>
        ${createTrigger('Forced Colors')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="copy" disabled>コピー</ui-menu-item>
        <ui-menu-separator></ui-menu-separator>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
};

export const ReducedMotion: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="reduced-motion-dropdown">
        ${createTrigger('Reduced Motion')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#reduced-motion-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;
    dropdown.open();
    await dropdown.updateComplete;
    dropdown.close();
    await dropdown.updateComplete;
  },
};

export const ClickOutsideClose: Story = {
  render: () => html`
    <div style="padding: 2rem; display: flex; gap: 1rem;">
      <ui-dropdown id="outside-close-dropdown" opened>
        ${createTrigger('外側クリック')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
      <button id="outside-target" style="height: 32px;">外側</button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#outside-close-dropdown');
    const outside = canvasElement.querySelector<HTMLElement>('#outside-target');
    if (!dropdown || !outside) throw new Error('必要な要素が見つかりませんでした');
    await dropdown.updateComplete;

    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
    await waitUntil(() => !dropdown.opened);
  },
};

export const ScrollClose: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="scroll-close-dropdown" opened>
        ${createTrigger('スクロールで閉じる')}
        <ui-menu-item value="edit">編集</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#scroll-close-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    window.dispatchEvent(new Event('scroll'));
    await waitUntil(() => !dropdown.opened);
  },
};

export const TypeaheadNavigation: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="typeahead-dropdown">
        ${createTrigger('Type-ahead')}
        <ui-menu-item value="copy" text-value="copy">Copy</ui-menu-item>
        <ui-menu-item value="commit" text-value="commit">Commit</ui-menu-item>
        <ui-menu-item value="delete" variant="danger" text-value="delete">Delete</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#typeahead-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;

    dropdown.open();
    await dropdown.updateComplete;
    await wait(30);

    const panel = getPanel(dropdown);
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true, composed: true }));
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true, composed: true }));
    await wait(10);

    if (getFocusedValue(canvasElement) !== 'copy') {
      throw new Error('type-ahead は text-value を優先して前方一致移動する必要があります');
    }
  },
};

export const NonButtonTriggerAria: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown disabled>
        <span
          id="non-button-trigger"
          slot="trigger"
          style="display: inline-flex; align-items: center; padding: 0 12px; height: 32px; border: 1px solid #ccc; border-radius: 6px;"
        >
          非 button trigger
        </span>
        <ui-menu-item value="edit">編集</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
  play: ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('#non-button-trigger');
    if (!trigger) throw new Error('trigger が見つかりませんでした');
    if (trigger.getAttribute('role') !== 'button') {
      throw new Error('非 button trigger には role="button" が補われる必要があります');
    }
    if (trigger.getAttribute('aria-disabled') !== 'true') {
      throw new Error('disabled 時は aria-disabled="true" が必要です');
    }
  },
};

export const DarkModeSurface: Story = {
  render: () => html`
    <div style="padding: 2rem; background: oklch(20% 0.01 250); border-radius: 8px;">
      <ui-dropdown opened>
        ${createTrigger('Dark Surface')}
        <ui-menu-item value="edit">編集</ui-menu-item>
        <ui-menu-item value="delete" variant="danger">削除</ui-menu-item>
      </ui-dropdown>
    </div>
  `,
};

export const EmptyMenu: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-dropdown id="empty-menu-dropdown" opened> ${createTrigger('空メニュー')} </ui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dropdown = canvasElement.querySelector<Dropdown>('#empty-menu-dropdown');
    if (!dropdown) throw new Error('ui-dropdown が見つかりません');
    await dropdown.updateComplete;
    if (!dropdown.opened) throw new Error('空メニューでも opened=true は保持される必要があります');
  },
};
