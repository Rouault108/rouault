import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/footnote/footnote.js';
import '../../src/components/ui/popover/popover.js';
import type { Footnote } from '../../src/components/ui/footnote/footnote.js';
import type { UiPopover } from '../../src/components/ui/popover/popover.js';
import { dispatchKey, nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

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

const getTrigger = (host: Footnote): HTMLAnchorElement | null =>
  host.querySelector<HTMLAnchorElement>('[data-part="trigger"]');

const getPopover = (host: Footnote): HTMLElement | null =>
  host.querySelector<HTMLElement>('[data-part="content"]');

const getPopoverHost = (host: Footnote): UiPopover | null =>
  host.querySelector<UiPopover>('ui-popover[data-part="popover-host"]');

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const waitForCustomEvent = <T>(target: EventTarget, type: string): Promise<CustomEvent<T>> =>
  new Promise((resolve) => {
    target.addEventListener(
      type,
      ((event: Event) => {
        resolve(event as CustomEvent<T>);
      }) as EventListener,
      { once: true },
    );
  });

describe('ui-footnote browser contract', () => {
  it('trigger / popover / endnotes backlink の公開 DOM 契約を保持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
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
      </div>
    `);

    const host = expectPresent(
      wrapper.querySelector<Footnote>('#default-footnote'),
      'default-footnote',
    );
    await waitForLitUpdate(host);

    const trigger = expectPresent(getTrigger(host), 'trigger');
    const popoverHost = expectPresent(getPopoverHost(host), 'popoverHost');
    const popover = expectPresent(getPopover(host), 'popover');
    const footerLink = expectPresent(
      popover.querySelector<HTMLAnchorElement>('.footnote-list-link'),
      'footerLink',
    );
    const backlink = expectPresent(
      wrapper.querySelector<HTMLAnchorElement>('section.footnotes a[data-footnote-backref]'),
      'backlink',
    );

    expect(trigger.getAttribute('href')).to.equal('#fn-1');
    expect(trigger.id).to.equal('fn-1-ref-1');
    expect(trigger.getAttribute('role')).to.equal('doc-noteref');
    expect(trigger.getAttribute('aria-controls')).to.equal('fn-1-popover');
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(trigger.textContent?.trim()).to.equal('[1]');

    expect(popoverHost.id).to.equal('fn-1-popover-host');
    expect(popover.id).to.equal('fn-1-popover');
    expect(popover.getAttribute('role')).to.equal('note');
    expect(popover.getAttribute('aria-labelledby')).to.equal('fn-1-label');

    expect(footerLink.getAttribute('href')).to.equal('#fn-1');
    expect(backlink.getAttribute('href')).to.equal('#fn-1-ref-1');
  });

  it('shared secondary reference は自前 Popover を持たず、修飾クリックではネイティブリンクを維持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <article data-footnote-scope>
          <p>
            最初の参照
            <ui-footnote id="owner" ref-id="fn-11" index="11" ref-instance="1">
              <span>共有本文は primary reference が 1 つだけ保持する。</span>
            </ui-footnote>
            追従参照
            <ui-footnote
              id="follower"
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
      </div>
    `);

    const owner = expectPresent(wrapper.querySelector<Footnote>('#owner'), 'owner');
    const follower = expectPresent(wrapper.querySelector<Footnote>('#follower'), 'follower');
    await Promise.all([waitForLitUpdate(owner), waitForLitUpdate(follower)]);

    const ownerTrigger = expectPresent(getTrigger(owner), 'ownerTrigger');
    const followerTrigger = expectPresent(getTrigger(follower), 'followerTrigger');

    expect(ownerTrigger.id).to.equal('fn-11-ref-1');
    expect(followerTrigger.id).to.equal('fn-11-ref-2');
    expect(follower.querySelector('ui-popover')).to.equal(null);

    const modifiedCases: MouseEventInit[] = [
      { metaKey: true, button: 0 },
      { ctrlKey: true, button: 0 },
      { shiftKey: true, button: 0 },
      { button: 1 },
    ];

    for (const init of modifiedCases) {
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        ...init,
      });
      followerTrigger.dispatchEvent(event);
      expect(event.defaultPrevented).to.equal(false);
    }

    if (!supportsPopoverApi()) {
      return;
    }

    const popoverHost = expectPresent(getPopoverHost(owner), 'popoverHost');
    const popover = expectPresent(getPopover(owner), 'popover');

    const opened = waitForCustomEvent(popoverHost, 'ui-popover-opened');
    const primaryClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
    });

    followerTrigger.dispatchEvent(primaryClick);
    expect(primaryClick.defaultPrevented).to.equal(true);

    await opened;
    await nextAnimationFrame();

    expect(isPopoverOpen(popover)).to.equal(true);
    expect(followerTrigger.getAttribute('aria-expanded')).to.equal('true');
    expect(ownerTrigger.getAttribute('aria-expanded')).to.equal('false');
  });

  it('Escape で閉じて trigger に戻り、footer link 上の Tab で閉じること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
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
      </div>
    `);

    const host = expectPresent(
      wrapper.querySelector<Footnote>('#keyboard-footnote'),
      'keyboard-footnote',
    );
    await waitForLitUpdate(host);

    if (!supportsPopoverApi()) {
      return;
    }

    const trigger = expectPresent(getTrigger(host), 'trigger');
    const popover = expectPresent(getPopover(host), 'popover');
    const popoverHost = expectPresent(getPopoverHost(host), 'popoverHost');

    trigger.focus();

    const opened = waitForCustomEvent(popoverHost, 'ui-popover-opened');
    trigger.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        button: 0,
      }),
    );
    await opened;
    await nextAnimationFrame();

    expect(isPopoverOpen(popover)).to.equal(true);

    const closedByEscape = waitForCustomEvent(popoverHost, 'ui-popover-closed');
    dispatchKey(popover, 'Escape');
    await closedByEscape;
    await nextAnimationFrame();

    expect(isPopoverOpen(popover)).to.equal(false);
    expect(document.activeElement).to.equal(trigger);

    const reopened = waitForCustomEvent(popoverHost, 'ui-popover-opened');
    trigger.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        button: 0,
      }),
    );
    await reopened;
    await nextAnimationFrame();

    const footerLink = expectPresent(
      popover.querySelector<HTMLAnchorElement>('.footnote-list-link'),
      'footerLink',
    );
    footerLink.focus();

    const closedByTab = waitForCustomEvent(popoverHost, 'ui-popover-closed');
    dispatchKey(footerLink, 'Tab');
    await closedByTab;
    await nextAnimationFrame();

    expect(isPopoverOpen(popover)).to.equal(false);
  });

  it('SSR 由来本文を保持し、再描画後も失わず、無効 index / refInstance を正規化すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <article data-footnote-scope>
          <div>
            SSR 再接続
            <ui-footnote id="ssr-footnote" ref-id="fn-60" index="0" ref-instance="-1">
              <p>SSR で埋め込まれた脚注本文。</p>
            </ui-footnote>
          </div>

          <section class="footnotes" role="doc-endnotes">
            <h2 class="sr-only">脚注</h2>
            <ol>
              <li id="fn-60">
                SSR で埋め込まれた脚注本文。
                <a href="#fn-60-ref-1" data-footnote-backref role="doc-backlink">↩︎</a>
              </li>
            </ol>
          </section>
        </article>
      </div>
    `);

    const host = expectPresent(wrapper.querySelector<Footnote>('#ssr-footnote'), 'ssr-footnote');
    await waitForLitUpdate(host);

    const trigger = expectPresent(getTrigger(host), 'trigger');
    const popover = expectPresent(getPopover(host), 'popover');
    const body = expectPresent(
      popover.querySelector<HTMLElement>('.footnote-body'),
      'footnote-body',
    );

    expect(trigger.id).to.equal('fn-60-ref-1');
    expect(trigger.textContent?.trim()).to.equal('[1]');
    expect(body.textContent?.includes('SSR で埋め込まれた脚注本文。')).to.equal(true);
    expect(
      body.querySelector(
        '[data-part="trigger"], [data-part="content"], [data-part="popover-host"]',
      ),
    ).to.equal(null);
    expect(body.querySelector('.footnote-list-link, .footnote-popover-footer')).to.equal(null);

    host.index = 61;
    await waitForLitUpdate(host);

    const rerenderedTrigger = expectPresent(getTrigger(host), 'rerenderedTrigger');
    const rerenderedBody = expectPresent(
      expectPresent(getPopover(host), 'rerenderedPopover').querySelector<HTMLElement>(
        '.footnote-body',
      ),
      'rerenderedBody',
    );

    expect(rerenderedTrigger.textContent?.trim()).to.equal('[61]');
    expect(rerenderedBody.textContent?.includes('SSR で埋め込まれた脚注本文。')).to.equal(true);
  });
});
