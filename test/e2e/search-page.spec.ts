import { expect, test, type Locator, type Page } from '@playwright/test';

const waitForSearchPageReady = async (page: Page, path = '/search/'): Promise<void> => {
  await page.goto(path);
  await page.locator('#main-content [data-search-page-root]').waitFor();
  await page.waitForFunction(() => {
    const host = document.querySelector('#main-content [data-search-page-root]');
    return (
      host instanceof HTMLElement &&
      host.dataset['enhanced'] === 'true' &&
      host.querySelector('[data-search-query-input]') instanceof HTMLInputElement &&
      host.querySelector('[data-search-filter-input]') instanceof HTMLInputElement
    );
  });
};

const clickNearLeftEdgeAndType = async (
  page: Page,
  input: Locator,
  value: string,
): Promise<void> => {
  const box = await input.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }

  await page.mouse.click(box.x + 12, box.y + box.height / 2);
  await expect(input).toBeFocused();
  await page.keyboard.type(value);
  await expect(input).toHaveValue(value);
};

const tabUntilFocused = async (page: Page, target: Locator): Promise<void> => {
  if (await target.evaluate((element) => document.activeElement === element)) {
    return;
  }

  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press('Tab');

    if (await target.evaluate((element) => document.activeElement === element)) {
      return;
    }
  }

  expect(
    await target.evaluate((element) => document.activeElement === element),
    'Tab should reach the first result link',
  ).toBe(true);
};

const choiceMenu = (page: Page, kind: 'tag-mode' | 'sort') =>
  page.locator(`[data-search-choice-menu="${kind}"]`).first();

const choiceItem = (page: Page, kind: 'tag-mode' | 'sort', value: string) =>
  choiceMenu(page, kind).locator(`[data-static-choice-item][data-value="${value}"]`).first();

const expectChoiceState = async (
  page: Page,
  kind: 'tag-mode' | 'sort',
  value: string,
  label: string,
): Promise<void> => {
  const menu = choiceMenu(page, kind);
  const name = kind === 'tag-mode' ? 'tagMode' : 'sort';
  const inputSelector =
    kind === 'tag-mode' ? '[data-search-tag-mode-value]' : '[data-search-sort-value]';
  await expect(menu.locator('[data-static-choice-current-label]').first()).toHaveText(label);
  await expect(page.locator(inputSelector).first()).toHaveValue(value);
  await expect(
    menu.locator(`[data-static-choice-item][data-value="${value}"]`).first(),
  ).toHaveAttribute('data-selected', 'true');
  await expect(
    menu.locator(`[data-static-choice-item][data-value="${value}"]`).first(),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(`input[type="hidden"][name="${name}"]`).first()).not.toBeDisabled();
};

test.describe('Search Page', () => {
  test('検索 input と tag filter input は左端寄りの実クリックから keyboard.type で入力できること', async ({
    page,
  }) => {
    await waitForSearchPageReady(page);

    const queryInput = page.locator('[data-search-query-input]').first();
    await clickNearLeftEdgeAndType(page, queryInput, 'router');

    await page.locator('details.filter-details > summary').click();
    const filterInput = page.locator('[data-search-filter-input]').first();
    await clickNearLeftEdgeAndType(page, filterInput, 'pro');
  });

  test('result card は padding 相当位置まで a.result-link のリンク面として扱うこと', async ({
    page,
  }) => {
    await waitForSearchPageReady(page, '/search/?q=router');

    const firstCard = page.locator('article.result-card').first();
    const firstLink = firstCard.locator(':scope > a.result-link').first();
    await expect(firstCard).toBeVisible();
    await expect(firstLink).toBeVisible();

    await expect(firstCard.locator(':scope > *')).toHaveCount(1);
    await firstCard.scrollIntoViewIfNeeded();
    const linkBox = await firstLink.boundingBox();
    expect(linkBox).not.toBeNull();
    if (linkBox === null) {
      return;
    }

    const hitPoints = [
      { label: 'top-left padding', x: linkBox.x + 8, y: linkBox.y + 8 },
      {
        label: 'bottom-right padding',
        x: linkBox.x + linkBox.width - 8,
        y: linkBox.y + linkBox.height - 8,
      },
    ];

    for (const hitPoint of hitPoints) {
      const hitSurface = await page.evaluate(
        ({ x, y }) => {
          const element = document.elementFromPoint(x, y);
          const link = element instanceof Element ? element.closest('a.result-link') : null;
          return {
            tagName: element?.tagName ?? null,
            linkTagName: link?.tagName ?? null,
            linkSurface: link?.getAttribute('data-link-surface') ?? null,
          };
        },
        {
          x: hitPoint.x,
          y: hitPoint.y,
        },
      );

      expect(hitSurface.linkTagName, `${hitPoint.label} should hit a.result-link`).toBe('A');
      expect(hitSurface.linkSurface, `${hitPoint.label} should keep card link surface`).toBe(
        'card',
      );
    }
  });

  test('mouse click focus does not show the result card outer focus ring', async ({ page }) => {
    await waitForSearchPageReady(page, '/search/?q=router');

    const firstCard = page.locator('article.result-card').first();
    const firstLink = firstCard.locator(':scope > a.result-link').first();
    await expect(firstCard).toBeVisible();
    await expect(firstLink).toBeVisible();

    await firstLink.evaluate((link) => {
      link.addEventListener('click', (event) => event.preventDefault(), { once: true });
    });

    await firstLink.click();

    await expect(firstLink).toBeFocused();
    await expect(firstCard).toHaveCSS('outline-style', 'none');
  });

  test('keyboard focus-visible projects the result link focus ring to the result card', async ({
    page,
  }) => {
    await waitForSearchPageReady(page, '/search/?q=router');

    const firstCard = page.locator('article.result-card').first();
    const firstLink = firstCard.locator(':scope > a.result-link').first();
    await expect(firstCard).toBeVisible();
    await expect(firstLink).toBeVisible();

    await tabUntilFocused(page, firstLink);

    await expect(firstLink).toBeFocused();
    await expect(firstCard).toHaveCSS('outline-style', 'solid');
    await expect(firstLink).toHaveCSS('outline-style', 'none');
  });

  test('タグの組み合わせと並び順は static choice menu として開閉し、選択状態を同期すること', async ({
    page,
  }) => {
    await waitForSearchPageReady(page, '/search/?tag=architecture&tag=music');

    const tagMenu = choiceMenu(page, 'tag-mode');
    const sortMenu = choiceMenu(page, 'sort');

    await tagMenu.locator('[data-static-choice-trigger]').click();
    await expect(tagMenu).toHaveAttribute('open', '');
    await expect(tagMenu.locator('[data-static-choice-trigger]')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(choiceItem(page, 'tag-mode', 'and')).toBeVisible();

    await sortMenu.locator('[data-static-choice-trigger]').click();
    await expect(sortMenu).toHaveAttribute('open', '');
    await expect(tagMenu).not.toHaveAttribute('open', '');
    await expect(choiceItem(page, 'sort', 'date-desc')).toBeVisible();

    await page.locator('[data-search-query-input]').click();
    await expect(sortMenu).not.toHaveAttribute('open', '');

    await tagMenu.locator('[data-static-choice-trigger]').click();
    await choiceItem(page, 'tag-mode', 'and').click();
    await expect(tagMenu).not.toHaveAttribute('open', '');
    await expect(tagMenu.locator('[data-static-choice-trigger]')).toBeFocused();
    await expectChoiceState(page, 'tag-mode', 'and', 'すべてに一致');
    expect(new URL(page.url()).searchParams.get('tagMode')).toBe('and');

    await sortMenu.locator('[data-static-choice-trigger]').click();
    await choiceItem(page, 'sort', 'date-desc').click();
    await expect(sortMenu).not.toHaveAttribute('open', '');
    await expect(sortMenu.locator('[data-static-choice-trigger]')).toBeFocused();
    await expectChoiceState(page, 'sort', 'date-desc', '新しい順');
    expect(new URL(page.url()).searchParams.get('sort')).toBe('date-desc');
    await expect(page.locator('[data-search-page-loading]')).toBeHidden();
  });

  test('static choice menu は keyboard 操作と browser history 復元に追従すること', async ({
    page,
  }) => {
    await waitForSearchPageReady(page, '/search/?tag=architecture&tag=music');

    const tagMenu = choiceMenu(page, 'tag-mode');
    const tagTrigger = tagMenu.locator('[data-static-choice-trigger]');

    await tagTrigger.focus();
    await page.keyboard.press('ArrowDown');
    await expect(tagMenu).toHaveAttribute('open', '');
    await expect(choiceItem(page, 'tag-mode', 'or')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(choiceItem(page, 'tag-mode', 'and')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tagMenu).not.toHaveAttribute('open', '');
    await expect(tagTrigger).toBeFocused();
    await expectChoiceState(page, 'tag-mode', 'and', 'すべてに一致');

    await tagTrigger.focus();
    await page.keyboard.press('Enter');
    await expect(tagMenu).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(tagMenu).not.toHaveAttribute('open', '');
    await expect(tagTrigger).toBeFocused();
    await expect(tagTrigger).toHaveAttribute('aria-expanded', 'false');

    const sortTrigger = choiceMenu(page, 'sort').locator('[data-static-choice-trigger]');
    await sortTrigger.click();
    await choiceItem(page, 'sort', 'date-desc').click();
    await expectChoiceState(page, 'sort', 'date-desc', '新しい順');

    await page.goBack();
    await expectChoiceState(page, 'sort', 'relevance', '関連度順');
    await expect(choiceMenu(page, 'sort').locator('[data-static-choice-trigger]')).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    await page.goBack();
    await expectChoiceState(page, 'tag-mode', 'or', 'いずれかに一致');
    await expect(page.locator('[data-search-tag-mode-description]')).toContainText(
      '増加件数ではありません',
    );
    await expect(tagTrigger).toHaveAttribute('aria-expanded', 'false');

    await page.goForward();
    await expectChoiceState(page, 'tag-mode', 'and', 'すべてに一致');
    await expect(page.locator('[data-search-tag-mode-description]')).toContainText(
      '追加した後の結果件数',
    );
  });

  test('toolbar は件数桁数・空表示・境界幅・font loadで各slot座標と高さを安定させること', async ({
    page,
  }) => {
    const samples = [
      '',
      '0 件の結果',
      '1 件の結果',
      '9 件の結果',
      '10 件の結果',
      '99 件の結果',
      '100 件の結果',
    ];

    for (const width of [640, 641, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await waitForSearchPageReady(page);
      const count = page.locator('[data-search-page-result-count]').first();
      await count.evaluate((node) => node.replaceChildren('100 件の結果'));
      const beforeFonts = await page.locator('.toolbar-row').evaluate((toolbar) => {
        const slots = [
          toolbar.querySelector('.toolbar-result-count'),
          toolbar.querySelector('[data-search-choice="tag-mode"]'),
          toolbar.querySelector('[data-search-choice="sort"]'),
        ];
        return slots.map((slot) => slot?.getBoundingClientRect().x ?? -1);
      });
      await page.evaluate(async () => document.fonts.ready);
      const afterFonts = await page.locator('.toolbar-row').evaluate((toolbar) => {
        const slots = [
          toolbar.querySelector('.toolbar-result-count'),
          toolbar.querySelector('[data-search-choice="tag-mode"]'),
          toolbar.querySelector('[data-search-choice="sort"]'),
        ];
        return slots.map((slot) => slot?.getBoundingClientRect().x ?? -1);
      });
      afterFonts.forEach((coordinate, index) =>
        expect(Math.abs(coordinate - (beforeFonts[index] ?? coordinate))).toBeLessThanOrEqual(0.5),
      );

      let baseline:
        | {
            readonly x: readonly number[];
            readonly toolbarHeight: number;
            readonly countHeight: number;
          }
        | undefined;
      for (const sample of samples) {
        await count.evaluate((node, value) => node.replaceChildren(value), sample);
        const layout = await page.locator('.toolbar-row').evaluate((toolbar) => {
          const toolbarRect = toolbar.getBoundingClientRect();
          const slots = [
            toolbar.querySelector<HTMLElement>('.toolbar-result-count'),
            toolbar.querySelector<HTMLElement>('[data-search-choice="tag-mode"]'),
            toolbar.querySelector<HTMLElement>('[data-search-choice="sort"]'),
          ].map((slot) => slot?.getBoundingClientRect());
          const overlaps = slots.some((left, index) =>
            slots
              .slice(index + 1)
              .some(
                (right) =>
                  left !== undefined &&
                  right !== undefined &&
                  Math.min(left.right, right.right) - Math.max(left.left, right.left) > 0.5 &&
                  Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0.5,
              ),
          );
          return {
            x: slots.map((slot) => slot?.x ?? -1),
            centers: slots.map((slot) => (slot ? slot.x + slot.width / 2 : -1)),
            toolbarCenter: toolbarRect.x + toolbarRect.width / 2,
            toolbarHeight: toolbarRect.height,
            countHeight: slots[0]?.height ?? -1,
            contained: slots.every(
              (slot) =>
                slot !== undefined &&
                slot.left >= toolbarRect.left - 0.5 &&
                slot.right <= toolbarRect.right + 0.5,
            ),
            noHorizontalOverflow: toolbar.scrollWidth <= toolbar.clientWidth,
            overlaps,
          };
        });
        expect(layout.contained, `${width}px/${sample || 'blank'} contained`).toBe(true);
        expect(layout.noHorizontalOverflow, `${width}px/${sample || 'blank'} overflow`).toBe(true);
        expect(layout.overlaps, `${width}px/${sample || 'blank'} overlap`).toBe(false);
        if (width > 640) {
          expect(Math.abs((layout.centers[1] ?? -1) - layout.toolbarCenter)).toBeLessThanOrEqual(
            0.5,
          );
        }
        baseline ??= {
          x: layout.x,
          toolbarHeight: layout.toolbarHeight,
          countHeight: layout.countHeight,
        };
        layout.x.forEach((coordinate, index) =>
          expect(
            Math.abs(coordinate - (baseline?.x[index] ?? coordinate)),
            `${width}px/${sample || 'blank'} slot ${index} movement`,
          ).toBeLessThanOrEqual(0.5),
        );
        expect(layout.toolbarHeight).toBeCloseTo(baseline.toolbarHeight, 1);
        expect(layout.countHeight).toBeCloseTo(baseline.countHeight, 1);
      }

      const descriptionBefore = await page
        .locator('[data-search-tag-mode-description]')
        .boundingBox();
      const resultsBefore = await page.locator('[data-search-page-results-section]').boundingBox();
      await choiceMenu(page, 'tag-mode').locator('[data-static-choice-trigger]').click();
      await choiceItem(page, 'tag-mode', 'and').click();
      await expect(page.locator('[data-search-tag-mode-description]')).toContainText(
        '追加した後の結果件数',
      );
      const descriptionAfter = await page
        .locator('[data-search-tag-mode-description]')
        .boundingBox();
      const resultsAfter = await page.locator('[data-search-page-results-section]').boundingBox();
      expect(descriptionBefore).not.toBeNull();
      expect(descriptionAfter).not.toBeNull();
      expect(resultsBefore).not.toBeNull();
      expect(resultsAfter).not.toBeNull();
      expect(descriptionAfter?.height).toBeCloseTo(descriptionBefore?.height ?? -1, 1);
      expect(resultsAfter?.y).toBeCloseTo(resultsBefore?.y ?? -1, 1);
    }
  });

  test('toolbar は200% zoomと長い日本語labelでも横溢れ・slot重なりを起こさないこと', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await waitForSearchPageReady(page);
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
      const labels = document.querySelectorAll<HTMLElement>(
        '.toolbar-row [data-static-choice-current-label]',
      );
      labels[0]?.replaceChildren('選択中のすべてのタグの組み合わせに一致する非常に長い表示');
      labels[1]?.replaceChildren('更新日時と関連度を組み合わせた非常に長い並び順表示');
    });
    await page.evaluate(async () => document.fonts.ready);

    const layout = await page.locator('.toolbar-row').evaluate((toolbar) => {
      const toolbarRect = toolbar.getBoundingClientRect();
      const slots = [
        toolbar.querySelector<HTMLElement>('.toolbar-result-count'),
        toolbar.querySelector<HTMLElement>('[data-search-choice="tag-mode"]'),
        toolbar.querySelector<HTMLElement>('[data-search-choice="sort"]'),
      ].map((slot) => slot?.getBoundingClientRect());
      const currents = [
        ...toolbar.querySelectorAll<HTMLElement>('[data-static-choice-current-label]'),
      ];
      return {
        contained: slots.every(
          (slot) =>
            slot !== undefined &&
            slot.left >= toolbarRect.left - 0.5 &&
            slot.right <= toolbarRect.right + 0.5,
        ),
        noHorizontalOverflow: toolbar.scrollWidth <= toolbar.clientWidth,
        overlaps: slots.some((left, index) =>
          slots
            .slice(index + 1)
            .some(
              (right) =>
                left !== undefined &&
                right !== undefined &&
                Math.min(left.right, right.right) - Math.max(left.left, right.left) > 0.5 &&
                Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0.5,
            ),
        ),
        longLabelsContained: currents.every((current) => {
          const parent = current.parentElement;
          return (
            parent !== null &&
            current.scrollWidth > current.clientWidth &&
            parent.scrollWidth <= parent.clientWidth
          );
        }),
      };
    });

    expect(layout.contained).toBe(true);
    expect(layout.noHorizontalOverflow).toBe(true);
    expect(layout.overlaps).toBe(false);
    expect(layout.longLabelsContained).toBe(true);
  });
});
