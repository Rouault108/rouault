import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/skip-link/skip-link.js';
import type { SkipLink } from '../../src/components/ui/skip-link/skip-link.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

const must = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

describe('ui-skip-link browser contract', () => {
  it('target-id 正規入力から shadow DOM 内の anchor href を構成すること', async () => {
    const mount = await fixture<HTMLElement>(html`
      <div>
        <ui-skip-link target-id="main-content" label="メインコンテンツへスキップ"></ui-skip-link>
        <main id="main-content" tabindex="-1">main</main>
      </div>
    `);

    const skipLink = must(
      mount.querySelector<SkipLink>('ui-skip-link'),
      'ui-skip-link が見つかりません',
    );
    await waitForLitUpdate(skipLink);

    const anchor = must(
      skipLink.shadowRoot?.querySelector<HTMLAnchorElement>('a'),
      'shadow DOM 内の anchor が見つかりません',
    );
    const target = must(
      mount.querySelector<HTMLElement>('#main-content'),
      '#main-content が見つかりません',
    );

    expect(anchor.getAttribute('href')).to.equal('#main-content');
    expect(anchor.textContent?.trim()).to.equal('メインコンテンツへスキップ');
    expect(target.getAttribute('tabindex')).to.equal('-1');
    expect(skipLink.getAttribute('aria-label')).to.equal('メインコンテンツへスキップ');
  });

  it('href 互換入力も引き続き受け付けること', async () => {
    const mount = await fixture<HTMLElement>(html`
      <div>
        <ui-skip-link href="#main-content" label="メインコンテンツへスキップ"></ui-skip-link>
        <main id="main-content" tabindex="-1">main</main>
      </div>
    `);

    const skipLink = must(
      mount.querySelector<SkipLink>('ui-skip-link'),
      'ui-skip-link が見つかりません',
    );
    await waitForLitUpdate(skipLink);

    const anchor = must(
      skipLink.shadowRoot?.querySelector<HTMLAnchorElement>('a'),
      'shadow DOM 内の anchor が見つかりません',
    );
    const target = must(
      mount.querySelector<HTMLElement>('#main-content'),
      '#main-content が見つかりません',
    );

    expect(anchor.getAttribute('href')).to.equal('#main-content');
    expect(anchor.textContent?.trim()).to.equal('メインコンテンツへスキップ');
    expect(target.getAttribute('tabindex')).to.equal('-1');
    expect(skipLink.getAttribute('aria-label')).to.equal('メインコンテンツへスキップ');
  });

  it('target-id と href が競合する場合は target-id を優先すること', async () => {
    const mount = await fixture<HTMLElement>(html`
      <div>
        <ui-skip-link target-id="content" href="#other-content" label="本文へ移動"></ui-skip-link>
        <main id="content" tabindex="-1">content</main>
        <main id="other-content" tabindex="-1">other</main>
      </div>
    `);

    const skipLink = must(
      mount.querySelector<SkipLink>('ui-skip-link'),
      'ui-skip-link が見つかりません',
    );
    await waitForLitUpdate(skipLink);

    const anchor = must(
      skipLink.shadowRoot?.querySelector<HTMLAnchorElement>('a'),
      'shadow DOM 内の anchor が見つかりません',
    );

    expect(anchor.getAttribute('href')).to.equal('#content');
  });

  it('click でターゲットへ focus を移すこと', async () => {
    const mount = await fixture<HTMLElement>(html`
      <div>
        <ui-skip-link target-id="content" label="本文へ移動"></ui-skip-link>
        <main id="content" tabindex="-1">content</main>
      </div>
    `);

    const skipLink = must(
      mount.querySelector<SkipLink>('ui-skip-link'),
      'ui-skip-link が見つかりません',
    );
    await waitForLitUpdate(skipLink);

    const anchor = must(
      skipLink.shadowRoot?.querySelector<HTMLAnchorElement>('a'),
      'shadow DOM 内の anchor が見つかりません',
    );
    const target = must(mount.querySelector<HTMLElement>('#content'), '#content が見つかりません');

    const originalUrl = window.location.href;
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      composed: true,
      cancelable: true,
      button: 0,
    });

    anchor.dispatchEvent(clickEvent);
    await Promise.resolve();

    expect(clickEvent.defaultPrevented).to.equal(true);
    expect(window.location.href).to.equal(originalUrl);
    expect(document.activeElement).to.equal(target);
  });

  it('focus() が内部 anchor へ委譲されること', async () => {
    const mount = await fixture<HTMLElement>(html`
      <div>
        <ui-skip-link target-id="content" label="本文へ移動"></ui-skip-link>
        <main id="content" tabindex="-1">content</main>
      </div>
    `);

    const skipLink = must(
      mount.querySelector<SkipLink>('ui-skip-link'),
      'ui-skip-link が見つかりません',
    );
    await waitForLitUpdate(skipLink);

    skipLink.focus();

    const anchor = must(
      skipLink.shadowRoot?.querySelector<HTMLAnchorElement>('a'),
      'shadow DOM 内の anchor が見つかりません',
    );
    const activeInShadow = skipLink.shadowRoot?.activeElement ?? null;

    expect(activeInShadow).to.equal(anchor);
  });
});
