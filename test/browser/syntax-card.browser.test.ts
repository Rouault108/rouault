import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/syntax-card/syntax-card.js';
import '../../src/components/ui/syntax-card/syntax-section.js';
import '../../src/components/ui/syntax-field/syntax-field.js';
import type { SyntaxCard } from '../../src/components/ui/syntax-card/syntax-card.js';
import type { SyntaxSection } from '../../src/components/ui/syntax-card/syntax-section.js';
import type { CopyButton } from '../../src/components/ui/copy-button/copy-button.js';
import { nextAnimationFrame, waitForLitUpdate } from './helpers/wait-for-lit.js';

const getHeading = (card: SyntaxCard): HTMLElement | null =>
  card.shadowRoot?.querySelector<HTMLElement>('.name') ?? null;

const getCopyButton = (card: SyntaxCard): CopyButton | null =>
  (card.shadowRoot?.querySelector('ui-copy-button.copy-action') as CopyButton | null) ?? null;

const getSignatureArea = (card: SyntaxCard): HTMLElement | null =>
  card.shadowRoot?.querySelector<HTMLElement>('.signature-area') ?? null;

const getContentArea = (card: SyntaxCard): HTMLElement | null =>
  card.shadowRoot?.querySelector<HTMLElement>('.content-area') ?? null;

const getKindTag = (card: SyntaxCard): HTMLElement | null =>
  card.shadowRoot?.querySelector<HTMLElement>('.kind-tag') ?? null;

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const assertCopyDisabled = (card: SyntaxCard, reason: string): void => {
  const copyButton = expectPresent(getCopyButton(card), `${reason} copyButton`);

  expect(copyButton.hasAttribute('disabled'), `${reason} disabled`).to.equal(true);
  expect(copyButton.getAttribute('aria-disabled'), `${reason} aria-disabled`).to.equal('true');
  expect(copyButton.getAttribute('tabindex'), `${reason} tabindex`).to.equal('-1');
  expect(copyButton.value, `${reason} value`).to.equal('');

  const innerButton = copyButton.shadowRoot?.querySelector('ui-button');
  expect(innerButton, `${reason} inner button`).to.not.equal(null);
  expect(innerButton?.hasAttribute('disabled'), `${reason} inner disabled`).to.equal(true);
};

describe('ui-syntax-card browser contract', () => {
  it('method + members + returns を公開 DOM / copy state で表現すること', async () => {
    const card = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="フック" name="useEffect" data-lang="ts" heading-level="3">
        <pre slot="signature"><code>function useEffect(effect: () => void): void</code></pre>

        <ui-syntax-section label="パラメータ">
          <dl>
            <ui-syntax-field name="effect" type="() =&gt; void" required>
              effect 関数。
            </ui-syntax-field>
            <ui-syntax-field name="deps" type="readonly unknown[]"> 依存配列。 </ui-syntax-field>
          </dl>
        </ui-syntax-section>

        <ui-syntax-section label="戻り値">
          <p>void。</p>
        </ui-syntax-section>
      </ui-syntax-card>
    `);

    await waitForLitUpdate(card);
    await nextAnimationFrame();

    const kindTag = expectPresent(getKindTag(card), 'kindTag');
    const heading = expectPresent(getHeading(card), 'heading');
    const copyButton = expectPresent(getCopyButton(card), 'copyButton');

    expect(card.hasAttribute('data-content-empty')).to.equal(false);
    expect(kindTag.textContent?.trim()).to.equal('フック');
    expect(heading.tagName).to.equal('H3');
    expect(heading.textContent?.trim()).to.equal('useEffect');

    const sections = card.querySelectorAll<SyntaxSection>('ui-syntax-section');
    expect(sections.length).to.equal(2);
    expect(sections[0]?.label).to.equal('パラメータ');
    expect(sections[1]?.label).to.equal('戻り値');

    const syntaxFields = card.querySelectorAll('ui-syntax-field');
    expect(syntaxFields.length).to.equal(2);

    expect(copyButton.getAttribute('aria-disabled')).to.equal('false');
    expect(copyButton.hasAttribute('disabled')).to.equal(false);
    expect(copyButton.value).to.contain('function useEffect');
    expect(copyButton.label).to.equal('useEffect のコードをコピー');
  });

  it('single section / default-only / empty content を安全に扱うこと', async () => {
    const singleSection = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="Query" name="SELECT">
        <pre slot="signature"><code>SELECT * FROM users;</code></pre>
        <ui-syntax-section label="戻り値">
          <p>一致する行。</p>
        </ui-syntax-section>
      </ui-syntax-card>
    `);

    const defaultOnly = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="Struct" name="Article" data-lang="ts">
        <pre slot="signature"><code>type Article = { id: string };</code></pre>
        <ui-syntax-section label="プロパティ">
          <dl>
            <ui-syntax-field name="id" type="string" required>識別子</ui-syntax-field>
          </dl>
        </ui-syntax-section>
      </ui-syntax-card>
    `);

    const emptyContent = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="Struct" name="User">
        <pre slot="signature"><code>type User = { id: string };</code></pre>
      </ui-syntax-card>
    `);

    await Promise.all([
      waitForLitUpdate(singleSection),
      waitForLitUpdate(defaultOnly),
      waitForLitUpdate(emptyContent),
    ]);
    await nextAnimationFrame();

    expect(singleSection.hasAttribute('data-content-empty')).to.equal(false);
    expect(defaultOnly.hasAttribute('data-content-empty')).to.equal(false);
    expect(emptyContent.hasAttribute('data-content-empty')).to.equal(true);

    expect(singleSection.querySelectorAll('ui-syntax-section').length).to.equal(1);
    expect(defaultOnly.querySelectorAll('ui-syntax-section').length).to.equal(1);
    expect(defaultOnly.querySelectorAll('ui-syntax-field').length).to.equal(1);

    const emptyContentArea = expectPresent(getContentArea(emptyContent), 'emptyContentArea');
    const emptySignatureArea = expectPresent(getSignatureArea(emptyContent), 'emptySignatureArea');

    expect(getComputedStyle(emptyContentArea).display).to.equal('none');

    const signatureStyle = getComputedStyle(emptySignatureArea);
    const borderRemoved =
      signatureStyle.borderBottomStyle === 'none' || signatureStyle.borderBottomWidth === '0px';
    expect(borderRemoved).to.equal(true);
  });

  it('heading-level fallback と data-lang 反映を行うこと', async () => {
    const valid = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="Method" name="parse" heading-level="2" data-lang="ts">
        <pre slot="signature"><code>function parse(input: string): Ast</code></pre>
      </ui-syntax-card>
    `);

    const invalid = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="Method" name="broken" heading-level="9" data-lang="sql">
        <pre slot="signature"><code>SELECT * FROM posts;</code></pre>
      </ui-syntax-card>
    `);

    await Promise.all([waitForLitUpdate(valid), waitForLitUpdate(invalid)]);
    await nextAnimationFrame();

    expect(expectPresent(getHeading(valid), 'validHeading').tagName).to.equal('H2');
    expect(expectPresent(getHeading(invalid), 'invalidHeading').tagName).to.equal('H4');

    expect(valid.getAttribute('data-lang')).to.equal('ts');
    expect(invalid.getAttribute('data-lang')).to.equal('sql');

    valid.lang = 'rust';
    await waitForLitUpdate(valid);
    await nextAnimationFrame();

    expect(valid.getAttribute('data-lang')).to.equal('rust');
  });

  it('copy failure isolation と disabled 伝播を行うこと', async () => {
    const noPre = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="Method" name="fetchData">
        <p slot="signature">pre なし</p>
      </ui-syntax-card>
    `);

    const multiPre = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="Method" name="duplicate">
        <pre slot="signature"><code>const a = 1;</code></pre>
        <pre slot="signature"><code>const b = 2;</code></pre>
      </ui-syntax-card>
    `);

    const emptyPre = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="Method" name="blank">
        <pre slot="signature"><code>   </code></pre>
      </ui-syntax-card>
    `);

    const copyDisabled = await fixture<SyntaxCard>(html`
      <ui-syntax-card kind="Method" name="noop">
        <p slot="signature">pre なし</p>
      </ui-syntax-card>
    `);

    await Promise.all([
      waitForLitUpdate(noPre),
      waitForLitUpdate(multiPre),
      waitForLitUpdate(emptyPre),
      waitForLitUpdate(copyDisabled),
    ]);
    await nextAnimationFrame();

    expect(multiPre.querySelectorAll('pre[slot="signature"]').length).to.equal(2);

    assertCopyDisabled(noPre, 'pre 0件');
    assertCopyDisabled(multiPre, 'pre 複数件');
    assertCopyDisabled(emptyPre, '空コード');
    assertCopyDisabled(copyDisabled, 'disabled propagation');
  });
});
