import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/article-header/article-header.js';
import type { ArticleHeader } from '../../src/components/ui/article-header/article-header.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const flush = async (host: ArticleHeader): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

describe('ui-article-header browser contract', () => {
  it('主要メタデータ行と補助メタデータ行が主見出しに対して小さな開始インセットで光学整列されること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 720px;">
        <ui-article-header
          heading="C#とは何か"
          published="2026-04-19"
          source="https://example.com/source"
          license="CC BY 4.0"
          .tags=${['C#', 'Programming']}
          .readingTime=${8}
        ></ui-article-header>
      </div>
    `);

    const host = expectPresent(
      wrapper.querySelector<ArticleHeader>('ui-article-header'),
      'articleHeader',
    );
    await flush(host);

    const heading = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.heading'),
      'heading',
    );
    const primaryFirstItem = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.metadata-list--primary .metadata-item'),
      'primaryFirstItem',
    );
    const secondaryFirstItem = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.metadata-list--secondary .metadata-item'),
      'secondaryFirstItem',
    );

    const headingLeft = heading.getBoundingClientRect().left;
    const primaryLeft = primaryFirstItem.getBoundingClientRect().left;
    const secondaryLeft = secondaryFirstItem.getBoundingClientRect().left;

    const primaryOffset = primaryLeft - headingLeft;
    const secondaryOffset = secondaryLeft - headingLeft;

    expect(primaryOffset).to.be.at.least(3);
    expect(primaryOffset).to.be.lessThan(9);

    expect(secondaryOffset).to.be.at.least(3);
    expect(secondaryOffset).to.be.lessThan(9);

    expect(Math.abs(primaryOffset - secondaryOffset)).to.be.lessThan(1);
  });
});