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

// export const Default: Story = {
//   render: () => html`
//     <article>
//       <p>
//         読書体験は本文の信号比で決まる
//         <ui-footnote id="default-footnote" ref-id="fn-1" index="1" ref-instance="1">
//           <span>補足: 本文に集中できる設計は、補助情報へのアクセス経路を明確に定義する。</span>
//         </ui-footnote>
//       </p>

//       <section class="footnotes" role="doc-endnotes">
//         <h2 class="sr-only">脚注</h2>
//         <ol>
//           <li id="fn-1">
//             補足: 本文に集中できる設計は、補助情報へのアクセス経路を明確に定義する。
//             <a href="#fnref-1-1">↩︎</a>
//           </li>
//         </ol>
//       </section>
//     </article>
//   `,
//   play: async ({ canvasElement }) => {
//     const host = getFootnote(canvasElement, 'default-footnote');
//     await host.updateComplete;
//     const popoverHost = getPopoverHost(host);

//     const trigger = getTrigger(host);
//     if (trigger.getAttribute('href') !== '#fn-1') {
//       throw new Error('trigger の href が #fn-1 ではありません');
//     }
//     if (trigger.getAttribute('role') !== 'doc-noteref') {
//       throw new Error('trigger の role は doc-noteref である必要があります');
//     }
//     if (trigger.id !== 'fnref-1-1') {
//       throw new Error(`trigger id は fnref-1-1 を想定しています: ${trigger.id}`);
//     }
//     if (trigger.getAttribute('aria-controls') !== 'fn-1-popover') {
//       throw new Error('trigger の aria-controls が不正です');
//     }
//     if (normalizeText(trigger.textContent) !== '[1]') {
//       throw new Error(`trigger 表示は [1] のはずですが "${normalizeText(trigger.textContent)}" です`);
//     }

//     const popover = getPopover(host);
//     if (popoverHost.id !== 'fn-1-popover-host') {
//       throw new Error(`ui-popover host id は fn-1-popover-host を想定しています: ${popoverHost.id}`);
//     }
//     if (popover.id !== 'fn-1-popover') {
//       throw new Error('popover id が fn-1-popover ではありません');
//     }
//     if (popover.getAttribute('popover') !== 'auto') {
//       throw new Error('popover 属性は auto である必要があります');
//     }
//     if (popover.getAttribute('role') !== 'note') {
//       throw new Error('popover の role は note である必要があります');
//     }
//     if (popover.getAttribute('aria-labelledby') !== 'fn-1-label') {
//       throw new Error('popover の aria-labelledby が不正です');
//     }

//     const footerLink = popover.querySelector<HTMLAnchorElement>('.footnote-list-link');
//     if (!footerLink) throw new Error('.footnote-list-link が見つかりません');
//     if (footerLink.getAttribute('href') !== '#fn-1') {
//       throw new Error('footer link は #fn-1 を指す必要があります');
//     }
//     if (!normalizeText(footerLink.textContent).includes('脚注一覧で見る')) {
//       throw new Error('footer link テキストに「脚注一覧で見る」が含まれていません');
//     }

//     const endnotes = canvasElement.querySelector<HTMLElement>('section.footnotes[role="doc-endnotes"]');
//     if (!endnotes) throw new Error('section.footnotes[role="doc-endnotes"] が見つかりません');
//     const endnoteItem = endnotes.querySelector<HTMLElement>('#fn-1');
//     if (!endnoteItem) throw new Error('脚注一覧の #fn-1 が見つかりません');
//   },
// };

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