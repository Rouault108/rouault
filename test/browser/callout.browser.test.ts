import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/callout/callout.js';
import type { Callout } from '../../src/components/ui/callout/callout.js';
import { waitForLitUpdate } from './helpers/wait-for-lit.js';

const FALLBACK_LABELS = {
  note: '補足',
  tip: 'ヒント',
  success: '成功',
  warning: '警告',
  danger: '危険',
} as const;

const DEFAULT_ICONS = {
  note: 'info',
  tip: 'lightbulb',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-octagon',
} as const;

const getRoot = (callout: Callout): HTMLElement | null =>
  callout.shadowRoot?.querySelector<HTMLElement>('aside.callout') ?? null;

const getHeading = (callout: Callout): HTMLElement | null =>
  callout.shadowRoot?.querySelector<HTMLElement>('.heading') ?? null;

const getBody = (callout: Callout): HTMLElement | null =>
  callout.shadowRoot?.querySelector<HTMLElement>('.body') ?? null;

const getIcon = (callout: Callout): HTMLElement | null =>
  callout.shadowRoot?.querySelector<HTMLElement>('ui-icon.icon') ?? null;

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

describe('ui-callout browser contract', () => {
  it('heading がある場合は aria-labelledby / heading role / part を公開すること', async () => {
    const callout = await fixture<Callout>(html`
      <ui-callout kind="tip" heading="読書のヒント" heading-level="3">
        本文です。
      </ui-callout>
    `);

    await waitForLitUpdate(callout);

    const root = expectPresent(getRoot(callout), 'root');
    const heading = expectPresent(getHeading(callout), 'heading');
    const body = expectPresent(getBody(callout), 'body');
    const icon = expectPresent(getIcon(callout), 'icon');

    expect(root.getAttribute('data-kind')).to.equal('tip');
    expect(root.getAttribute('aria-labelledby')).to.equal(heading.id);
    expect(root.hasAttribute('aria-label')).to.equal(false);

    expect(heading.getAttribute('role')).to.equal('heading');
    expect(heading.getAttribute('aria-level')).to.equal('3');
    expect(heading.textContent?.trim()).to.equal('読書のヒント');

    expect(root.getAttribute('part')).to.equal('container');
    expect(body.getAttribute('part')).to.equal('body');
    expect(heading.getAttribute('part')).to.equal('heading');
    expect(icon.getAttribute('part')).to.equal('icon');
    expect(icon.getAttribute('name')).to.equal(DEFAULT_ICONS.tip);
    expect(icon.getAttribute('aria-hidden')).to.equal('true');
  });

  it('kind ごとの fallback label / default icon を heading なしの公開 DOM に反映すること', async () => {
    const kinds = ['note', 'tip', 'success', 'warning', 'danger'] as const;

    for (const kind of kinds) {
      const callout = await fixture<Callout>(html`
        <ui-callout kind="${kind}">kind=${kind}</ui-callout>
      `);

      await waitForLitUpdate(callout);

      const root = expectPresent(getRoot(callout), `root(${kind})`);
      const icon = expectPresent(getIcon(callout), `icon(${kind})`);

      expect(root.hasAttribute('aria-labelledby')).to.equal(false);
      expect(root.getAttribute('aria-label')).to.equal(FALLBACK_LABELS[kind]);
      expect(root.getAttribute('data-kind')).to.equal(kind);
      expect(icon.getAttribute('name')).to.equal(DEFAULT_ICONS[kind]);
      expect(icon.getAttribute('aria-hidden')).to.equal('true');
    }
  });

  it('heading-level の境界、label 優先、invalid kind 正規化を公開 DOM で観測できること', async () => {
    const valid = await fixture<Callout>(html`
      <ui-callout kind="note" heading="有効" heading-level="1">valid</ui-callout>
    `);
    const invalid = await fixture<Callout>(html`
      <ui-callout kind="unknown" heading="無効" heading-level="9" label="明示ラベル" icon="music">
        invalid
      </ui-callout>
    `);

    await Promise.all([waitForLitUpdate(valid), waitForLitUpdate(invalid)]);

    const validHeading = expectPresent(getHeading(valid), 'validHeading');
    expect(validHeading.getAttribute('role')).to.equal('heading');
    expect(validHeading.getAttribute('aria-level')).to.equal('1');

    const invalidRoot = expectPresent(getRoot(invalid), 'invalidRoot');
    const invalidHeading = expectPresent(getHeading(invalid), 'invalidHeading');
    const invalidIcon = expectPresent(getIcon(invalid), 'invalidIcon');

    expect(invalid.kind).to.equal('note');
    expect(invalid.getAttribute('kind')).to.equal('note');
    expect(invalidRoot.getAttribute('data-kind')).to.equal('note');
    expect(invalidHeading.hasAttribute('role')).to.equal(false);
    expect(invalidHeading.hasAttribute('aria-level')).to.equal(false);
    expect(invalidRoot.getAttribute('aria-labelledby')).to.equal(invalidHeading.id);
    expect(invalidRoot.hasAttribute('aria-label')).to.equal(false);
    expect(invalidIcon.getAttribute('name')).to.equal('music');

    invalid.heading = '';
    await waitForLitUpdate(invalid);

    expect(invalidRoot.getAttribute('aria-label')).to.equal('明示ラベル');
    expect(invalidRoot.hasAttribute('aria-labelledby')).to.equal(false);
  });
});