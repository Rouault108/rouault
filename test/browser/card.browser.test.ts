import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/card/card.js';
import type { Card } from '../../src/components/ui/card/card.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const installResizeObserverStub = (): (() => void) => {
  const original = globalThis.ResizeObserver;

  if (original) {
    return () => {
      globalThis.ResizeObserver = original;
    };
  }

  class ResizeObserverStub {
    observe(_target: Element): void {
      void _target;
      return;
    }

    unobserve(_target: Element): void {
      void _target;
      return;
    }

    disconnect(): void {
      return;
    }
  }

  globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;

  return () => {
    delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
  };
};

const flush = async (host: Card): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

describe('ui-card browser contract', () => {
  it('generic card は role=article と 3 スロットを持ち、非 interactive のままであること', async () => {
    const restoreResizeObserver = installResizeObserverStub();

    try {
      const host = await fixture<Card>(html`
        <ui-card>
          <div slot="header">header</div>
          <p>body</p>
          <div slot="footer">footer</div>
        </ui-card>
      `);

      await flush(host);

      expect(host.getAttribute('role')).to.equal('article');
      expect(host.hasAttribute('data-interactive')).to.equal(false);

      const slots = Array.from(host.shadowRoot?.querySelectorAll('slot') ?? []);
      expect(slots.length).to.equal(3);
      expect(host.shadowRoot?.querySelector('slot[name="header"]')).to.not.equal(null);
      expect(host.shadowRoot?.querySelector('slot:not([name])')).to.not.equal(null);
      expect(host.shadowRoot?.querySelector('slot[name="footer"]')).to.not.equal(null);
    } finally {
      restoreResizeObserver();
    }
  });

  it('link mode は href と card-title が揃った時だけ link card として描画されること', async () => {
    const restoreResizeObserver = installResizeObserverStub();

    try {
      const linkHost = await fixture<Card>(html`
        <ui-card
          card-kind="link"
          href="/notes/link-card"
          card-title="リンクカード"
          description="リンクカードの説明です"
          site-name="Rouault"
        ></ui-card>
      `);

      await flush(linkHost);

      const link = expectPresent(
        linkHost.shadowRoot?.querySelector<HTMLAnchorElement>('a.link-card'),
        'link card anchor',
      );
      const title = expectPresent(
        linkHost.shadowRoot?.querySelector<HTMLElement>('.link-card__title'),
        'link card title',
      );
      const eyebrow = expectPresent(
        linkHost.shadowRoot?.querySelector<HTMLElement>('.link-card__eyebrow'),
        'link card eyebrow',
      );

      expect(link.getAttribute('href')).to.equal('/notes/link-card');
      expect(linkHost.hasAttribute('data-interactive')).to.equal(true);
      expect(title.textContent?.trim()).to.equal('リンクカード');
      expect(eyebrow.textContent?.trim()).to.equal('Rouault');
      expect(link.classList.contains('link-card--no-image')).to.equal(true);

      const fallbackHost = await fixture<Card>(html`
        <ui-card card-kind="link" href="/notes/fallback"></ui-card>
      `);

      await flush(fallbackHost);

      expect(fallbackHost.shadowRoot?.querySelector('a.link-card')).to.equal(null);
      expect(fallbackHost.shadowRoot?.querySelectorAll('slot').length).to.equal(3);
      expect(fallbackHost.hasAttribute('data-interactive')).to.equal(false);
    } finally {
      restoreResizeObserver();
    }
  });

  it('clickable generic card は最初のリンクへ click を委譲し、独立 interactive target では委譲しないこと', async () => {
    const restoreResizeObserver = installResizeObserverStub();

    try {
      const host = await fixture<Card>(html`
        <ui-card clickable>
          <a
            id="primary-link"
            href="/notes/primary"
            data-link-kind="internal-document"
            data-link-surface="card"
            >primary</a
          >
          <button id="inner-button" type="button">inner action</button>
        </ui-card>
      `);

      await flush(host);

      const primaryLink = expectPresent(
        host.querySelector<HTMLAnchorElement>('#primary-link'),
        'primary link',
      );
      const innerButton = expectPresent(
        host.querySelector<HTMLButtonElement>('#inner-button'),
        'inner button',
      );

      let delegatedClickCount = 0;
      const originalClick = primaryLink.click.bind(primaryLink);
      primaryLink.click = (): void => {
        delegatedClickCount += 1;
      };

      try {
        host.click();
        expect(delegatedClickCount).to.equal(1);

        innerButton.click();
        expect(delegatedClickCount).to.equal(1);
        expect(host.hasAttribute('data-interactive')).to.equal(true);
      } finally {
        primaryLink.click = originalClick;
      }
    } finally {
      restoreResizeObserver();
    }
  });
});
