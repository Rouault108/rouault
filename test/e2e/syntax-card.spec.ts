import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const codePath = e2eNoteFixtures.code.directPath;

interface SyntaxCardState {
  hostExists: boolean;
  hostShadowRoot: boolean;
  headingText: string;
  copyButtonExists: boolean;
  signaturePreExists: boolean;
  signatureCodeChildExists: boolean;
  signatureWrappedAsCodeBlock: boolean;
  firstSectionShadowRoot: boolean;
  firstSectionTitle: string;
  firstFieldWrapperExists: boolean;
  firstFieldTermText: string;
  firstFieldDescriptionText: string;
}

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/gu, ' ').trim();

const waitForFirstSyntaxCardHydrated = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const normalize = (value: string | null | undefined): string =>
      (value ?? '').replace(/\s+/gu, ' ').trim();

    const card = document.querySelector<HTMLElement>('ui-syntax-card');
    const section = card?.querySelector<HTMLElement>('ui-syntax-section') ?? null;
    const field = card?.querySelector<HTMLElement>('ui-syntax-field') ?? null;

    const cardName = normalize(
      card?.shadowRoot?.querySelector<HTMLElement>('.name')?.textContent,
    );
    const copyButton = card?.shadowRoot?.querySelector('ui-copy-button.copy-action');

    const sectionTitle = normalize(
      section?.shadowRoot?.querySelector<HTMLElement>('.section-title')?.textContent,
    );

    return (
      card instanceof HTMLElement &&
      card.shadowRoot !== null &&
      cardName.length > 0 &&
      copyButton !== null &&
      section instanceof HTMLElement &&
      section.shadowRoot !== null &&
      sectionTitle.length > 0 &&
      field instanceof HTMLElement &&
      field.querySelector('.field-wrapper') !== null
    );
  });
};

const readFirstSyntaxCardState = async (page: Page): Promise<SyntaxCardState> =>
  page.evaluate(() => {
    const normalize = (value: string | null | undefined): string =>
      (value ?? '').replace(/\s+/gu, ' ').trim();

    const card = document.querySelector<HTMLElement>('ui-syntax-card');
    const signaturePre = card?.querySelector<HTMLPreElement>('pre[slot="signature"]') ?? null;
    const firstSection = card?.querySelector<HTMLElement>('ui-syntax-section') ?? null;
    const firstField = card?.querySelector<HTMLElement>('ui-syntax-field') ?? null;

    return {
      hostExists: card instanceof HTMLElement,
      hostShadowRoot: card?.shadowRoot !== null,
      headingText: normalize(card?.shadowRoot?.querySelector<HTMLElement>('.name')?.textContent),
      copyButtonExists: card?.shadowRoot?.querySelector('ui-copy-button.copy-action') !== null,
      signaturePreExists: signaturePre instanceof HTMLPreElement,
      signatureCodeChildExists: signaturePre?.querySelector('code') !== null,
      signatureWrappedAsCodeBlock:
        signaturePre?.matches('[data-code-block]') === true ||
        signaturePre?.closest('[data-code-block-root]') !== null,
      firstSectionShadowRoot: firstSection?.shadowRoot !== null,
      firstSectionTitle: normalize(
        firstSection?.shadowRoot?.querySelector<HTMLElement>('.section-title')?.textContent,
      ),
      firstFieldWrapperExists: firstField?.querySelector('.field-wrapper') !== null,
      firstFieldTermText: normalize(firstField?.querySelector('dt.field-term')?.textContent),
      firstFieldDescriptionText: normalize(
        firstField?.querySelector('dd.field-description')?.textContent,
      ),
    };
  });

test.describe('syntax-card family e2e', () => {
  test('code fixture 上で syntax-card family が upgrade されること', async ({ page }) => {
    await page.goto(codePath);

    await expect(page.locator('ui-syntax-card').first()).toBeVisible();
    await waitForFirstSyntaxCardHydrated(page);

    const state = await readFirstSyntaxCardState(page);

    expect(state.hostExists).toBe(true);
    expect(state.hostShadowRoot).toBe(true);
    expect(state.headingText).toBe('useEffect');
    expect(state.copyButtonExists).toBe(true);

    expect(state.signaturePreExists).toBe(true);
    expect(state.signatureCodeChildExists).toBe(false);
    expect(state.signatureWrappedAsCodeBlock).toBe(false);

    expect(state.firstSectionShadowRoot).toBe(true);
    expect(state.firstSectionTitle).toBe('概要');

    expect(state.firstFieldWrapperExists).toBe(true);
    expect(normalizeText(state.firstFieldTermText)).toContain('effect');
    expect(normalizeText(state.firstFieldDescriptionText)).toContain('副作用本体');
  });

  test('hard reload 後も syntax-card family が崩れないこと', async ({ page }) => {
    await page.goto(codePath);
    await page.reload();

    await expect(page.locator('ui-syntax-card').first()).toBeVisible();
    await waitForFirstSyntaxCardHydrated(page);

    const state = await readFirstSyntaxCardState(page);

    expect(state.hostExists).toBe(true);
    expect(state.hostShadowRoot).toBe(true);
    expect(state.headingText).toBe('useEffect');
    expect(state.copyButtonExists).toBe(true);

    expect(state.signaturePreExists).toBe(true);
    expect(state.signatureCodeChildExists).toBe(false);
    expect(state.signatureWrappedAsCodeBlock).toBe(false);

    expect(state.firstSectionShadowRoot).toBe(true);
    expect(state.firstSectionTitle).toBe('概要');

    expect(state.firstFieldWrapperExists).toBe(true);
    expect(normalizeText(state.firstFieldTermText)).toContain('effect');
    expect(normalizeText(state.firstFieldDescriptionText)).toContain('副作用本体');
  });
});
