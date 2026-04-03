import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/banner/banner.js';
import type { Banner } from '../../src/components/ui/banner/banner.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

describe('ui-banner browser contract', () => {
  it('variant と role を正規化し、aria-atomic を常に公開すること', async () => {
    const banner = await fixture<Banner>(html`
      <ui-banner variant="unexpected">通知本文</ui-banner>
    `);

    await waitForLitUpdate(banner);

    expect(banner.getAttribute('data-resolved-variant')).to.equal('info');
    expect(banner.getAttribute('role')).to.equal('status');
    expect(banner.getAttribute('aria-atomic')).to.equal('true');

    banner.setAttribute('role', 'alert');
    await waitForLitUpdate(banner);

    expect(banner.getAttribute('role')).to.equal('alert');

    banner.setAttribute('role', 'dialog');
    await waitForLitUpdate(banner);

    expect(banner.getAttribute('role')).to.equal('status');

    banner.variant = 'error';
    await waitForLitUpdate(banner);

    expect(banner.getAttribute('data-resolved-variant')).to.equal('error');
    expect(banner.getAttribute('role')).to.equal('alert');
  });

  it('action slot の有無に応じて actions 領域を表示・非表示にすること', async () => {
    const banner = await fixture<Banner>(html` <ui-banner>通知本文</ui-banner> `);

    await waitForLitUpdate(banner);

    const actions = expectPresent(
      banner.shadowRoot?.querySelector<HTMLElement>('.actions'),
      'actions',
    );

    expect(actions.hidden).to.equal(true);

    const action = document.createElement('button');
    action.type = 'button';
    action.slot = 'action';
    action.textContent = '詳細';
    banner.append(action);
    await waitForLitUpdate(banner);

    expect(actions.hidden).to.equal(false);

    action.remove();
    await waitForLitUpdate(banner);

    expect(actions.hidden).to.equal(true);
  });

  it('dismiss click で banner を除去し、次の focusable 要素へ focus を戻すこと', async () => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = ((query: string): MediaQueryList => {
      return {
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      } as MediaQueryList;
    }) as typeof window.matchMedia;

    try {
      const wrapper = await fixture<HTMLDivElement>(html`
        <div>
          <ui-banner id="banner" dismissible>
            セッションはまもなく期限切れです。
            <button slot="action" type="button">延長する</button>
          </ui-banner>

          <div id="next-surface">
            <button id="next-focus" type="button">次の操作</button>
          </div>
        </div>
      `);

      const banner = expectPresent(wrapper.querySelector<Banner>('#banner'), 'banner');
      await waitForLitUpdate(banner);

      const dismissHost = expectPresent(
        banner.shadowRoot?.querySelector<HTMLElement>('ui-button.dismiss'),
        'dismissHost',
      );
      const dismissButton = expectPresent(
        dismissHost.shadowRoot?.querySelector<HTMLButtonElement>('button'),
        'dismissButton',
      );
      const nextFocus = expectPresent(
        wrapper.querySelector<HTMLButtonElement>('#next-focus'),
        'nextFocus',
      );

      dismissButton.click();
      await Promise.resolve();
      await Promise.resolve();

      expect(wrapper.querySelector('#banner')).to.equal(null);
      expect(document.activeElement).to.equal(nextFocus);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
