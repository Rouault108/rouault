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
  it('name 属性から glyph を解決すること', async () => {
    const icon = await fixture<UiIconElement>(
      html`<ui-icon name="calendar-clock" aria-hidden="true"></ui-icon>`,
    );

    const glyph = must(
      icon.shadowRoot?.querySelector<HTMLElement>('iconify-icon'),
      'iconify-icon が見つかりません',
    );

    expect(glyph.getAttribute('icon')).to.equal('lucide:calendar-clock');
    expect(icon.style.display).to.equal('inline-flex');
  });

  it('icon 属性だけでは glyph を表示しないこと', async () => {
    const icon = await fixture<UiIconElement>(html`<ui-icon icon="calendar-clock"></ui-icon>`);

    const glyph = must(
      icon.shadowRoot?.querySelector<HTMLElement>('iconify-icon'),
      'iconify-icon が見つかりません',
    );

    expect(glyph.getAttribute('icon')).to.equal(null);
    expect(icon.style.display).to.equal('none');
  });
});
