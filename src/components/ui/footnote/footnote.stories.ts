import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { userEvent } from 'storybook/test';
import './footnote';
import type { Footnote } from './footnote';
import { DOCUMENT_STYLE_ID as POPOVER_STYLE_ID } from '../popover/popover';

const meta: Meta<Footnote> = {
  title: 'Components/Footnote',
  component: 'ui-footnote',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
脚注参照のためのコンポーネントです。

- Trigger は常に \`<a href="#fn-*">\` を維持（No-JS フォールバック）
- 通常クリックのみ Popover を開き、修飾キー付きクリックはネイティブリンクを維持
- Popover 内から「脚注一覧で見る」へ遷移できる
- 末尾の \`section.footnotes\` は常時可視（Hydration 後も非表示化しない）
        `,
      },
    },
  },
  argTypes: {
    refId: {
      control: 'text',
      name: 'ref-id',
      description: '脚注ID（例: fn-1）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    index: {
      control: { type: 'number', min: 1, step: 1 },
      description: '表示番号（[n]）',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '1' },
      },
    },
    refInstance: {
      control: { type: 'number', min: 1, step: 1 },
      name: 'ref-instance',
      description: '同一脚注内での参照インスタンス番号',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '1' },
      },
    },
    shared: {
      control: 'boolean',
      description: 'true の場合、Popover 本体を描画せず既存 Popover を共有',
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

const getPopoverHost = (host: Footnote): HTMLElement => {
  const popoverHost = host.querySelector<HTMLElement>('ui-popover[data-part="popover-host"]');
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

const nextFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const hidePopoverProgrammatically = (popover: HTMLElement): boolean => {
  const maybePopover = popover as HTMLElement & { hidePopover?: () => void };
  if (typeof maybePopover.hidePopover !== 'function') return false;
  maybePopover.hidePopover();
  return true;
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

/**
 * 基本構造:
 * - Trigger / Popover / Footer Link の契約
 * - endnotes セクションとのリンク整合
 */
export const Default: Story = {
  render: () => html`
    <article>
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
            <a href="#fnref-1-1">↩︎</a>
          </li>
        </ol>
      </section>
    </article>
  `,
  play: async ({ canvasElement }) => {
    const host = getFootnote(canvasElement, 'default-footnote');
    await host.updateComplete;
    const popoverHost = getPopoverHost(host);

    const trigger = getTrigger(host);
    if (trigger.getAttribute('href') !== '#fn-1') {
      throw new Error('trigger の href が #fn-1 ではありません');
    }
    if (trigger.getAttribute('role') !== 'doc-noteref') {
      throw new Error('trigger の role は doc-noteref である必要があります');
    }
    if (trigger.id !== 'fnref-1-1') {
      throw new Error(`trigger id は fnref-1-1 を想定しています: ${trigger.id}`);
    }
    if (trigger.getAttribute('aria-controls') !== 'fn-1-popover') {
      throw new Error('trigger の aria-controls が不正です');
    }
    if (normalizeText(trigger.textContent) !== '[1]') {
      throw new Error(`trigger 表示は [1] のはずですが "${normalizeText(trigger.textContent)}" です`);
    }

    const popover = getPopover(host);
    if (popoverHost.id !== 'fn-1-popover-host') {
      throw new Error(`ui-popover host id は fn-1-popover-host を想定しています: ${popoverHost.id}`);
    }
    if (popover.id !== 'fn-1-popover') {
      throw new Error('popover id が fn-1-popover ではありません');
    }
    if (popover.getAttribute('popover') !== 'auto') {
      throw new Error('popover 属性は auto である必要があります');
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
    if (!normalizeText(footerLink.textContent).includes('脚注一覧で見る')) {
      throw new Error('footer link テキストに「脚注一覧で見る」が含まれていません');
    }

    const endnotes = canvasElement.querySelector<HTMLElement>('section.footnotes[role="doc-endnotes"]');
    if (!endnotes) throw new Error('section.footnotes[role="doc-endnotes"] が見つかりません');
    const endnoteItem = endnotes.querySelector<HTMLElement>('#fn-1');
    if (!endnoteItem) throw new Error('脚注一覧の #fn-1 が見つかりません');
  },
};

/**
 * バリアント×状態:
 * - 通常参照
 * - shared 参照（Popover共有）
 * - 参照インスタンス差分
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
      <div class="label">single reference</div>
      <p>
        単独参照
        <ui-footnote id="matrix-single" ref-id="fn-10" index="10" ref-instance="1">
          <span>単独参照の脚注本文。</span>
        </ui-footnote>
      </p>

      <div class="label">shared reference</div>
      <p>
        最初の参照
        <ui-footnote id="matrix-shared-owner" ref-id="fn-11" index="11" ref-instance="1">
          <span>同一脚注を複数箇所から参照する場合の共有本文。</span>
        </ui-footnote>
        と再参照
        <ui-footnote
          id="matrix-shared-follower"
          ref-id="fn-11"
          index="11"
          ref-instance="2"
          shared
        ></ui-footnote>
      </p>

      <div class="label">another index</div>
      <p>
        別番号
        <ui-footnote id="matrix-another" ref-id="fn-12" index="12" ref-instance="1">
          <span>別番号の脚注本文。</span>
        </ui-footnote>
      </p>
    </div>

    <section class="footnotes" role="doc-endnotes">
      <h2 class="sr-only">脚注</h2>
      <ol>
        <li id="fn-10">単独参照の脚注本文。 <a href="#fnref-10-1">↩︎</a></li>
        <li id="fn-11">同一脚注を複数箇所から参照する場合の共有本文。 <a href="#fnref-11-1">↩︎</a></li>
        <li id="fn-12">別番号の脚注本文。 <a href="#fnref-12-1">↩︎</a></li>
      </ol>
    </section>
  `,
  play: async ({ canvasElement }) => {
    const ids = ['matrix-single', 'matrix-shared-owner', 'matrix-shared-follower', 'matrix-another'] as const;
    const hosts = ids.map((id) => getFootnote(canvasElement, id));
    await Promise.all(hosts.map((host) => host.updateComplete));

    const sharedOwner = getFootnote(canvasElement, 'matrix-shared-owner');
    const sharedFollower = getFootnote(canvasElement, 'matrix-shared-follower');
    const sharedOwnerPopoverHost = getPopoverHost(sharedOwner);

    const ownerTrigger = getTrigger(sharedOwner);
    const followerTrigger = getTrigger(sharedFollower);

    if (ownerTrigger.getAttribute('aria-controls') !== 'fn-11-popover') {
      throw new Error('shared owner の aria-controls が fn-11-popover ではありません');
    }
    if (followerTrigger.getAttribute('aria-controls') !== 'fn-11-popover') {
      throw new Error('shared follower の aria-controls が fn-11-popover ではありません');
    }
    if (followerTrigger.id !== 'fnref-11-2') {
      throw new Error(`shared follower の trigger id が fnref-11-2 ではありません: ${followerTrigger.id}`);
    }

    const ownerPopover = sharedOwner.querySelector('[data-part="content"]');
    if (!ownerPopover) throw new Error('shared owner は popover を持つ必要があります');
    if (sharedOwnerPopoverHost.id !== 'fn-11-popover-host') {
      throw new Error('shared owner の ui-popover host id が不正です');
    }
    const followerPopoverHost = sharedFollower.querySelector('ui-popover[data-part="popover-host"]');
    if (followerPopoverHost) throw new Error('shared follower は ui-popover host を描画してはいけません');
    const followerPopover = sharedFollower.querySelector('[data-part="content"]');
    if (followerPopover) throw new Error('shared follower は popover 本体を描画してはいけません');

    const sharedPopovers = canvasElement.querySelectorAll('#fn-11-popover');
    if (sharedPopovers.length !== 1) {
      throw new Error(`fn-11-popover は1つだけ存在する必要があります: ${String(sharedPopovers.length)}`);
    }

    const labels = hosts.map((host) => normalizeText(getTrigger(host).textContent));
    const expected = ['[10]', '[11]', '[11]', '[12]'];
    if (labels.join('|') !== expected.join('|')) {
      throw new Error(`表示ラベルが想定と一致しません: ${labels.join(', ')}`);
    }

    if (supportsPopoverApi()) {
      const sharedPopover = getPopover(sharedOwner);
      const openedPromise = waitForEvent(sharedOwnerPopoverHost, 'ui-popover-opened');
      const followerClick = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      followerTrigger.dispatchEvent(followerClick);
      if (!followerClick.defaultPrevented) {
        throw new Error('shared follower の通常クリックは preventDefault される必要があります');
      }
      await openedPromise;
      await nextFrame();

      if (!isPopoverOpen(sharedPopover)) {
        throw new Error('shared follower クリックで owner 側 Popover が開いていません');
      }
      if (followerTrigger.getAttribute('aria-expanded') !== 'true') {
        throw new Error('shared follower が active trigger になっていません');
      }
      if (!followerTrigger.classList.contains('is-active-trigger')) {
        throw new Error('shared follower クリック中は active class が必要です');
      }
      if (ownerTrigger.getAttribute('aria-expanded') !== 'false') {
        throw new Error('shared follower 経由で開いた場合、owner trigger は非展開のままである必要があります');
      }

      const footerLink = sharedPopover.querySelector<HTMLAnchorElement>('.footnote-list-link');
      if (!footerLink) throw new Error('shared owner の footer link が見つかりません');

      const closedPromise = waitForEvent(sharedOwnerPopoverHost, 'ui-popover-closed');
      await userEvent.click(footerLink);
      await closedPromise;
      await nextFrame();

      if (isPopoverOpen(sharedPopover)) {
        throw new Error('shared footer link クリック後に Popover が閉じていません');
      }
      if (followerTrigger.getAttribute('aria-expanded') !== 'false') {
        throw new Error('shared close 後に follower aria-expanded が false へ戻っていません');
      }
      if (document.activeElement === followerTrigger) {
        throw new Error('shared footer close は trigger へフォーカス復帰しない契約です');
      }
    } else {
      const followerClick = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      followerTrigger.dispatchEvent(followerClick);
      if (followerClick.defaultPrevented) {
        throw new Error('Popover 非対応環境の shared follower はネイティブリンクを維持する必要があります');
      }
    }
  },
};

/**
 * デュアルアクセス契約:
 * - 通常クリック: Popover
 * - 修飾キー付きクリック: ネイティブリンク
 * - Footerリンクでクローズし、endnotes は可視のまま
 */
export const DualAccessContract: Story = {
  render: () => html`
    <article>
      <p>
        参照
        <ui-footnote id="access-footnote" ref-id="fn-20" index="20" ref-instance="1">
          <span>デュアルアクセス契約の検証用本文。</span>
        </ui-footnote>
      </p>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-20">
            デュアルアクセス契約の検証用本文。
            <a href="#fnref-20-1">↩︎</a>
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

    const modifiedClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true,
    });
    trigger.dispatchEvent(modifiedClick);
    if (modifiedClick.defaultPrevented) {
      throw new Error('修飾キー付きクリックは preventDefault してはいけません');
    }
    if (trigger.getAttribute('aria-expanded') !== 'false') {
      throw new Error('修飾キー付きクリック後に aria-expanded が変化してはいけません');
    }

    const metaClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      metaKey: true,
    });
    trigger.dispatchEvent(metaClick);
    if (metaClick.defaultPrevented) {
      throw new Error('Cmd/Meta クリックは preventDefault してはいけません');
    }

    const middleClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 1,
    });
    trigger.dispatchEvent(middleClick);
    if (middleClick.defaultPrevented) {
      throw new Error('中クリックは preventDefault してはいけません');
    }

    if (supportsPopoverApi()) {
      const openedPromise = waitForEvent(popoverHost, 'ui-popover-opened');
      const normalClick = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
      });
      trigger.dispatchEvent(normalClick);
      if (!normalClick.defaultPrevented) {
        throw new Error('Popover 対応環境では通常クリックを preventDefault する必要があります');
      }
      await openedPromise;
      await nextFrame();

      if (!isPopoverOpen(popover)) {
        throw new Error('通常クリックで Popover が開く必要があります');
      }
      if (trigger.getAttribute('aria-expanded') !== 'true') {
        throw new Error('Popover 表示中の trigger aria-expanded は true である必要があります');
      }
      if (!trigger.classList.contains('is-active-trigger')) {
        throw new Error('Popover 表示中は trigger に active クラスが必要です');
      }

      const footerLink = popover.querySelector<HTMLAnchorElement>('.footnote-list-link');
      if (!footerLink) throw new Error('footer link が見つかりません');
      const closedPromise = waitForEvent(popoverHost, 'ui-popover-closed');
      await userEvent.click(footerLink);
      await closedPromise;
      await nextFrame();

      if (isPopoverOpen(popover)) {
        throw new Error('footer link クリック後に Popover が閉じる必要があります');
      }
      if (trigger.getAttribute('aria-expanded') !== 'false') {
        throw new Error('Popover close 後の aria-expanded は false である必要があります');
      }
    } else {
      const normalClick = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      trigger.dispatchEvent(normalClick);
      if (normalClick.defaultPrevented) {
        throw new Error('Popover 非対応環境では通常クリックもネイティブリンク挙動を維持する必要があります');
      }
    }

    const endnotes = canvasElement.querySelector<HTMLElement>('section.footnotes');
    if (!endnotes) throw new Error('section.footnotes が見つかりません');
    const style = getComputedStyle(endnotes);
    if (style.display === 'none' || endnotes.hidden) {
      throw new Error('endnotes セクションは常時可視である必要があります');
    }
  },
};

/**
 * キーボード/フォーカス契約:
 * - Escape で閉じる
 * - Footer Link 上の Tab で閉じる
 * - 閉じ方に応じてフォーカス復帰契約を満たす
 */
export const KeyboardAndFocusContract: Story = {
  render: () => html`
    <article>
      <p>
        キーボード検証
        <ui-footnote id="keyboard-footnote" ref-id="fn-40" index="40" ref-instance="1">
          <span>キーボード契約を検証する脚注本文。</span>
        </ui-footnote>
        <a href="#after-footnote" id="after-footnote">次のリンク</a>
      </p>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-40">キーボード契約を検証する脚注本文。 <a href="#fnref-40-1">↩︎</a></li>
        </ol>
      </section>
    </article>
  `,
  play: async ({ canvasElement }) => {
    if (!supportsPopoverApi()) return;

    const host = getFootnote(canvasElement, 'keyboard-footnote');
    await host.updateComplete;

    const trigger = getTrigger(host);
    const popover = getPopover(host);
    const popoverHost = getPopoverHost(host);
    const afterLink = canvasElement.querySelector<HTMLAnchorElement>('#after-footnote');
    if (!afterLink) throw new Error('#after-footnote が見つかりません');

    const firstOpenedPromise = waitForEvent(popoverHost, 'ui-popover-opened');
    await userEvent.click(trigger);
    await firstOpenedPromise;
    await nextFrame();
    if (!isPopoverOpen(popover)) {
      throw new Error('キーボード検証前提: Popover が開いていません');
    }

    const footerLink = popover.querySelector<HTMLAnchorElement>('.footnote-list-link');
    if (!footerLink) throw new Error('footer link が見つかりません');

    footerLink.focus();
    await nextFrame();

    const escapeClosedPromise = waitForEvent(popoverHost, 'ui-popover-closed');
    await userEvent.keyboard('{Escape}');
    await escapeClosedPromise;
    await nextFrame();
    if (isPopoverOpen(popover)) {
      throw new Error('Escape で Popover が閉じる必要があります');
    }
    if (document.activeElement !== trigger) {
      throw new Error('Escape クローズ後は trigger にフォーカス復帰する必要があります');
    }

    const secondOpenedPromise = waitForEvent(popoverHost, 'ui-popover-opened');
    await userEvent.click(trigger);
    await secondOpenedPromise;
    await nextFrame();
    if (!isPopoverOpen(popover)) {
      throw new Error('Tab 契約検証前提: Popover が開いていません');
    }

    footerLink.focus();
    await nextFrame();

    const tabClosedPromise = waitForEvent(popoverHost, 'ui-popover-closed');
    await userEvent.tab();
    await tabClosedPromise;
    await nextFrame();

    if (isPopoverOpen(popover)) {
      throw new Error('Footer Link 上の Tab で Popover が閉じる必要があります');
    }
    if (document.activeElement !== afterLink) {
      throw new Error('Footer Link 経由クローズ後は次のフォーカス可能要素へ進む必要があります');
    }

    const thirdOpenedPromise = waitForEvent(popoverHost, 'ui-popover-opened');
    await userEvent.click(trigger);
    await thirdOpenedPromise;
    await nextFrame();
    if (!isPopoverOpen(popover)) {
      throw new Error('Dismiss 契約検証前提: Popover が開いていません');
    }

    const dismissClosedPromise = waitForEvent(popoverHost, 'ui-popover-closed');
    if (!hidePopoverProgrammatically(popover)) {
      throw new Error('Popover API の hidePopover が利用できません');
    }
    await dismissClosedPromise;
    await nextFrame();

    if (isPopoverOpen(popover)) {
      throw new Error('Dismiss 後に Popover が閉じる必要があります');
    }
    if (document.activeElement !== trigger) {
      throw new Error('Dismiss クローズ後は trigger にフォーカス復帰する必要があります');
    }
  },
};

/**
 * SSR/Hydration 契約:
 * - SSR 済み [data-part="content"] から本文を再利用する
 * - 再描画後も本文が失われず、内部要素が本文へ混入しない
 */
export const SsrHydrationContract: Story = {
  render: () => html`
    <article>
      <p>
        SSR hydrate
        <ui-footnote id="ssr-footnote" ref-id="fn-60" index="60" ref-instance="1">
          <ui-popover id="fn-60-popover-host" data-part="popover-host" placement="bottom-start" keep-link-fallback>
            <a
              id="fnref-60-1"
              data-part="trigger"
              slot="trigger"
              href="#fn-60"
              role="doc-noteref"
              aria-controls="fn-60-popover"
              aria-expanded="false"
              aria-details="fn-60-popover"
            >
              <sup>[60]</sup>
            </a>
            <div
              id="fn-60-popover"
              data-part="content"
              slot="content"
              role="note"
              aria-labelledby="fn-60-label"
            >
              <span id="fn-60-label" class="sr-only">脚注 60</span>
              <p>SSR で埋め込まれた脚注本文。</p>
              <footer class="footnote-popover-footer">
                <a href="#fn-60" class="footnote-list-link">
                  脚注一覧で見る <span aria-hidden="true">→</span>
                </a>
              </footer>
            </div>
          </ui-popover>
        </ui-footnote>
      </p>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-60">SSR で埋め込まれた脚注本文。 <a href="#fnref-60-1">↩︎</a></li>
        </ol>
      </section>
    </article>
  `,
  play: async ({ canvasElement }) => {
    const host = getFootnote(canvasElement, 'ssr-footnote');
    await host.updateComplete;

    const popover = getPopover(host);
    const body = popover.querySelector<HTMLElement>('.footnote-body');
    if (!body) throw new Error('.footnote-body が見つかりません');
    if (!normalizeText(body.textContent).includes('SSR で埋め込まれた脚注本文。')) {
      throw new Error('SSR 由来の本文が footnote-body へ再利用されていません');
    }
    if (body.querySelector('[data-part="trigger"], [data-part="content"], [data-part="popover-host"]')) {
      throw new Error('内部制御要素が footnote-body に混入しています');
    }
    if (body.querySelector('.footnote-list-link, .footnote-popover-footer')) {
      throw new Error('SSR footer 要素が本文へ混入しています');
    }
    if (host.querySelectorAll('.footnote-list-link').length !== 1) {
      throw new Error('footer link が重複描画されています');
    }

    host.index = 61;
    await host.updateComplete;

    const trigger = getTrigger(host);
    const rerenderedBody = getPopover(host).querySelector<HTMLElement>('.footnote-body');
    if (!rerenderedBody) throw new Error('再描画後の .footnote-body が見つかりません');
    if (normalizeText(rerenderedBody.textContent).includes('SSR で埋め込まれた脚注本文。') === false) {
      throw new Error('再描画後に SSR 本文が失われています');
    }
    if (normalizeText(trigger.textContent) !== '[61]') {
      throw new Error('再描画後に trigger 表示が更新されていません');
    }
  },
};

/**
 * 事故が多い境界条件:
 * - 不正番号のフォールバック
 * - 小さい親フォント下での 12px 下限
 * - 長文脚注の max-height / overflow 契約
 * - セクション/印刷スタイル契約の埋め込み
 */
export const BoundaryConditions: Story = {
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      <p>
        不正値フォールバック
        <ui-footnote id="boundary-fallback" index="0" ref-instance="0">
          <span>fallback 本文。</span>
        </ui-footnote>
      </p>

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
            長文脚注: 表示領域の上限を超えると内部スクロールで読む。長文脚注: 表示領域の上限を超えると内部スクロールで読む。
            長文脚注: 表示領域の上限を超えると内部スクロールで読む。長文脚注: 表示領域の上限を超えると内部スクロールで読む。
            長文脚注: 表示領域の上限を超えると内部スクロールで読む。長文脚注: 表示領域の上限を超えると内部スクロールで読む。
          </span>
        </ui-footnote>
      </p>
    </div>

    <section class="footnotes" role="doc-endnotes">
      <h2 class="sr-only">脚注</h2>
      <ol>
        <li id="fn-1">fallback 本文。 <a href="#fnref-1-1">↩︎</a></li>
        <li id="fn-31">small text 本文。 <a href="#fnref-31-1">↩︎</a></li>
        <li id="fn-32">長文本文。 <a href="#fnref-32-1">↩︎</a></li>
      </ol>
    </section>
  `,
  play: async ({ canvasElement }) => {
    const fallback = getFootnote(canvasElement, 'boundary-fallback');
    const small = getFootnote(canvasElement, 'boundary-small');
    const long = getFootnote(canvasElement, 'boundary-long');
    await Promise.all([fallback.updateComplete, small.updateComplete, long.updateComplete]);

    const fallbackTrigger = getTrigger(fallback);
    if (fallbackTrigger.id !== 'fnref-1-1') {
      throw new Error(`fallback trigger id が fnref-1-1 ではありません: ${fallbackTrigger.id}`);
    }
    if (fallbackTrigger.getAttribute('href') !== '#fn-1') {
      throw new Error('fallback href は #fn-1 である必要があります');
    }
    if (fallbackTrigger.getAttribute('aria-controls') !== 'fn-1-popover') {
      throw new Error('fallback aria-controls は fn-1-popover である必要があります');
    }

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
    const longMaxHeightToken = getComputedStyle(longPopoverHost).getPropertyValue('--ui-popover-max-height').trim();
    if (longMaxHeightToken === '') {
      throw new Error('長文脚注の Popover max-height トークンが設定されていません');
    }

    const styleElement = document.getElementById('ui-footnote-document-styles');
    if (!(styleElement instanceof HTMLStyleElement)) {
      throw new Error('ui-footnote の document style が注入されていません');
    }
    const styleText = styleElement.textContent;
    if (typeof styleText !== 'string') {
      throw new Error('style text の取得に失敗しました');
    }
    if (!styleText.includes('section.footnotes')) {
      throw new Error('footnotes section スタイルが定義されていません');
    }
    if (!styleText.includes('@media print')) {
      throw new Error('print スタイルが定義されていません');
    }
    if (/section\.footnotes\s*\{[^}]*display\s*:\s*none/i.test(styleText)) {
      throw new Error('section.footnotes を非表示にする契約違反があります');
    }

    const popoverStyleElement = document.getElementById(POPOVER_STYLE_ID);
    if (!(popoverStyleElement instanceof HTMLStyleElement)) {
      throw new Error('ui-popover の document style が注入されていません');
    }
    const popoverStyleText = popoverStyleElement.textContent;
    if (!popoverStyleText.includes('@media print')) {
      throw new Error('ui-popover 側の print スタイルが定義されていません');
    }
  },
};

/**
 * 視覚モード契約:
 * - Forced Colors / Reduced Motion / Print の定義が存在
 * - Dark/Light 双方でトークン参照を維持
 */
export const VisualModeContracts: Story = {
  render: () => html`
    <article>
      <p>
        表示モード検証
        <ui-footnote id="visual-footnote" ref-id="fn-50" index="50" ref-instance="1">
          <span>表示モード契約の検証用本文。</span>
        </ui-footnote>
      </p>
      <section class="footnotes" role="doc-endnotes">
        <h2 class="sr-only">脚注</h2>
        <ol>
          <li id="fn-50">表示モード契約の検証用本文。 <a href="#fnref-50-1">↩︎</a></li>
        </ol>
      </section>
    </article>
  `,
  play: async ({ canvasElement }) => {
    const host = getFootnote(canvasElement, 'visual-footnote');
    await host.updateComplete;

    const footnoteStyleElement = document.getElementById('ui-footnote-document-styles');
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
      throw new Error('表示モード検証: 計算済みスタイル取得に失敗しました');
    }
  },
};
