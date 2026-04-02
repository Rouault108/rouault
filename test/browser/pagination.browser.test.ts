import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/pagination/pagination.js';
import type { Pagination } from '../../src/components/ui/pagination/pagination.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: Pagination): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

describe('ui-pagination browser contract', () => {
  it('regular mode は current / total を防御的に正規化し、href と aria-current を公開すること', async () => {
    const host = await fixture<Pagination>(html`
      <ui-pagination .current=${99} .total=${10} .getHref=${(page: number): string => `/notes?page=${String(page)}`}></ui-pagination>
    `);

    await flush(host);

    const currentPageLink = expectPresent(
      host.shadowRoot?.querySelector<HTMLAnchorElement>('a.page-btn[aria-current="page"]'),
      'current page link',
    );
    const prevLink = expectPresent(
      host.shadowRoot?.querySelector<HTMLAnchorElement>('a.nav-btn'),
      'prev link',
    );

    expect(currentPageLink.textContent?.trim()).to.equal('10');
    expect(currentPageLink.getAttribute('href')).to.equal('/notes?page=10');
    expect(currentPageLink.getAttribute('aria-label')).to.equal('現在のページ、10ページ');
    expect(prevLink.getAttribute('href')).to.equal('/notes?page=9');
  });

  it('single page は prev/next を disabled span で描画し、1ページのみを表示すること', async () => {
    const host = await fixture<Pagination>(html`
      <ui-pagination .current=${1} .total=${1}></ui-pagination>
    `);

    await flush(host);

    const disabledButtons = Array.from(
      host.shadowRoot?.querySelectorAll<HTMLElement>('.nav-btn[aria-disabled="true"]') ?? [],
    );
    const pageLinks = Array.from(host.shadowRoot?.querySelectorAll<HTMLAnchorElement>('a.page-btn') ?? []);

    expect(disabledButtons.length).to.equal(2);
    expect(pageLinks.length).to.equal(1);
    expect(pageLinks[0]?.textContent?.trim()).to.equal('1');
  });

  it('compact mode は ellipsis / current / ellipsis を表示し、境界では不要な ellipsis を出さないこと', async () => {
    const middle = await fixture<Pagination>(html`
      <ui-pagination .current=${5} .total=${10} mode="compact"></ui-pagination>
    `);

    await flush(middle);

    const middleEllipsis = Array.from(
      middle.shadowRoot?.querySelectorAll<HTMLElement>('.ellipsis') ?? [],
    );
    const middleCurrent = expectPresent(
      middle.shadowRoot?.querySelector<HTMLAnchorElement>('a.page-btn[aria-current="page"]'),
      'middle current page',
    );

    expect(middleEllipsis.length).to.equal(2);
    expect(middleCurrent.textContent?.trim()).to.equal('5');

    const edge = await fixture<Pagination>(html`
      <ui-pagination .current=${1} .total=${10} mode="compact"></ui-pagination>
    `);

    await flush(edge);

    const edgeEllipsis = Array.from(edge.shadowRoot?.querySelectorAll<HTMLElement>('.ellipsis') ?? []);
    const edgeCurrent = expectPresent(
      edge.shadowRoot?.querySelector<HTMLAnchorElement>('a.page-btn[aria-current="page"]'),
      'edge current page',
    );

    expect(edgeEllipsis.length).to.equal(1);
    expect(edgeCurrent.textContent?.trim()).to.equal('1');
  });
});
