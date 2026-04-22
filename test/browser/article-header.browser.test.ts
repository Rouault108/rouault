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

const measureVerticalGap = (upper: Element, lower: Element): number => {
  const upperRect = upper.getBoundingClientRect();
  const lowerRect = lower.getBoundingClientRect();
  return lowerRect.top - upperRect.bottom;
};

const measureContainerEndGap = (container: Element, lastChild: Element): number => {
  const containerRect = container.getBoundingClientRect();
  const lastChildRect = lastChild.getBoundingClientRect();
  return containerRect.bottom - lastChildRect.bottom;
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

  it('フル構成でタイトル直下のみ一段広い縦方向リズムになること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 720px;">
        <ui-article-header
          heading="バッハ《マタイ受難曲》の構造美"
          published="2026-04-19"
          source="https://example.com/source"
          license="CC BY 4.0"
          .tags=${['音楽', 'バッハ']}
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
    const primary = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.metadata-list--primary'),
      'primary',
    );
    const tags = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.tags-row'),
      'tags',
    );
    const secondary = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.metadata-list--secondary'),
      'secondary',
    );
    const header = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.article-header'),
      'header',
    );

    const titleToPrimary = measureVerticalGap(heading, primary);
    const primaryToTags = measureVerticalGap(primary, tags);
    const tagsToSecondary = measureVerticalGap(tags, secondary);
    const secondaryToHeaderEnd = measureContainerEndGap(header, secondary);

    expect(titleToPrimary).to.be.at.least(18);
    expect(titleToPrimary).to.be.at.most(22);

    expect(primaryToTags).to.be.at.least(10);
    expect(primaryToTags).to.be.at.most(14);

    expect(tagsToSecondary).to.be.at.least(10);
    expect(tagsToSecondary).to.be.at.most(14);

    expect(secondaryToHeaderEnd).to.be.at.least(11);
    expect(secondaryToHeaderEnd).to.be.at.most(14);

    expect(titleToPrimary).to.be.greaterThan(primaryToTags);
  });

  it('主要メタデータがない場合はタイトルとタグの間が16px前後になり、タグと下端罫線の距離が12px前後になること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 720px;">
        <ui-article-header
          heading="タグのみのケース"
          .tags=${['設計', 'UI']}
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
    const tags = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.tags-row'),
      'tags',
    );
    const header = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.article-header'),
      'header',
    );

    const headingToTags = measureVerticalGap(heading, tags);
    const tagsToHeaderEnd = measureContainerEndGap(header, tags);

    expect(headingToTags).to.be.at.least(14);
    expect(headingToTags).to.be.at.most(18);

    expect(tagsToHeaderEnd).to.be.at.least(11);
    expect(tagsToHeaderEnd).to.be.at.most(14);
  });

  it('主要メタデータもタグもない場合はタイトルと補助メタデータの間が16px前後になり、補助メタデータと下端罫線の距離が12px前後になること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 720px;">
        <ui-article-header
          heading="補助メタデータのみのケース"
          source="https://example.com/source"
          license="CC BY 4.0"
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
    const secondary = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.metadata-list--secondary'),
      'secondary',
    );
    const header = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.article-header'),
      'header',
    );

    const headingToSecondary = measureVerticalGap(heading, secondary);
    const secondaryToHeaderEnd = measureContainerEndGap(header, secondary);

    expect(headingToSecondary).to.be.at.least(14);
    expect(headingToSecondary).to.be.at.most(18);

    expect(secondaryToHeaderEnd).to.be.at.least(11);
    expect(secondaryToHeaderEnd).to.be.at.most(14);
  });

  it('タグがない場合もタイトル直下の主要メタデータだけが一段広く、補助メタデータとの間は12px前後で、末尾の下端距離も12px前後になること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div style="inline-size: 720px;">
        <ui-article-header
          heading="主要メタデータと補助メタデータのケース"
          published="2026-04-19"
          source="https://example.com/source"
          license="CC BY 4.0"
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
    const primary = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.metadata-list--primary'),
      'primary',
    );
    const secondary = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.metadata-list--secondary'),
      'secondary',
    );
    const header = expectPresent(
      host.shadowRoot?.querySelector<HTMLElement>('.article-header'),
      'header',
    );

    const titleToPrimary = measureVerticalGap(heading, primary);
    const primaryToSecondary = measureVerticalGap(primary, secondary);
    const secondaryToHeaderEnd = measureContainerEndGap(header, secondary);

    expect(titleToPrimary).to.be.at.least(18);
    expect(titleToPrimary).to.be.at.most(22);

    expect(primaryToSecondary).to.be.at.least(10);
    expect(primaryToSecondary).to.be.at.most(14);

    expect(secondaryToHeaderEnd).to.be.at.least(11);
    expect(secondaryToHeaderEnd).to.be.at.most(14);

    expect(titleToPrimary).to.be.greaterThan(primaryToSecondary);
  });
});