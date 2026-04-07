import { expect, fixture, html } from '@open-wc/testing';
import '../../../src/components/ui/breadcrumbs/breadcrumbs.js';
import type { Breadcrumbs } from '../../../src/components/ui/breadcrumbs/breadcrumbs.js';
import { waitForLitUpdate } from './wait-for-lit.js';

const BASE_ITEMS = [
  { label: 'ホーム', href: '/' },
  { label: 'プロジェクト', href: '/projects' },
  { label: 'ウェブアプリ', href: '/projects/web' },
  { label: 'バックエンド', href: '/projects/web/backend' },
  { label: 'API', href: '/projects/web/backend/api' },
  { label: 'エンドポイント', href: '/projects/web/backend/api/endpoints' },
  { label: 'ユーザー管理' },
];

const createMatchMediaMock = (matches: boolean) => {
  return (query: string): MediaQueryList =>
    ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
};

const getRenderedLabels = (host: Breadcrumbs): string[] =>
  Array.from(
    host.shadowRoot?.querySelectorAll<HTMLElement>(
      '.breadcrumb-item .breadcrumb-link, .breadcrumb-item .breadcrumb-current',
    ) ?? [],
  ).map((element) => element.textContent?.trim() ?? '');

describe('ui-breadcrumbs browser contract', () => {
  it('nav / separator / current page を公開すること', async () => {
    const host = await fixture<Breadcrumbs>(html`
      <ui-breadcrumbs
        .items=${[
          { label: 'ホーム', href: '/' },
          { label: 'プロジェクト', href: '/projects' },
          { label: '設定' },
        ]}
      ></ui-breadcrumbs>
    `);
    await waitForLitUpdate(host);

    const nav = host.shadowRoot?.querySelector<HTMLElement>('nav');
    const separators = host.shadowRoot?.querySelectorAll('.breadcrumb-separator ui-icon');
    const current = host.shadowRoot?.querySelector<HTMLElement>('[aria-current="page"]');

    expect(nav?.getAttribute('aria-label')).to.equal('パンくずリスト');
    expect(separators?.length).to.equal(2);
    expect(current?.textContent?.trim()).to.equal('設定');
  });

  it('items-json attribute からも項目を復元できること', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMediaMock(false);

    try {
      const host = await fixture<Breadcrumbs>(html`
        <ui-breadcrumbs
          items-json='[{"label":"ホーム","href":"/"},{"label":"Program","href":"/notes/program"},{"label":"JavaScriptの配列"}]'
          align="start"
        ></ui-breadcrumbs>
      `);
      await waitForLitUpdate(host);

      const nav = host.shadowRoot?.querySelector<HTMLElement>('nav');
      const current = host.shadowRoot?.querySelector<HTMLElement>('[aria-current="page"]');
      const firstLink = host.shadowRoot?.querySelector<HTMLAnchorElement>('.breadcrumb-link');

      expect(nav).to.not.equal(null);
      if (!nav) {
        throw new Error('nav should be rendered');
      }
      expect(getComputedStyle(nav).justifyContent).to.equal('flex-start');
      expect(firstLink?.textContent?.trim()).to.equal('ホーム');
      expect(firstLink?.getAttribute('href')).to.equal('/');
      expect(current?.textContent?.trim()).to.equal('JavaScriptの配列');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('desktop で maxItems を超えると ellipsis dropdown を挿入すること', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMediaMock(false);

    try {
      const host = await fixture<Breadcrumbs>(html`
        <ui-breadcrumbs max-items="4" .items=${BASE_ITEMS}></ui-breadcrumbs>
      `);
      await waitForLitUpdate(host);

      const renderedLabels = getRenderedLabels(host);
      const dropdown = host.shadowRoot?.querySelector('ui-dropdown');
      const menuItems = host.shadowRoot?.querySelectorAll('ui-menu-item');

      expect(renderedLabels).to.deep.equal(['ホーム', 'バックエンド', 'API', 'ユーザー管理']);
      expect(dropdown).to.not.equal(null);
      expect(menuItems?.length).to.equal(3);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('omit-root=true では desktop で先頭項目を描画しないこと', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMediaMock(false);

    try {
      const host = await fixture<Breadcrumbs>(html`
        <ui-breadcrumbs omit-root .items=${BASE_ITEMS}></ui-breadcrumbs>
      `);
      await waitForLitUpdate(host);

      const firstLabel = getRenderedLabels(host)[0];
      expect(firstLabel).to.equal('プロジェクト');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('狭幅相当でもパンくず DOM は描画され、縮約は CSS 契約に委ねること', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMediaMock(true);

    try {
      const host = await fixture<Breadcrumbs>(html`
        <ui-breadcrumbs .items=${BASE_ITEMS}></ui-breadcrumbs>
      `);
      await waitForLitUpdate(host);

      const renderedItems = host.shadowRoot?.querySelectorAll('.breadcrumb-item');
      const nav = host.shadowRoot?.querySelector('nav');
      const dropdown = host.shadowRoot?.querySelector('ui-dropdown');
      const current = host.shadowRoot?.querySelector<HTMLElement>('[aria-current="page"]');

      expect(nav).to.not.equal(null);
      expect(renderedItems?.length).to.equal(6);
      expect(dropdown).to.not.equal(null);
      expect(current?.textContent?.trim()).to.equal('ユーザー管理');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('ellipsis dropdown の選択は breadcrumb-navigate を cancelable で送出すること', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMediaMock(false);

    try {
      const host = await fixture<Breadcrumbs>(html`
        <ui-breadcrumbs max-items="4" .items=${BASE_ITEMS}></ui-breadcrumbs>
      `);
      await waitForLitUpdate(host);

      const dropdown = host.shadowRoot?.querySelector('ui-dropdown');
      expect(dropdown).to.not.equal(null);

      let navigateCount = 0;
      let navigatedHref = '';

      host.addEventListener('breadcrumb-navigate', (event: Event) => {
        const customEvent = event as CustomEvent<{ href: string }>;
        navigateCount += 1;
        navigatedHref = customEvent.detail.href;
        customEvent.preventDefault();
      });

      dropdown?.dispatchEvent(
        new CustomEvent<{ value: string; label: string }>('menu-item-select', {
          bubbles: true,
          composed: true,
          cancelable: true,
          detail: {
            value: '/projects/web',
            label: 'ウェブアプリ',
          },
        }),
      );

      expect(navigateCount).to.equal(1);
      expect(navigatedHref).to.equal('/projects/web');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
