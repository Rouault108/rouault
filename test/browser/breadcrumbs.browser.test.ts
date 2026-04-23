import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/breadcrumbs/breadcrumbs.js';
import type { Breadcrumbs } from '../../src/components/ui/breadcrumbs/breadcrumbs.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

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
    host.shadowRoot?.querySelectorAll<HTMLElement>('.breadcrumb-item .breadcrumb-node') ?? [],
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

  it('crumb role ごとに breadcrumb-node 基底と適切な class を持つこと', async () => {
    const host = await fixture<Breadcrumbs>(html`
      <ui-breadcrumbs
        .items=${[
          { label: 'Notes', href: '/' },
          { label: 'Program', href: '/notes/program' },
          { label: 'C#' },
          { label: 'ソースコードから実行まで' },
        ]}
      ></ui-breadcrumbs>
    `);
    await waitForLitUpdate(host);

    const nodes = Array.from(
      host.shadowRoot?.querySelectorAll<HTMLElement>('.breadcrumb-item .breadcrumb-node') ?? [],
    );

    expect(nodes.map((node) => node.textContent?.trim())).to.deep.equal([
      'Notes',
      'Program',
      'C#',
      'ソースコードから実行まで',
    ]);
    expect(nodes[0]?.tagName).to.equal('A');
    expect(nodes[0]?.classList.contains('breadcrumb-link')).to.equal(true);
    expect(nodes[1]?.tagName).to.equal('A');
    expect(nodes[1]?.classList.contains('breadcrumb-link')).to.equal(true);
    expect(nodes[2]?.tagName).to.equal('SPAN');
    expect(nodes[2]?.classList.contains('breadcrumb-static')).to.equal(true);
    expect(nodes[2]?.classList.contains('breadcrumb-link')).to.equal(false);
    expect(nodes[3]?.tagName).to.equal('SPAN');
    expect(nodes[3]?.classList.contains('breadcrumb-current')).to.equal(true);
    expect(nodes[3]?.getAttribute('aria-current')).to.equal('page');
  });

  it('同じラベルでも role 差で開始位置がずれないこと', async () => {
    const container = await fixture<HTMLDivElement>(html`
      <div>
        <ui-breadcrumbs
          id="current"
          .items=${[
            { label: 'Notes', href: '/' },
            { label: 'Program', href: '/notes/program' },
            { label: 'C#' },
          ]}
        ></ui-breadcrumbs>
        <ui-breadcrumbs
          id="link"
          .items=${[
            { label: 'Notes', href: '/' },
            { label: 'Program', href: '/notes/program' },
            { label: 'C#', href: '/notes/program/csharp' },
            { label: 'ソースコードから実行まで' },
          ]}
        ></ui-breadcrumbs>
      </div>
    `);

    const currentHost = container.querySelector<Breadcrumbs>('#current');
    const linkHost = container.querySelector<Breadcrumbs>('#link');

    expect(currentHost).to.not.equal(null);
    expect(linkHost).to.not.equal(null);
    if (!currentHost || !linkHost) {
      throw new Error('comparison hosts should be rendered');
    }

    await waitForLitUpdate(currentHost);
    await waitForLitUpdate(linkHost);

    const readRelativeLeft = (host: Breadcrumbs, label: string): number => {
      const nodes = Array.from(
        host.shadowRoot?.querySelectorAll<HTMLElement>('.breadcrumb-item .breadcrumb-node') ?? [],
      );
      const node = nodes.find((candidate) => candidate.textContent?.trim() === label);
      const item = node?.closest<HTMLElement>('.breadcrumb-item');

      expect(node).to.not.equal(undefined);
      expect(item).to.not.equal(null);
      if (!node || !item) {
        throw new Error(`breadcrumb node for ${label} should exist`);
      }

      const nodeRect = node.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      return nodeRect.left - itemRect.left;
    };

    const currentOffset = readRelativeLeft(currentHost, 'C#');
    const linkOffset = readRelativeLeft(linkHost, 'C#');

    expect(Math.abs(currentOffset - linkOffset)).to.be.lessThanOrEqual(0.5);
  });
});
