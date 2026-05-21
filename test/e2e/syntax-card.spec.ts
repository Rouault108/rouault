import { expect, test, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const codePath = e2eNoteFixtures.code.directPath;

interface SyntaxCardState {
  hostExists: boolean;
  headingText: string;
  signaturePreExists: boolean;
  signatureCodeChildExists: boolean;
  signatureWrappedAsCodeBlock: boolean;
  firstSectionTitle: string;
  firstFieldWrapperExists: boolean;
  firstFieldTermText: string;
  firstFieldDescriptionText: string;
}

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/gu, ' ').trim();

const waitForFirstSyntaxCardRendered = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => {
    const normalize = (value: string | null | undefined): string =>
      (value ?? '').replace(/\s+/gu, ' ').trim();

    const card = document.querySelector<HTMLElement>('[data-syntax-card]');
    const section = card?.querySelector<HTMLElement>('[data-syntax-section]') ?? null;
    const field = card?.querySelector<HTMLElement>('[data-syntax-field]') ?? null;

    const cardName = normalize(card?.querySelector<HTMLElement>('.syntax-card__name')?.textContent);

    const sectionTitle = normalize(section?.querySelector<HTMLElement>('.syntax-section__heading')?.textContent);

    return (
      card instanceof HTMLElement &&
      cardName.length > 0 &&
      section instanceof HTMLElement &&
      sectionTitle.length > 0 &&
      field instanceof HTMLElement &&
      field.querySelector('.syntax-field__term') !== null
    );
  });
};

const readFirstSyntaxCardState = async (page: Page): Promise<SyntaxCardState> =>
  page.evaluate(() => {
    const normalize = (value: string | null | undefined): string =>
      (value ?? '').replace(/\s+/gu, ' ').trim();

    const card = document.querySelector<HTMLElement>('[data-syntax-card]');
    const signaturePre = card?.querySelector<HTMLPreElement>('pre[data-syntax-signature]') ?? null;
    const firstSection = card?.querySelector<HTMLElement>('[data-syntax-section]') ?? null;
    const firstField = card?.querySelector<HTMLElement>('[data-syntax-field]') ?? null;

    return {
      hostExists: card instanceof HTMLElement,
      headingText: normalize(card?.querySelector<HTMLElement>('.syntax-card__name')?.textContent),
      signaturePreExists: signaturePre instanceof HTMLPreElement,
      signatureCodeChildExists: signaturePre?.querySelector('code') !== null,
      signatureWrappedAsCodeBlock:
        signaturePre?.matches('[data-code-block]') === true ||
        signaturePre?.closest('[data-code-block-root]') !== null,
      firstSectionTitle: normalize(
        firstSection?.querySelector<HTMLElement>('.syntax-section__heading')?.textContent,
      ),
      firstFieldWrapperExists: firstField?.querySelector('.syntax-field__term') !== null,
      firstFieldTermText: normalize(firstField?.querySelector('dt.syntax-field__term')?.textContent),
      firstFieldDescriptionText: normalize(
        firstField?.querySelector('dd.syntax-field__description')?.textContent,
      ),
    };
  });

test.describe('syntax-card family e2e', () => {
  test('code fixture 上で syntax-card family が静的 HTML として描画されること', async ({ page }) => {
    await page.goto(codePath);

    await expect(page.locator('[data-syntax-card]').first()).toBeVisible();
    await waitForFirstSyntaxCardRendered(page);

    const state = await readFirstSyntaxCardState(page);

    expect(state.hostExists).toBe(true);
    expect(state.headingText).toBe('useEffect');

    expect(state.signaturePreExists).toBe(true);
    expect(state.signatureCodeChildExists).toBe(false);
    expect(state.signatureWrappedAsCodeBlock).toBe(false);

    expect(state.firstSectionTitle).toBe('概要');

    expect(state.firstFieldWrapperExists).toBe(true);
    expect(normalizeText(state.firstFieldTermText)).toContain('effect');
    expect(normalizeText(state.firstFieldDescriptionText)).toContain('副作用本体');
  });

  test('hard reload 後も syntax-card family が崩れないこと', async ({ page }) => {
    await page.goto(codePath);
    await page.reload();

    await expect(page.locator('[data-syntax-card]').first()).toBeVisible();
    await waitForFirstSyntaxCardRendered(page);

    const state = await readFirstSyntaxCardState(page);

    expect(state.hostExists).toBe(true);
    expect(state.headingText).toBe('useEffect');

    expect(state.signaturePreExists).toBe(true);
    expect(state.signatureCodeChildExists).toBe(false);
    expect(state.signatureWrappedAsCodeBlock).toBe(false);

    expect(state.firstSectionTitle).toBe('概要');

    expect(state.firstFieldWrapperExists).toBe(true);
    expect(normalizeText(state.firstFieldTermText)).toContain('effect');
    expect(normalizeText(state.firstFieldDescriptionText)).toContain('副作用本体');
  });
});
