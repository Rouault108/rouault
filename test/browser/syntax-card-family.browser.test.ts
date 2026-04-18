import { expect, fixture, html } from '@open-wc/testing';

import '../../src/components/ui/syntax-card/syntax-card.js';
import type { SyntaxCard } from '../../src/components/ui/syntax-card/syntax-card.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/gu, ' ').trim();

describe('ui-syntax-card family registration browser contract', () => {
  it('syntax-card import だけで family 全体が登録されること', () => {
    expect(customElements.get('ui-syntax-card')).to.not.equal(undefined);
    expect(customElements.get('ui-syntax-section')).to.not.equal(undefined);
    expect(customElements.get('ui-syntax-field')).to.not.equal(undefined);
  });

  it('plain pre signature と field family を追加 import なしで描画できること', async () => {
    const card = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="Method" name="useEffect" data-lang="ts" heading-level="3">
        <pre slot="signature" data-syntax-signature="true">function useEffect(): void</pre>

        <ui-syntax-section label="パラメータ">
          <dl>
            <ui-syntax-field name="effect" type="() =&gt; void" required>
              副作用本体です。
            </ui-syntax-field>
          </dl>
        </ui-syntax-section>
      </ui-syntax-card>
    `);

    await waitForLitUpdate(card);
    await nextAnimationFrame();
    await nextAnimationFrame();

    const cardHeading = card.shadowRoot?.querySelector<HTMLElement>('.name');
    const cardCopyButton = card.shadowRoot?.querySelector('ui-copy-button.copy-action');
    const signaturePre = card.querySelector<HTMLPreElement>('pre[slot="signature"]');
    const section = card.querySelector<HTMLElement>('ui-syntax-section');
    const field = card.querySelector<HTMLElement>('ui-syntax-field');

    expect(card.shadowRoot).to.not.equal(null);
    expect(cardHeading?.textContent?.trim()).to.equal('useEffect');
    expect(cardCopyButton).to.not.equal(null);

    expect(signaturePre).to.not.equal(null);
    expect(signaturePre?.querySelector('code')).to.equal(null);

    expect(section).to.not.equal(null);
    expect(section?.shadowRoot).to.not.equal(null);
    expect(
      section?.shadowRoot?.querySelector<HTMLElement>('.section-title')?.textContent?.trim(),
    ).to.equal('パラメータ');

    expect(field).to.not.equal(null);
    expect(field?.querySelector('.field-wrapper')).to.not.equal(null);
    expect(normalizeText(field?.querySelector('dt.field-term')?.textContent)).to.contain('effect');
    expect(normalizeText(field?.querySelector('dt.field-term')?.textContent)).to.contain(
      '() => void',
    );
    expect(normalizeText(field?.querySelector('dd.field-description')?.textContent)).to.equal(
      '副作用本体です。',
    );
  });
});
