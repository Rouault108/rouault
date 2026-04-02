import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/info-box/info-box.js';
import type { InfoBox } from '../../src/components/ui/info-box/info-box.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

const getContainer = (host: InfoBox): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.info-box') ?? null;

const getHeader = (host: InfoBox): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.header') ?? null;

const getHeading = (host: InfoBox): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.heading') ?? null;

const getBody = (host: InfoBox): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('.body') ?? null;

const getIcon = (host: InfoBox): HTMLElement | null =>
  host.shadowRoot?.querySelector<HTMLElement>('ui-icon.icon') ?? null;

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

describe('ui-info-box browser contract', () => {
  it('heading + landmark + heading-level が region / aria-labelledby / heading semantics を公開すること', async () => {
    const infoBox = await fixture<InfoBox>(html`
      <ui-info-box heading="作品情報" icon="music" heading-level="3" landmark variant="filled">
        本文です。
      </ui-info-box>
    `);

    await waitForLitUpdate(infoBox);

    const container = expectPresent(getContainer(infoBox), 'container');
    const header = expectPresent(getHeader(infoBox), 'header');
    const heading = expectPresent(getHeading(infoBox), 'heading');
    const body = expectPresent(getBody(infoBox), 'body');
    const icon = expectPresent(getIcon(infoBox), 'icon');

    expect(infoBox.getAttribute('role')).to.equal('region');
    expect(infoBox.getAttribute('aria-labelledby')).to.equal(heading.id);

    expect(container.getAttribute('data-variant')).to.equal('filled');
    expect(container.getAttribute('data-density')).to.equal('comfortable');

    expect(heading.getAttribute('role')).to.equal('heading');
    expect(heading.getAttribute('aria-level')).to.equal('3');
    expect(heading.textContent?.trim()).to.equal('作品情報');

    expect(icon.getAttribute('name')).to.equal('music');
    expect(icon.getAttribute('aria-hidden')).to.equal('true');

    expect(header.textContent?.includes('作品情報')).to.equal(true);
    expect(body.textContent?.includes('本文です。')).to.equal(true);
  });

  it('variant / density / icon rendering の違いを公開 DOM で観測できること', async () => {
    const comfortable = await fixture<InfoBox>(html`
      <ui-info-box heading="Comfortable" density="comfortable" landmark>comfortable</ui-info-box>
    `);
    const compact = await fixture<InfoBox>(html`
      <ui-info-box heading="Compact" density="compact" landmark>compact</ui-info-box>
    `);
    const filled = await fixture<InfoBox>(html`
      <ui-info-box heading="Filled" variant="filled">filled</ui-info-box>
    `);
    const noHeadingIcon = await fixture<InfoBox>(html`
      <ui-info-box icon="music">no heading</ui-info-box>
    `);

    await Promise.all([
      waitForLitUpdate(comfortable),
      waitForLitUpdate(compact),
      waitForLitUpdate(filled),
      waitForLitUpdate(noHeadingIcon),
    ]);

    const comfortableContainer = expectPresent(getContainer(comfortable), 'comfortableContainer');
    const compactContainer = expectPresent(getContainer(compact), 'compactContainer');
    const comfortableHeader = expectPresent(getHeader(comfortable), 'comfortableHeader');
    const compactHeader = expectPresent(getHeader(compact), 'compactHeader');
    const comfortableBody = expectPresent(getBody(comfortable), 'comfortableBody');
    const compactBody = expectPresent(getBody(compact), 'compactBody');
    const filledContainer = expectPresent(getContainer(filled), 'filledContainer');

    expect(comfortableContainer.getAttribute('data-density')).to.equal('comfortable');
    expect(compactContainer.getAttribute('data-density')).to.equal('compact');
    expect(filledContainer.getAttribute('data-variant')).to.equal('filled');

    const comfortableHeaderTop = Number.parseFloat(getComputedStyle(comfortableHeader).paddingTop);
    const compactHeaderTop = Number.parseFloat(getComputedStyle(compactHeader).paddingTop);
    const comfortableBodyTop = Number.parseFloat(getComputedStyle(comfortableBody).paddingTop);
    const compactBodyTop = Number.parseFloat(getComputedStyle(compactBody).paddingTop);

    expect(compactHeaderTop).to.be.lessThan(comfortableHeaderTop);
    expect(compactBodyTop).to.be.lessThan(comfortableBodyTop);

    expect(getIcon(noHeadingIcon)).to.equal(null);
  });

  it('invalid variant / invalid density / empty slot / landmark without valid heading を安全に処理すること', async () => {
    const invalidVariant = await fixture<InfoBox>(html`
      <ui-info-box variant="unknown" heading="不正 variant">body</ui-info-box>
    `);
    const invalidDensity = await fixture<InfoBox>(html`
      <ui-info-box density="unknown" heading="不正 density">body</ui-info-box>
    `);
    const empty = await fixture<InfoBox>(html`<ui-info-box></ui-info-box>`);
    const whitespaceOnly = await fixture<InfoBox>(html`<ui-info-box> </ui-info-box>`);
    const noHeadingLandmark = await fixture<InfoBox>(html`
      <ui-info-box landmark>body</ui-info-box>
    `);

    await Promise.all([
      waitForLitUpdate(invalidVariant),
      waitForLitUpdate(invalidDensity),
      waitForLitUpdate(empty),
      waitForLitUpdate(whitespaceOnly),
      waitForLitUpdate(noHeadingLandmark),
    ]);

    expect(expectPresent(getContainer(invalidVariant), 'invalidVariantContainer').getAttribute('data-variant')).to.equal('default');
    expect(expectPresent(getContainer(invalidDensity), 'invalidDensityContainer').getAttribute('data-density')).to.equal('comfortable');

    expect(empty.shadowRoot?.querySelector('.info-box')).to.equal(null);
    expect(whitespaceOnly.shadowRoot?.querySelector('.info-box')).to.equal(null);
    expect(empty.hasAttribute('role')).to.equal(false);
    expect(empty.hasAttribute('aria-labelledby')).to.equal(false);
    expect(whitespaceOnly.hasAttribute('role')).to.equal(false);
    expect(whitespaceOnly.hasAttribute('aria-labelledby')).to.equal(false);

    expect(noHeadingLandmark.getAttribute('role')).to.equal(null);
    expect(noHeadingLandmark.getAttribute('aria-labelledby')).to.equal(null);
  });
});