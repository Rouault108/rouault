import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './footnote';
import type { Footnote } from './footnote';
import { DOCUMENT_STYLE_ID as FOOTNOTE_STYLE_ID } from './footnote';
import { DOCUMENT_STYLE_ID as POPOVER_STYLE_ID } from '../popover/popover';
import type { UiPopover } from '../popover/popover';

const meta: Meta<Footnote> = {
  title: 'Components/Footnote',
  component: 'ui-footnote',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
脚注参照のためのコンポーネントです。

- Trigger は常に \`<a href="#{refId}">\` を維持します
- 識別子は \`refId\` を主軸に \`{refId}-ref-{refInstance}\` で安定化します
- \`shared\` は secondary reference を表す暫定入力で、Popover 本体は primary reference だけが持ちます
- 解決は document 全体ではなく footnote scope 単位で行います
- endnotes は Hydration 後も常時可視です
        `,
      },
    },
  },
  argTypes: {
    refId: {
      control: 'text',
      name: 'ref-id',
      description: '論理脚注の安定識別子',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    index: {
      control: { type: 'number', min: 1, step: 1 },
      description: '表示番号（識別子ではない）',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '1' },
      },
    },
    refInstance: {
      control: { type: 'number', min: 1, step: 1 },
      name: 'ref-instance',
      description: '同一脚注内での参照位置番号',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '1' },
      },
    },
    shared: {
      control: 'boolean',
      description: 'secondary reference を表す暫定フラグ',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<Footnote>;

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const nextFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const getFootnote = (canvasElement: Element, id: string): Footnote => {
  const host = canvasElement.querySelector<Footnote>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getTrigger = (host: Footnote): HTMLAnchorElement => {
  const trigger = host.querySelector<HTMLAnchorElement>('[data-part="trigger"]');
  if (!trigger) throw new Error('trigger が見つかりません');
  return trigger;
};

const getPopover = (host: Footnote): HTMLElement => {
  const popover = host.querySelector<HTMLElement>('[data-part="content"]');
  if (!popover) throw new Error('popover が見つかりません');
  return popover;
};

const getPopoverHost = (host: Footnote): UiPopover => {
  const popoverHost = host.querySelector<UiPopover>('ui-popover[data-part="popover-host"]');
  if (!popoverHost) throw new Error('ui-popover[data-part="popover-host"] が見つかりません');
  return popoverHost;
};

const supportsPopoverApi = (): boolean =>
  typeof HTMLElement !== 'undefined' &&
  'showPopover' in HTMLElement.prototype &&
  'hidePopover' in HTMLElement.prototype;

const isPopoverOpen = (element: Element): boolean => {
  try {
    return element.matches(':popover-open');
  } catch {
    return false;
  }
};

const waitForEvent = (target: EventTarget, type: string): Promise<Event> =>
  new Promise((resolve) => {
    target.addEventListener(
      type,
      (event) => {
        resolve(event);
      },
      { once: true },
    );
  });

const dispatchPrimaryClick = (element: HTMLElement): MouseEvent => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
  });
  element.dispatchEvent(event);
  return event;
};

interface ObservedClickResult {
  defaultPreventedBeforeObserver: boolean;
  event: MouseEvent;
}

const dispatchObservedClick = (
  element: HTMLElement,
  init: Omit<MouseEventInit, 'bubbles' | 'cancelable' | 'composed'>,
): ObservedClickResult => {
  const root = element.getRootNode();
  const observerTarget = root instanceof Document || root instanceof ShadowRoot ? root : document;
  let defaultPreventedBeforeObserver = false;
  const observer = (event: Event): void => {
    if (event.target !== element) return;
    defaultPreventedBeforeObserver = event.defaultPrevented;
    if (!event.defaultPrevented) {
      event.preventDefault();
    }
  };

  observerTarget.addEventListener('click', observer);
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  });
  element.dispatchEvent(event);
  observerTarget.removeEventListener('click', observer);
  return { event, defaultPreventedBeforeObserver };
};

const dispatchKeyboard = (
  target: HTMLElement,
  key: string,
  init?: Omit<KeyboardEventInit, 'key'>,
): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

const captureWarnings = async (task: () => Promise<void> | void): Promise<string[]> => {
  const originalWarn = console.warn;
  const messages: string[] = [];
  console.warn = (...args: unknown[]) => {
    messages.push(args.map((arg) => (typeof arg === 'string' ? arg : String(arg))).join(' '));
  };

  try {
    await task();
    await nextFrame();
  } finally {
    console.warn = originalWarn;
  }

  return messages;
};

/**
 * 基本整合:
 * - Trigger / Popover / Footer Link / endnotes
 * - refId 主軸の ID 契約
 */
export const Default: Story = {
  render: () => html`
    <article data-footnote-scope>
      <p>
        読書体験は本文の信号比で決まる
        <ui-footnote id="default-footnote" ref-id="fn-1" index="1" ref-instance="1">
          <span>補足: 本文に集中できる設計は、補助情報へのアクセス経路を明確に定義する。</span>
        </ui-footnote>
      </p>

      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-1">
            補足: 本文に集中できる設計は、補助情報へのアクセス経路を明確に定義する。
            <a href="#fn-1-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
  play: async ({ canvasElement }) => {
    const host = getFootnote(canvasElement, 'default-footnote');
    await host.updateComplete;

    const trigger = getTrigger(host);
    if (trigger.getAttribute('href') !== '#fn-1') {
      throw new Error('trigger の href が #fn-1 ではありません');
    }
    if (trigger.id !== 'fn-1-ref-1') {
      throw new Error(`trigger id は fn-1-ref-1 を想定しています: ${trigger.id}`);
    }
    if (trigger.getAttribute('role') !== 'doc-noteref') {
      throw new Error('trigger の role は doc-noteref である必要があります');
    }
    if (trigger.getAttribute('aria-controls') !== 'fn-1-popover') {
      throw new Error('trigger の aria-controls が不正です');
    }
    if (normalizeText(trigger.textContent) !== '[1]') {
      throw new Error(`trigger 表示は [1] のはずですが "${normalizeText(trigger.textContent)}" です`);
    }

    const popoverHost = getPopoverHost(host);
    const popover = getPopover(host);
    if (popoverHost.id !== 'fn-1-popover-host') {
      throw new Error(`popover host id が不正です: ${popoverHost.id}`);
    }
    if (popover.id !== 'fn-1-popover') {
      throw new Error(`popover id が不正です: ${popover.id}`);
    }
    if (popover.getAttribute('role') !== 'note') {
      throw new Error('popover の role は note である必要があります');
    }
    if (popover.getAttribute('aria-labelledby') !== 'fn-1-label') {
      throw new Error('popover の aria-labelledby が不正です');
    }

    const footerLink = popover.querySelector<HTMLAnchorElement>('.footnote-list-link');
    if (!footerLink) throw new Error('.footnote-list-link が見つかりません');
    if (footerLink.getAttribute('href') !== '#fn-1') {
      throw new Error('footer link は #fn-1 を指す必要があります');
    }

    const backlink = canvasElement.querySelector<HTMLAnchorElement>(
      'section.footnotes a[data-footnote-backref]',
    );
    if (!backlink) throw new Error('data-footnote-backref が見つかりません');
    if (backlink.getAttribute('href') !== '#fn-1-ref-1') {
      throw new Error('backlink が trigger ID を指していません');
    }
  },
};

/**
 * 役割分担と scope:
 * - owner / secondary reference
 * - scope 内での Popover 一意性
 * - 同じ refId を別 scope で再利用できること
 */
export const VariantStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
      }
      .label {
        font-size: 11px;
        color: var(--fg-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    </style>

    <div class="matrix">
      <article data-footnote-scope>
        <div class="label">scope a</div>
        <p>
          最初の参照
          <ui-footnote id="matrix-owner-a" ref-id="fn-11" index="11" ref-instance="1">
            <span>共有本文は primary reference が 1 つだけ保持する。</span>
          </ui-footnote>
          追従参照
          <ui-footnote
            id="matrix-follower-a"
            ref-id="fn-11"
            index="11"
            ref-instance="2"
            shared
          ></ui-footnote>
        </p>
        <section class="footnotes" role="doc-endnotes">
          <h2 class="sr-only">脚注</h2>
          <ol>
            <li id="fn-11">
              共有本文は primary reference が 1 つだけ保持する。
              <a href="#fn-11-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
              <a href="#fn-11-ref-2" data-footnote-backref role="doc-backlink">↩︎2</a>
            </li>
          </ol>
        </section>
      </article>

      <article data-footnote-scope>
        <div class="label">scope b</div>
        <p>
          別スコープの同一 refId
          <ui-footnote id="matrix-owner-b" ref-id="fn-11" index="11" ref-instance="1">
            <span>scope が異なれば同じ refId でも独立して解決される。</span>
          </ui-footnote>
        </p>
        <section class="footnotes" role="doc-endnotes">
          <h2 class="sr-only">脚注</h2>
          <ol>
            <li id="fn-11">
              scope が異なれば同じ refId でも独立して解決される。
              <a href="#fn-11-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
            </li>
          </ol>
        </section>
      </article>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ownerA = getFootnote(canvasElement, 'matrix-owner-a');
    const followerA = getFootnote(canvasElement, 'matrix-follower-a');
    const ownerB = getFootnote(canvasElement, 'matrix-owner-b');
    await Promise.all([ownerA.updateComplete, followerA.updateComplete, ownerB.updateComplete]);

    const ownerATrigger = getTrigger(ownerA);
    const followerATrigger = getTrigger(followerA);
    const ownerBTrigger = getTrigger(ownerB);

    if (ownerATrigger.id !== 'fn-11-ref-1') {
      throw new Error(`owner A trigger id が不正です: ${ownerATrigger.id}`);
    }
    if (followerATrigger.id !== 'fn-11-ref-2') {
      throw new Error(`follower trigger id が不正です: ${followerATrigger.id}`);
    }
    if (ownerBTrigger.id !== 'fn-11-ref-1') {
      throw new Error(`scope B の trigger id が不正です: ${ownerBTrigger.id}`);
    }

    if (followerA.querySelector('ui-popover')) {
      throw new Error('secondary reference は自前の Popover を持ってはいけません');
    }

    if (!supportsPopoverApi()) {
      return;
    }

    const popoverHostA = getPopoverHost(ownerA);
    const opened = waitForEvent(popoverHostA, 'ui-popover-opened');
    const clickEvent = dispatchPrimaryClick(followerATrigger);
    if (!clickEvent.defaultPrevented) {
      throw new Error('secondary reference の通常クリックは Popover を開くために preventDefault される必要があります');
    }
    await opened;

    if (ownerATrigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('owner trigger は active trigger でないとき aria-expanded=false のままである必要があります');
    }
    if (followerATrigger.getAttribute('aria-expanded') !== 'true') {
      throw new Error('secondary trigger が active trigger として aria-expanded=true になっていません');
    }

    const popoverA = getPopover(ownerA);
    if (!isPopoverOpen(popoverA)) {
      throw new Error('scope A の Popover が開いていません');
    }

    const popoverB = getPopover(ownerB);
    if (isPopoverOpen(popoverB)) {
      throw new Error('別 scope の Popover が誤って開いています');
    }
  },
};

/**
 * デュアルアクセス:
 * - 通常クリックは Popover 補助表示
 * - 修飾キー付きクリックと中クリックはネイティブリンク維持
 */
export const DualAccessContract: Story = {
  render: () => html`
    <article data-footnote-scope>
      <p>
        デュアルアクセス
        <ui-footnote id="access-footnote" ref-id="fn-20" index="20" ref-instance="1">
          <span>Popover は補助経路であり、脚注一覧は正規経路である。</span>
        </ui-footnote>
      </p>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-20">
            Popover は補助経路であり、脚注一覧は正規経路である。
            <a href="#fn-20-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
  play: async ({ canvasElement }) => {
    const host = getFootnote(canvasElement, 'access-footnote');
    await host.updateComplete;
    const trigger = getTrigger(host);
    const popover = getPopover(host);
    const popoverHost = getPopoverHost(host);

    const modifiedCases: MouseEventInit[] = [
      { metaKey: true, button: 0 },
      { ctrlKey: true, button: 0 },
      { shiftKey: true, button: 0 },
      { button: 1 },
    ];

    for (const init of modifiedCases) {
      const { defaultPreventedBeforeObserver } = dispatchObservedClick(trigger, init);
      if (defaultPreventedBeforeObserver) {
        throw new Error('修飾キー付きクリックまたは中クリックでネイティブリンクが阻害されています');
      }
    }

    if (!supportsPopoverApi()) {
      return;
    }

    const opened = waitForEvent(popoverHost, 'ui-popover-opened');
    const event = dispatchPrimaryClick(trigger);
    if (!event.defaultPrevented) {
      throw new Error('通常クリックは Popover を開くために preventDefault される必要があります');
    }
    await opened;

    if (!isPopoverOpen(popover)) {
      throw new Error('通常クリック後に Popover が開いていません');
    }
  },
};

/**
 * キーボードとフォーカス:
 * - 開いた後の Escape / Tab 契約
 * - Escape で閉じて trigger に戻る
 * - footer link の Tab で閉じる
 */
export const KeyboardAndFocusContract: Story = {
  render: () => html`
    <article data-footnote-scope>
      <p>
        キーボード契約
        <ui-footnote id="keyboard-footnote" ref-id="fn-40" index="40" ref-instance="1">
          <span>読書フローの継続を妨げないキーボード契約。</span>
        </ui-footnote>
        <a href="#after-footnote" id="after-footnote">次のリンク</a>
      </p>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-40">
            読書フローの継続を妨げないキーボード契約。
            <a href="#fn-40-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
  play: async ({ canvasElement }) => {
    const host = getFootnote(canvasElement, 'keyboard-footnote');
    await host.updateComplete;

    if (!supportsPopoverApi()) {
      return;
    }

    const trigger = getTrigger(host);
    const popover = getPopover(host);
    const popoverHost = getPopoverHost(host);

    trigger.focus();
    const opened = waitForEvent(popoverHost, 'ui-popover-opened');
    dispatchPrimaryClick(trigger);
    await opened;

    if (!isPopoverOpen(popover)) {
      throw new Error('Enter で Popover が開いていません');
    }

    const closedByEscape = waitForEvent(popoverHost, 'ui-popover-closed');
    dispatchKeyboard(popover, 'Escape');
    await closedByEscape;
    await nextFrame();
    if (document.activeElement !== trigger) {
      throw new Error('Escape 後は trigger にフォーカスが戻る必要があります');
    }

    const reopened = waitForEvent(popoverHost, 'ui-popover-opened');
    dispatchPrimaryClick(trigger);
    await reopened;

    const footerLink = popover.querySelector<HTMLAnchorElement>('.footnote-list-link');
    if (!footerLink) throw new Error('.footnote-list-link が見つかりません');
    footerLink.focus();
    dispatchKeyboard(footerLink, 'Tab');
    await nextFrame();
    if (isPopoverOpen(popover)) {
      throw new Error('footer link 上の Tab で Popover が閉じていません');
    }
  },
};

/**
 * SSR / Hydration:
 * - 内部予約構造の再接続
 * - 本文混入防止
 * - 再描画後も本文が保持されること
 */
export const SsrHydrationContract: Story = {
  render: () => {
    const article = document.createElement('article');
    article.setAttribute('data-footnote-scope', '');

    const paragraph = document.createElement('p');
    paragraph.append('SSR 再接続 ');

    const footnote = document.createElement('ui-footnote');
    footnote.id = 'ssr-footnote';
    footnote.setAttribute('ref-id', 'fn-60');
    footnote.setAttribute('index', '60');
    footnote.setAttribute('ref-instance', '1');

    const bodyParagraph = document.createElement('p');
    bodyParagraph.textContent = 'SSR で埋め込まれた脚注本文。';
    footnote.append(bodyParagraph);
    const captureInitialContent = Reflect.get(footnote, '_captureInitialContentNodes') as
      | (() => void)
      | undefined;
    if (typeof captureInitialContent === 'function') {
      captureInitialContent.call(footnote);
    }
    paragraph.append(footnote);
    article.append(paragraph);

    const endnotes = document.createElement('section');
    endnotes.className = 'footnotes';
    endnotes.setAttribute('role', 'doc-endnotes');
    endnotes.innerHTML = `
      <h2 class="sr-only">脚注</h2>
      <ol>
        <li id="fn-60">
          SSR で埋め込まれた脚注本文。
          <a href="#fn-60-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
        </li>
      </ol>
    `;
    article.append(endnotes);
    return article;
  },
  play: async ({ canvasElement }) => {
    const host = getFootnote(canvasElement, 'ssr-footnote');
    await host.updateComplete;

    const popover = getPopover(host);
    const body = popover.querySelector<HTMLElement>('.footnote-body');
    if (!body) throw new Error('.footnote-body が見つかりません');
    if (!normalizeText(body.textContent).includes('SSR で埋め込まれた脚注本文。')) {
      throw new Error('SSR 由来の本文が footnote-body に再接続されていません');
    }
    if (body.querySelector('[data-part="trigger"], [data-part="content"], [data-part="popover-host"]')) {
      throw new Error('内部制御要素が本文に混入しています');
    }
    if (body.querySelector('.footnote-list-link, .footnote-popover-footer')) {
      throw new Error('footer 要素が本文に混入しています');
    }
    if (host.querySelectorAll('.footnote-list-link').length !== 1) {
      throw new Error('footer link が重複描画されています');
    }

    host.index = 61;
    await host.updateComplete;

    const trigger = getTrigger(host);
    const rerenderedBody = getPopover(host).querySelector<HTMLElement>('.footnote-body');
    if (!rerenderedBody) throw new Error('再描画後の .footnote-body が見つかりません');
    if (!normalizeText(rerenderedBody.textContent).includes('SSR で埋め込まれた脚注本文。')) {
      throw new Error('再描画後に SSR 本文が失われています');
    }
    if (normalizeText(trigger.textContent) !== '[61]') {
      throw new Error('再描画後に trigger 表示が更新されていません');
    }
  },
};

/**
 * 境界条件:
 * - 開発時診断
 * - 長文スクロール
 * - interactive ancestor 禁止
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <article data-footnote-scope>
        <p style="font-size: 11px;">
          親 11px
          <ui-footnote id="boundary-small" ref-id="fn-31" index="31" ref-instance="1">
            <span>small text 本文。</span>
          </ui-footnote>
        </p>

        <p>
          長文
          <ui-footnote id="boundary-long" ref-id="fn-32" index="32" ref-instance="1">
            <span>
              長文脚注: 表示領域の上限を超えると内部スクロールで読む。長文脚注:
              表示領域の上限を超えると内部スクロールで読む。長文脚注:
              表示領域の上限を超えると内部スクロールで読む。長文脚注:
              表示領域の上限を超えると内部スクロールで読む。長文脚注:
              表示領域の上限を超えると内部スクロールで読む。長文脚注:
              表示領域の上限を超えると内部スクロールで読む。
            </span>
          </ui-footnote>
        </p>

        <p>
          診断用
          <ui-footnote id="boundary-invalid" ref-id="fn-33" index="33" ref-instance="1">
            <span>invalid 本文。</span>
          </ui-footnote>
        </p>

        <section class="footnotes" role="doc-endnotes">
          <h2 class="sr-only">脚注</h2>
          <ol>
            <li id="fn-31">small text 本文。 <a href="#fn-31-ref-1" data-footnote-backref>↩︎</a></li>
            <li id="fn-32">長文本文。 <a href="#fn-32-ref-1" data-footnote-backref>↩︎</a></li>
            <li id="fn-33">invalid 本文。 <a href="#fn-33-ref-1" data-footnote-backref>↩︎</a></li>
          </ol>
        </section>
      </article>

      <article data-footnote-scope id="boundary-empty-scope"></article>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const small = getFootnote(canvasElement, 'boundary-small');
    const long = getFootnote(canvasElement, 'boundary-long');
    const invalid = getFootnote(canvasElement, 'boundary-invalid');
    await Promise.all([small.updateComplete, long.updateComplete, invalid.updateComplete]);

    const smallTrigger = getTrigger(small);
    const smallFontSize = Number.parseFloat(getComputedStyle(smallTrigger).fontSize);
    if (Number.isNaN(smallFontSize) || smallFontSize < 12) {
      throw new Error(`small text 下限契約違反: ${String(smallFontSize)}px`);
    }

    const longPopover = getPopover(long);
    const longPopoverHost = getPopoverHost(long);
    const longStyle = getComputedStyle(longPopover);
    if (longStyle.overflowY !== 'auto') {
      throw new Error(`長文脚注の overflow-y は auto である必要があります: ${longStyle.overflowY}`);
    }
    if (longStyle.maxHeight === 'none') {
      throw new Error('長文脚注の max-height が無制限になっています');
    }
    const longMaxHeightToken = getComputedStyle(longPopoverHost)
      .getPropertyValue('--ui-popover-max-height')
      .trim();
    if (longMaxHeightToken === '') {
      throw new Error('長文脚注の Popover max-height トークンが設定されていません');
    }

    const warnings = await captureWarnings(async () => {
      invalid.refId = '';
      invalid.index = 0;
      invalid.refInstance = 0;
      invalid.shared = true;
      await invalid.updateComplete;

      const emptyScope = canvasElement.querySelector<HTMLElement>('#boundary-empty-scope');
      if (!emptyScope) throw new Error('#boundary-empty-scope が見つかりません');
      const link = document.createElement('a');
      emptyScope.append(link);
      link.append(invalid);
      invalid.index = 2;
      await invalid.updateComplete;
    });

    const requiredSnippets = [
      'refId は必須です',
      'index は正の整数',
      'refInstance は正の整数',
      'secondary reference は本文入力を持てません',
      'interactive ancestor',
    ];

    for (const snippet of requiredSnippets) {
      if (!warnings.some((message) => message.includes(snippet))) {
        throw new Error(`期待した診断が出ていません: ${snippet}`);
      }
    }
  },
};

/**
 * 視覚モード契約:
 * - Reduced Motion / Forced Colors / Print
 * - トークン参照
 * - endnotes 非表示禁止
 */
export const VisualModeContracts: Story = {
  render: () => html`
    <article data-footnote-scope>
      <p>
        表示モード検証
        <ui-footnote id="visual-footnote" ref-id="fn-50" index="50" ref-instance="1">
          <span>表示モード契約の検証用本文。</span>
        </ui-footnote>
      </p>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-50">
            表示モード契約の検証用本文。
            <a href="#fn-50-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
  play: async ({ canvasElement }) => {
    const host = getFootnote(canvasElement, 'visual-footnote');
    await host.updateComplete;

    const footnoteStyleElement = document.getElementById(FOOTNOTE_STYLE_ID);
    if (!(footnoteStyleElement instanceof HTMLStyleElement)) {
      throw new Error('ui-footnote の document style が注入されていません');
    }
    const popoverStyleElement = document.getElementById(POPOVER_STYLE_ID);
    if (!(popoverStyleElement instanceof HTMLStyleElement)) {
      throw new Error('ui-popover の document style が注入されていません');
    }

    const footnoteStyleText = footnoteStyleElement.textContent;
    const popoverStyleText = popoverStyleElement.textContent;

    const requiredFootnoteSnippets = [
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
      '@media print',
      'section.footnotes',
      'data-footnote-backref',
      'var(--primary',
    ];

    const requiredPopoverSnippets = [
      'var(--bg-surface-2',
      'var(--fg-default',
      'var(--border-default',
      'var(--z-popover',
    ];

    for (const snippet of requiredFootnoteSnippets) {
      if (!footnoteStyleText.includes(snippet)) {
        throw new Error(`footnote 表示モード契約に必要な定義が不足しています: ${snippet}`);
      }
    }

    for (const snippet of requiredPopoverSnippets) {
      if (!popoverStyleText.includes(snippet)) {
        throw new Error(`popover 表示モード契約に必要な定義が不足しています: ${snippet}`);
      }
    }

    if (/section\.footnotes\s*\{[^}]*display\s*:\s*none/i.test(footnoteStyleText)) {
      throw new Error('section.footnotes を非表示にする契約違反があります');
    }

    const trigger = getTrigger(host);
    const popover = getPopover(host);
    const triggerStyle = getComputedStyle(trigger);
    const popoverStyle = getComputedStyle(popover);
    if (popoverStyle.marginTop !== '0px' || popoverStyle.marginLeft !== '0px') {
      throw new Error(
        `popover margin must be 0px: top=${popoverStyle.marginTop}, left=${popoverStyle.marginLeft}`,
      );
    }
    if (triggerStyle.fontSize === '' || popoverStyle.fontSize === '') {
      throw new Error('計算済みスタイルの取得に失敗しました');
    }
  },
};
