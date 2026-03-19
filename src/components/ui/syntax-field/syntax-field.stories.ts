import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './syntax-field';
import type { SyntaxField } from './syntax-field';

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const getField = (canvasElement: Element, id: string): SyntaxField => {
  const field = canvasElement.querySelector<SyntaxField>(`#${id}`);
  if (!field) {
    throw new Error(`ui-syntax-field#${id} が見つかりません`);
  }
  return field;
};

const getRequiredBadge = (field: SyntaxField): HTMLElement | null =>
  field.querySelector<HTMLElement>('.field-required');

const getTypeLabel = (field: SyntaxField): HTMLElement | null =>
  field.querySelector<HTMLElement>('.field-type');

const getDefaultLabel = (field: SyntaxField): HTMLElement | null =>
  field.querySelector<HTMLElement>('.field-default');

const getWrapper = (field: SyntaxField): HTMLElement => {
  const wrapper = field.querySelector<HTMLElement>('.field-wrapper');
  if (!wrapper) throw new Error('.field-wrapper が見つかりません');
  return wrapper;
};

const getTerm = (field: SyntaxField): HTMLElement => {
  const term = field.querySelector<HTMLElement>('dt.field-term');
  if (!term) throw new Error('dt.field-term が見つかりません');
  return term;
};

const getDescription = (field: SyntaxField): HTMLElement => {
  const description = field.querySelector<HTMLElement>('dd.field-description');
  if (!description) throw new Error('dd.field-description が見つかりません');
  return description;
};

const getDocumentStyleText = (): string => {
  const style = document.querySelector<HTMLStyleElement>('#ui-syntax-field-document-styles');
  if (!style) {
    throw new Error('#ui-syntax-field-document-styles が見つかりません');
  }
  return style.textContent;
};

const assertNoAriaRequired = (field: SyntaxField): void => {
  if (field.hasAttribute('aria-required')) {
    throw new Error(
      'required 表現は aria-required ではなく .field-required[aria-label="必須"] を使用する必要があります',
    );
  }
};

const meta: Meta<SyntaxField> = {
  title: 'Components/Syntax Field',
  component: 'ui-syntax-field',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
構文フィールドコンポーネントです。親の <dl> と組み合わせて Name / Required / Type / Default / Description を一貫フォーマットで表示します。

## このストーリーで検証する観点
- バリアント × 状態の意味のある組み合わせ（必須 + 型 + 既定値 / 任意 / 混在）
- 事故が多い境界条件（空白属性値、aria-required 誤用、スタイル重複注入）
- Light DOM 契約（shadowRoot なし、<dt>/<dd> ペア構造）
- レスポンシブ・媒体契約（768px境界、forced-colors/print/reduced-motion）
- ダークモード契約（セマンティックトークン参照）
        `,
      },
    },
  },
  argTypes: {
    name: {
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: 'フィールド名（必須）',
    },
    fieldType: {
      name: 'type',
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '型定義（空文字・空白のみは非表示）',
    },
    required: {
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
      description: '必須表示フラグ。表示文言と aria-label は常に「必須」',
    },
    defaultValue: {
      name: 'default',
      control: 'text',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
      description: '既定値（空文字・空白のみは非表示）',
    },
  },
};

export default meta;
type Story = StoryObj<SyntaxField>;

/**
 * 代表ケース: 必須 + 型 + 既定値 + 説明。
 * 表示順序と A11y 契約を検証します。
 */
export const RequiredWithTypeAndDefault: Story = {
  render: () => html`
    <dl class="syntax-fields">
      <ui-syntax-field id="required-field" name="props" type="object" required default="{}">
        コンポーネントに渡すプロパティオブジェクト。
      </ui-syntax-field>
    </dl>
  `,
  play: async ({ canvasElement }) => {
    const field = getField(canvasElement, 'required-field');
    await field.updateComplete;
    await waitFrame();

    assertNoAriaRequired(field);

    const wrapper = getWrapper(field);
    if (wrapper.children.length !== 2) {
      throw new Error('field-wrapper は dt + dd の2要素を直接子として持つ必要があります');
    }

    const term = getTerm(field);
    const children = Array.from(term.children) as HTMLElement[];
    const expectedOrder = ['field-name', 'field-required', 'field-type', 'field-default'];

    expectedOrder.forEach((className, index) => {
      if (!children[index]?.classList.contains(className)) {
        throw new Error(
          `field-term の要素順序が不正です。expected=${className} index=${String(index)}`,
        );
      }
    });

    const requiredBadge = getRequiredBadge(field);
    if (!requiredBadge) throw new Error('required=true のため .field-required が必要です');
    if (normalizeText(requiredBadge.textContent) !== '必須') {
      throw new Error('required バッジの表示文言は「必須」固定です');
    }
    if (requiredBadge.getAttribute('aria-label') !== '必須') {
      throw new Error('.field-required の aria-label は「必須」である必要があります');
    }

    const typeLabel = getTypeLabel(field);
    if (!typeLabel || normalizeText(typeLabel.textContent) !== 'object') {
      throw new Error('type ラベルが正しく描画されていません');
    }

    const defaultLabel = getDefaultLabel(field);
    if (!defaultLabel || normalizeText(defaultLabel.textContent) !== 'default: {}') {
      throw new Error('default ラベルは「default: {value}」形式で描画される必要があります');
    }

    const description = getDescription(field);
    if (
      !normalizeText(description.textContent).includes(
        'コンポーネントに渡すプロパティオブジェクト。',
      )
    ) {
      throw new Error('説明文が dd 内に描画されていません');
    }
  },
};

/**
 * 任意ケース: name + description の最小構成。
 * 任意項目が不要な場合に余計なメタ情報を表示しないことを検証します。
 */
export const OptionalMinimalField: Story = {
  render: () => html`
    <dl class="syntax-fields">
      <ui-syntax-field id="optional-field" name="bio">
        ユーザーの自己紹介テキスト。
      </ui-syntax-field>
    </dl>
  `,
  play: async ({ canvasElement }) => {
    const field = getField(canvasElement, 'optional-field');
    await field.updateComplete;
    await waitFrame();

    assertNoAriaRequired(field);

    if (getRequiredBadge(field)) {
      throw new Error('required=false のため .field-required は表示されてはいけません');
    }
    if (getTypeLabel(field)) {
      throw new Error('type 未指定のため .field-type は表示されてはいけません');
    }
    if (getDefaultLabel(field)) {
      throw new Error('default 未指定のため .field-default は表示されてはいけません');
    }

    const name = field.querySelector<HTMLElement>('.field-name');
    if (!name || normalizeText(name.textContent) !== 'bio') {
      throw new Error('field-name が正しく描画されていません');
    }
  },
};

/**
 * 境界条件: 空白値の属性は非表示として扱う。
 * 属性入力事故（空白文字だけが渡される）で UI が汚れないことを検証します。
 */
export const WhitespaceBoundary: Story = {
  render: () => html`
    <dl class="syntax-fields">
      <ui-syntax-field id="whitespace-field" name="  user_id  " type="    " default="   " required>
        <strong>識別子</strong> を保持する。
      </ui-syntax-field>
    </dl>
  `,
  play: async ({ canvasElement }) => {
    const field = getField(canvasElement, 'whitespace-field');
    await field.updateComplete;
    await waitFrame();

    const name = field.querySelector<HTMLElement>('.field-name');
    if (!name || normalizeText(name.textContent) !== 'user_id') {
      throw new Error('name は trim 済みテキストで表示される必要があります');
    }

    if (getTypeLabel(field)) {
      throw new Error('type が空白のみの場合は .field-type を描画してはいけません');
    }
    if (getDefaultLabel(field)) {
      throw new Error('default が空白のみの場合は .field-default を描画してはいけません');
    }

    const requiredBadge = getRequiredBadge(field);
    if (requiredBadge?.getAttribute('aria-label') !== '必須') {
      throw new Error('required=true では .field-required[aria-label="必須"] が必要です');
    }

    const description = getDescription(field);
    if (!description.querySelector('strong')) {
      throw new Error('説明文のインラインHTML（<strong>）が保持されていません');
    }
  },
};

/**
 * 意味のある組み合わせ: 必須/任意/既定値のみ/型のみを同時表示。
 * dl 内の複数要素で構造が崩れないことを検証します。
 */
export const MixedVariantsInDescriptionList: Story = {
  render: () => html`
    <dl id="mixed-list" class="syntax-fields">
      <ui-syntax-field id="mixed-required" name="id" type="number" required>
        一意な識別子。
      </ui-syntax-field>

      <ui-syntax-field id="mixed-default-only" name="nickname" default="anonymous">
        未入力時の表示名。
      </ui-syntax-field>

      <ui-syntax-field id="mixed-type-only" name="email" type="string">
        連絡先メールアドレス。
      </ui-syntax-field>
    </dl>
  `,
  play: async ({ canvasElement }) => {
    const requiredField = getField(canvasElement, 'mixed-required');
    const defaultOnlyField = getField(canvasElement, 'mixed-default-only');
    const typeOnlyField = getField(canvasElement, 'mixed-type-only');

    await Promise.all([
      requiredField.updateComplete,
      defaultOnlyField.updateComplete,
      typeOnlyField.updateComplete,
    ]);
    await waitFrame();

    const wrappers = canvasElement.querySelectorAll(
      '#mixed-list > ui-syntax-field > .field-wrapper',
    );
    if (wrappers.length !== 3) {
      throw new Error('3件の ui-syntax-field それぞれが .field-wrapper を描画する必要があります');
    }

    [requiredField, defaultOnlyField, typeOnlyField].forEach((field) => {
      assertNoAriaRequired(field);
      if (!field.querySelector('dt.field-term') || !field.querySelector('dd.field-description')) {
        throw new Error('各項目は dt / dd のペアを持つ必要があります');
      }
    });

    const defaultLabel = getDefaultLabel(defaultOnlyField);
    if (!defaultLabel) {
      throw new Error('default-only 項目は .field-default を描画する必要があります');
    }
    if (defaultLabel.classList.contains('field-default-with-type')) {
      throw new Error(
        'type が無い項目の default には type 後スペース用クラスを付与してはいけません',
      );
    }

    if (getDefaultLabel(typeOnlyField)) {
      throw new Error('type-only 項目で .field-default を描画してはいけません');
    }
  },
};

/**
 * 事故が多い境界: スタイル注入の重複防止と Light DOM 契約。
 * 複数インスタンスでも document style は1回だけ注入されることを検証します。
 */
export const LightDomAndStyleInjectionContract: Story = {
  render: () => html`
    <dl class="syntax-fields">
      <ui-syntax-field id="contract-a" name="first" type="string">最初の項目。</ui-syntax-field>
      <ui-syntax-field id="contract-b" name="second" type="number">2番目の項目。</ui-syntax-field>
    </dl>
  `,
  play: async ({ canvasElement }) => {
    const fieldA = getField(canvasElement, 'contract-a');
    const fieldB = getField(canvasElement, 'contract-b');

    await Promise.all([fieldA.updateComplete, fieldB.updateComplete]);
    await waitFrame();

    if (fieldA.shadowRoot !== null || fieldB.shadowRoot !== null) {
      throw new Error('ui-syntax-field は Light DOM で動作し、shadowRoot を持たない必要があります');
    }

    const styleTags = document.querySelectorAll('#ui-syntax-field-document-styles');
    if (styleTags.length !== 1) {
      throw new Error(`ドキュメントスタイルは重複注入不可です。actual=${String(styleTags.length)}`);
    }

    const styleText = getDocumentStyleText();
    const requiredSnippets = [
      '@media (forced-colors: active)',
      '@media print',
      'ui-syntax-field .field-wrapper:hover',
      'color: CanvasText;',
      'background-color: transparent !important;',
    ];

    requiredSnippets.forEach((snippet) => {
      if (!styleText.includes(snippet)) {
        throw new Error(`注入スタイルに必要ルールがありません: ${snippet}`);
      }
    });

    if (!fieldA.querySelector('.field-wrapper') || !fieldB.querySelector('.field-wrapper')) {
      throw new Error('Light DOM 上に .field-wrapper が描画されていません');
    }
  },
};

/**
 * 媒体・レスポンシブ契約:
 * 768px境界、forced-colors、print、reduced-motion の必須ルールを保持していること。
 */
export const ResponsiveAndMediaContracts: Story = {
  render: () => html`
    <dl class="syntax-fields">
      <ui-syntax-field id="media-contract" name="age" type="number" default="0">
        年齢を表す数値。
      </ui-syntax-field>
    </dl>
  `,
  play: async ({ canvasElement }) => {
    const field = getField(canvasElement, 'media-contract');
    await field.updateComplete;
    await waitFrame();

    const styleText = getDocumentStyleText();
    const requiredSnippets = [
      'ui-syntax-field {',
      'display: contents;',
      '@media (min-width: 768px)',
      'grid-template-columns: minmax(min-content, 30%) 1fr;',
      '@media (hover: hover)',
      '@media (prefers-reduced-motion: reduce)',
      'ui-syntax-field .field-wrapper:hover {',
      'transition-duration: 0.01ms;',
      '@media (forced-colors: active)',
      'outline: var(--border-width, 1px) solid CanvasText;',
      '.field-type,',
      '.field-default {',
      'color: CanvasText;',
      '@media print',
      'background-color: transparent !important;',
      'page-break-inside: avoid;',
    ];

    requiredSnippets.forEach((snippet) => {
      if (!styleText.includes(snippet)) {
        throw new Error(`媒体/レスポンシブ契約の定義が不足しています: ${snippet}`);
      }
    });
  },
};

/**
 * ダークモード契約:
 * 色指定がセマンティックトークン参照で定義され、モード分岐を局所実装しないこと。
 */
export const DarkModeTokenContract: Story = {
  render: () => html`
    <dl class="syntax-fields">
      <ui-syntax-field id="dark-contract" name="theme" type="string" default="system">
        テーマ設定。
      </ui-syntax-field>
    </dl>
  `,
  play: async ({ canvasElement }) => {
    const field = getField(canvasElement, 'dark-contract');
    await field.updateComplete;
    await waitFrame();

    const styleText = getDocumentStyleText();
    const requiredTokenRefs = [
      'var(--fg-default',
      'var(--fg-muted',
      'var(--fg-warning',
      'var(--bg-hover',
      'var(--radius-md',
    ];

    requiredTokenRefs.forEach((tokenRef) => {
      if (!styleText.includes(tokenRef)) {
        throw new Error(`ダークモード契約のトークン参照が不足しています: ${tokenRef}`);
      }
    });
  },
};

/**
 * 境界条件:
 * 初回レンダリング後に説明文ノードが追加されても dd に追従表示されること。
 */
export const DynamicDescriptionUpdate: Story = {
  render: () => html`
    <dl class="syntax-fields">
      <ui-syntax-field id="dynamic-description" name="profile"> 初期説明文。 </ui-syntax-field>
    </dl>
  `,
  play: async ({ canvasElement }) => {
    const field = getField(canvasElement, 'dynamic-description');
    await field.updateComplete;
    await waitFrame();

    const additional = document.createElement('span');
    additional.textContent = ' 追加説明。';
    field.append(additional);

    await field.updateComplete;
    await waitFrame();

    const description = getDescription(field);
    const text = normalizeText(description.textContent);
    if (!text.includes('初期説明文。') || !text.includes('追加説明。')) {
      throw new Error('初回描画後に追加された説明文ノードが dd に反映されていません');
    }
  },
};
