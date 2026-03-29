import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { userEvent } from 'storybook/test';
import './search-trigger';
import type { SearchTrigger } from './search-trigger';

function requireTrigger(canvasElement: Element, id: string): SearchTrigger {
  const trigger = canvasElement.querySelector<SearchTrigger>(`#${id}`);

  if (!trigger) {
    throw new Error(`ui-search-trigger#${id} が見つかりません`);
  }

  return trigger;
}

function requireButton(trigger: SearchTrigger): HTMLButtonElement {
  const button = trigger.shadowRoot?.querySelector<HTMLButtonElement>('button');

  if (!button) {
    throw new Error('Shadow DOM 内に button 要素が見つかりません');
  }

  return button;
}

/**
 * `ui-search-trigger` は検索ダイアログの起動要求だけを通知する stateless launcher です。
 * 見た目は input-like ですが、実体はネイティブ `button` であり、検索語や開閉状態は保持しません。
 */
const meta: Meta<SearchTrigger> = {
  title: 'Components/SearchTrigger',
  component: 'ui-search-trigger',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
検索トリガーは検索ダイアログを開く **request event の起点** です。
検索入力値、ショートカット登録、ダイアログ開閉状態は所有しません。

## 公開契約

- 実体はネイティブ \`button\`
- \`placeholder\` は視覚表示専用
- \`density\` は \`auto | default | compact | icon-only\`
- \`open-search-dialog\` は上位レイヤへ送る request event
- \`aria-label\` / \`aria-controls\` / \`aria-expanded\` は外部から委譲可能
        `,
      },
    },
  },
  argTypes: {
    placeholder: {
      control: 'text',
      description: '視覚表示専用のラベル',
      table: { type: { summary: 'string' }, defaultValue: { summary: '検索...' } },
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    density: {
      control: 'select',
      options: ['auto', 'default', 'compact', 'icon-only'],
      description: '視覚密度',
      table: {
        type: { summary: "'auto' | 'default' | 'compact' | 'icon-only'" },
        defaultValue: { summary: 'auto' },
      },
    },
    ariaLabel: {
      control: 'text',
      name: 'aria-label',
      description: 'アクセシブル名の上書き',
      table: { type: { summary: 'string | null' } },
    },
    ariaControls: {
      control: 'text',
      name: 'aria-controls',
      description: '関連ダイアログ ID',
      table: { type: { summary: 'string | null' } },
    },
    ariaExpanded: {
      control: 'text',
      name: 'aria-expanded',
      description: '外部制御の開状態',
      table: { type: { summary: 'string | null' } },
    },
  },
};

export default meta;
type Story = StoryObj<SearchTrigger>;

export const Default: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    placeholder: '検索...',
    disabled: false,
    density: 'auto',
  },
  render: (args) => html`
    <ui-search-trigger
      id="default-trigger"
      .placeholder=${args.placeholder}
      ?disabled=${args.disabled}
      density="${args.density}"
      aria-label=${args.ariaLabel ?? '検索ダイアログを開く'}
      aria-controls=${ifDefined(args.ariaControls ?? undefined)}
      aria-expanded=${ifDefined(args.ariaExpanded ?? undefined)}
    ></ui-search-trigger>
  `,
  play: async ({ canvasElement }) => {
    const trigger = requireTrigger(canvasElement, 'default-trigger');
    await trigger.updateComplete;

    const button = requireButton(trigger);
    const placeholder = trigger.shadowRoot?.querySelector<HTMLElement>('.placeholder');
    const icon = trigger.shadowRoot?.querySelector<HTMLElement>('.icon ui-icon');

    if (!placeholder || !icon) {
      throw new Error('プレースホルダーまたはアイコンが見つかりません');
    }

    if (button.type !== 'button') {
      throw new Error(`type="button" を期待しましたが "${button.type}" でした`);
    }

    if (button.getAttribute('aria-label') !== '検索ダイアログを開く') {
      throw new Error('既定のアクセシブル名が反映されていません');
    }

    if (button.getAttribute('aria-haspopup') !== 'dialog') {
      throw new Error('aria-haspopup="dialog" が必要です');
    }

    if (button.hasAttribute('aria-keyshortcuts')) {
      throw new Error('aria-keyshortcuts は既定契約に含めません');
    }

    if (button.dataset['density'] !== 'auto') {
      throw new Error('既定 density は auto である必要があります');
    }

    if (placeholder.textContent.trim() !== '検索...') {
      throw new Error('既定 placeholder が反映されていません');
    }

    if (icon.getAttribute('icon') !== 'search') {
      throw new Error('検索アイコンが必要です');
    }
  },
};

export const DensityModes: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 28rem;">
      <ui-search-trigger id="density-auto" density="auto"></ui-search-trigger>
      <ui-search-trigger id="density-default" density="default"></ui-search-trigger>
      <ui-search-trigger id="density-compact" density="compact"></ui-search-trigger>
      <ui-search-trigger id="density-icon-only" density="icon-only"></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const auto = requireTrigger(canvasElement, 'density-auto');
    const defaultDensity = requireTrigger(canvasElement, 'density-default');
    const compact = requireTrigger(canvasElement, 'density-compact');
    const iconOnly = requireTrigger(canvasElement, 'density-icon-only');

    await Promise.all([
      auto.updateComplete,
      defaultDensity.updateComplete,
      compact.updateComplete,
      iconOnly.updateComplete,
    ]);

    if (requireButton(auto).dataset['density'] !== 'auto') {
      throw new Error('auto density が反映されていません');
    }

    if (requireButton(defaultDensity).dataset['density'] !== 'default') {
      throw new Error('default density が反映されていません');
    }

    if (requireButton(compact).dataset['density'] !== 'compact') {
      throw new Error('compact density が反映されていません');
    }

    const iconOnlyButton = requireButton(iconOnly);
    const iconOnlyPlaceholder = iconOnly.shadowRoot?.querySelector<HTMLElement>('.placeholder');
    if (!iconOnlyPlaceholder) {
      throw new Error('icon-only 用 placeholder が見つかりません');
    }

    if (iconOnlyButton.dataset['density'] !== 'icon-only') {
      throw new Error('icon-only density が反映されていません');
    }

    if (getComputedStyle(iconOnlyPlaceholder).display !== 'none') {
      throw new Error('icon-only では placeholder は非表示である必要があります');
    }

    iconOnly.setAttribute('density', 'unexpected');
    await iconOnly.updateComplete;

    if (iconOnly.density !== 'auto') {
      throw new Error('不正 density は auto に正規化される必要があります');
    }
  },
};

export const AriaDelegation: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-search-trigger
      id="aria-trigger"
      aria-label="ノート内検索を開く"
      aria-controls="global-search-dialog"
      aria-expanded="true"
    ></ui-search-trigger>
  `,
  play: async ({ canvasElement }) => {
    const trigger = requireTrigger(canvasElement, 'aria-trigger');
    await trigger.updateComplete;

    const button = requireButton(trigger);
    if (button.getAttribute('aria-label') !== 'ノート内検索を開く') {
      throw new Error('aria-label の委譲に失敗しています');
    }

    if (button.getAttribute('aria-controls') !== 'global-search-dialog') {
      throw new Error('aria-controls の委譲に失敗しています');
    }

    if (button.getAttribute('aria-expanded') !== 'true') {
      throw new Error('aria-expanded の委譲に失敗しています');
    }
  },
};

export const EventContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html` <ui-search-trigger id="event-trigger"></ui-search-trigger> `,
  play: async ({ canvasElement }) => {
    const trigger = requireTrigger(canvasElement, 'event-trigger');
    await trigger.updateComplete;

    const button = requireButton(trigger);
    let clickEventCount = 0;

    const clickEventPromise = new Promise<CustomEvent>((resolve) => {
      trigger.addEventListener(
        'open-search-dialog',
        (event) => {
          clickEventCount += 1;
          resolve(event as CustomEvent);
        },
        { once: true },
      );
    });

    button.click();
    const clickEvent = await clickEventPromise;

    if (!clickEvent.bubbles || !clickEvent.composed || clickEvent.cancelable) {
      throw new Error('open-search-dialog のイベント設定が仕様と一致しません');
    }

    if (clickEventCount !== 1) {
      throw new Error('1 回の click につき 1 回だけ発火する必要があります');
    }

    let keyboardEventCount = 0;
    trigger.addEventListener('open-search-dialog', () => {
      keyboardEventCount += 1;
    });

    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    if (keyboardEventCount !== 2) {
      throw new Error('Enter と Space はそれぞれ 1 回ずつ発火する必要があります');
    }
  },
};

export const DisabledAndFormSafety: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <form
      id="search-trigger-form"
      @submit="${(event: SubmitEvent) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        form.dataset['submitted'] = 'true';
      }}"
    >
      <ui-search-trigger id="disabled-trigger" disabled></ui-search-trigger>
      <ui-search-trigger id="form-trigger"></ui-search-trigger>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector<HTMLFormElement>('#search-trigger-form');
    const disabledTrigger = requireTrigger(canvasElement, 'disabled-trigger');
    const formTrigger = requireTrigger(canvasElement, 'form-trigger');

    if (!form) {
      throw new Error('フォームが見つかりません');
    }

    await Promise.all([disabledTrigger.updateComplete, formTrigger.updateComplete]);

    let disabledEventCount = 0;
    disabledTrigger.addEventListener('open-search-dialog', () => {
      disabledEventCount += 1;
    });

    disabledTrigger.click();
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (disabledEventCount !== 0) {
      throw new Error('disabled 時にイベントは発火してはいけません');
    }

    requireButton(formTrigger).click();
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (form.dataset['submitted'] === 'true') {
      throw new Error('search-trigger は form submit の起点になってはいけません');
    }
  },
};

export const BoundaryConditions: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 22rem;">
      <ui-search-trigger id="empty-placeholder" placeholder=""></ui-search-trigger>
      <ui-search-trigger
        id="multiline-placeholder"
        placeholder=${'一行目\n二行目\n三行目'}
      ></ui-search-trigger>
      <ui-search-trigger
        id="long-placeholder"
        placeholder="これは非常に長いプレースホルダーテキストであり、表示幅を超えた場合でも 1 行のまま省略表示される必要があります"
      ></ui-search-trigger>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const empty = requireTrigger(canvasElement, 'empty-placeholder');
    const multiline = requireTrigger(canvasElement, 'multiline-placeholder');
    const longText = requireTrigger(canvasElement, 'long-placeholder');

    await Promise.all([empty.updateComplete, multiline.updateComplete, longText.updateComplete]);

    if (requireButton(empty).getAttribute('aria-label') !== '検索ダイアログを開く') {
      throw new Error('空 placeholder でもアクセシブル名は維持される必要があります');
    }

    const multilinePlaceholder = multiline.shadowRoot?.querySelector<HTMLElement>('.placeholder');
    const longPlaceholder = longText.shadowRoot?.querySelector<HTMLElement>('.placeholder');
    if (!multilinePlaceholder || !longPlaceholder) {
      throw new Error('placeholder 要素が見つかりません');
    }

    if (multilinePlaceholder.textContent.includes('\n')) {
      throw new Error('改行は 1 行表示へ正規化される必要があります');
    }

    const longStyle = getComputedStyle(longPlaceholder);
    if (longStyle.whiteSpace !== 'nowrap' || longStyle.textOverflow !== 'ellipsis') {
      throw new Error('長文 placeholder は 1 行省略表示である必要があります');
    }
  },
};

export const MobileAutoDensity: Story = {
  parameters: {
    rouaultContractKind: 'interaction-contract',
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => html`
    <ui-search-trigger id="mobile-auto-trigger" density="auto"></ui-search-trigger>
  `,
  play: async ({ canvasElement }) => {
    const trigger = requireTrigger(canvasElement, 'mobile-auto-trigger');
    await trigger.updateComplete;

    const placeholder = trigger.shadowRoot?.querySelector<HTMLElement>('.placeholder');
    if (!placeholder) {
      throw new Error('placeholder 要素が見つかりません');
    }

    if (!window.matchMedia('(max-width: 640px)').matches) {
      console.warn('mobile viewport が有効でないため、auto density の狭幅確認を省略します');
      return;
    }

    if (getComputedStyle(placeholder).display !== 'none') {
      throw new Error('狭幅の auto density では placeholder は非表示である必要があります');
    }
  },
};

export const ForcedColors: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html` <ui-search-trigger id="forced-colors-trigger"></ui-search-trigger> `,
  play: async ({ canvasElement }) => {
    const trigger = requireTrigger(canvasElement, 'forced-colors-trigger');
    await trigger.updateComplete;

    if (!window.matchMedia('(forced-colors: active)').matches) {
      console.warn('forced-colors が有効でないため、環境依存の確認を省略します');
      return;
    }

    const button = requireButton(trigger);
    const style = getComputedStyle(button);
    if (style.borderStyle === 'none') {
      throw new Error('forced-colors ではボーダーが視認可能である必要があります');
    }

    if (style.backgroundColor === 'rgba(0, 0, 0, 0)') {
      throw new Error('forced-colors では背景が透明であってはいけません');
    }
  },
};
