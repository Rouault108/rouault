import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/icon/icon.js';
import type { UiIconElement } from '../../src/components/ui/icon/icon.js';

const must = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
};

describe('ui-icon browser contract', () => {
  it('name 属性から glyph を解決し、host presentation を inline style へ直書きしないこと', async () => {
    const icon = await fixture<UiIconElement>(html`<ui-icon name="calendar-clock"></ui-icon>`);

    const glyph = must(
      icon.shadowRoot?.querySelector<HTMLElement>('iconify-icon'),
      'iconify-icon が見つかりません',
    );

    expect(glyph.getAttribute('icon')).to.equal('lucide:calendar-clock');
    expect(icon.getAttribute('data-icon-state')).to.equal(null);
    expect(icon.style.display).to.equal('');
    expect(getComputedStyle(icon).display).to.equal('inline-flex');
  });

  it('name が空のときは empty state を反映し、a11y cleanup を行うこと', async () => {
    const icon = await fixture<UiIconElement>(
      html`<ui-icon name="" aria-label="予定"></ui-icon>`,
    );

    const glyph = must(
      icon.shadowRoot?.querySelector<HTMLElement>('iconify-icon'),
      'iconify-icon が見つかりません',
    );

    expect(icon.getAttribute('data-icon-state')).to.equal('empty');
    expect(getComputedStyle(icon).display).to.equal('none');
    expect(icon.style.display).to.equal('');
    expect(icon.getAttribute('role')).to.equal(null);
    expect(glyph.getAttribute('icon')).to.equal(null);
    expect(glyph.getAttribute('aria-hidden')).to.equal('true');
    expect(glyph.getAttribute('aria-label')).to.equal(null);
  });

  it('invalid name のときは invalid state を反映し、描画しないこと', async () => {
    const icon = await fixture<UiIconElement>(
      html`<ui-icon name="not-in-catalog" aria-label="不正"></ui-icon>`,
    );

    const glyph = must(
      icon.shadowRoot?.querySelector<HTMLElement>('iconify-icon'),
      'iconify-icon が見つかりません',
    );

    expect(icon.getAttribute('data-icon-state')).to.equal('invalid');
    expect(getComputedStyle(icon).display).to.equal('none');
    expect(icon.style.display).to.equal('');
    expect(icon.getAttribute('role')).to.equal(null);
    expect(glyph.getAttribute('icon')).to.equal(null);
    expect(glyph.getAttribute('aria-hidden')).to.equal('true');
    expect(glyph.getAttribute('aria-label')).to.equal(null);
  });

  it('icon 属性だけでは glyph を表示しないこと', async () => {
    const icon = await fixture<UiIconElement>(html`<ui-icon icon="calendar-clock"></ui-icon>`);

    const glyph = must(
      icon.shadowRoot?.querySelector<HTMLElement>('iconify-icon'),
      'iconify-icon が見つかりません',
    );

    expect(icon.getAttribute('data-icon-state')).to.equal('empty');
    expect(glyph.getAttribute('icon')).to.equal(null);
    expect(glyph.getAttribute('aria-hidden')).to.equal('true');
    expect(glyph.getAttribute('aria-label')).to.equal(null);
    expect(icon.style.display).to.equal('');
    expect(getComputedStyle(icon).display).to.equal('none');
  });
});