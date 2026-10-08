import { expect, test, type Page } from '@playwright/test';

const sectionHeadings = [
  'ノートについて',
  'ノートの探し方',
  '作者について',
  'このサイトのつくり',
  '利用について',
] as const;

const expectAboutStructure = async (page: Page): Promise<void> => {
  const main = page.locator('#main-content');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('このサイトについて');
  await expect(main.getByRole('heading', { level: 2 })).toHaveText([...sectionHeadings]);
  await expect(main.locator('#overview')).toHaveCount(1);
  await expect(main.locator('#writing-policy')).toHaveCount(1);
  await expect(main.locator('#author')).toHaveCount(1);
  await expect(main.locator('#tech-stack')).toHaveCount(1);
  await expect(main.locator('#copyright')).toHaveCount(1);
  await expect(main.locator('[data-layout-toc-nav]')).toHaveCount(0);
};

test.describe('About page', () => {
  for (const viewport of [
    { name: 'wide', width: 1280, height: 800 },
    { name: 'narrow', width: 390, height: 844 },
  ] as const) {
    test(`${viewport.name} 幅で見出し順と本文幅を維持すること`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/about/');

      await expectAboutStructure(page);
      const geometry = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    });
  }

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${colorScheme} 配色でも本文とリンクを表示すること`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('/about/');

      await expect(page.locator('html')).toHaveAttribute('data-resolved-theme', colorScheme);
      await expect(page.locator('.about-shell')).toBeVisible();
      await expect(page.getByRole('link', { name: 'トップページ', exact: true })).toBeVisible();
      await expect(page.locator('a[href="https://github.com/Rouault108/rouault"]')).toBeVisible();
    });
  }

  test('本文リンクへ keyboard Tab で到達できること', async ({ page }) => {
    await page.goto('/about/');
    const target = page.getByRole('link', { name: 'トップページ', exact: true });

    await page.locator('body').click({ position: { x: 1, y: 1 } });
    for (let attempt = 0; attempt < 32; attempt += 1) {
      await page.keyboard.press('Tab');
      if (await target.evaluate((element) => element === document.activeElement)) break;
    }

    await expect(target).toBeFocused();
    const focusStyle = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
      };
    });
    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(focusStyle.outlineWidth).toBeGreaterThan(0);
  });

  test('既存 fragment と見出し permalink を維持すること', async ({ page }) => {
    await page.goto('/about/#overview');
    await expect(page.locator('#overview')).toHaveText('このサイトについて');
    await expect(page.locator('a[href="#writing-policy"]')).toHaveAttribute(
      'data-link-kind',
      'internal-fragment',
    );
    await expect(page.locator('a[href="#author"]')).toHaveCount(1);
    await expect(page.locator('a[href="#tech-stack"]')).toHaveCount(1);
    await expect(page.locator('a[href="#copyright"]')).toHaveCount(1);
  });
});

test.describe('About page without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('SSR 本文と通常リンクをそのまま読めること', async ({ page }) => {
    await page.goto('/about/');

    await expectAboutStructure(page);
    const prose = page.locator('#about-page-content');
    await expect(page.locator('.about-lead')).toHaveText(
      'Rouaultは、ソフトウェア、計算機科学、設計、読書を通じて調べたことや考えたことを、後から辿れる形で残す個人の公開ノートです。一定のまとまりを持った文章を本文中心に読み込める、静かな読書環境を目指しています。',
    );
    await expect(prose.getByRole('link', { name: 'トップページ', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(prose.getByRole('link', { name: 'コーパスの一覧', exact: true })).toHaveAttribute(
      'href',
      '/corpora/',
    );
    await expect(prose.getByRole('link', { name: '検索', exact: true })).toHaveAttribute(
      'href',
      '/search/',
    );
    await expect(prose.getByRole('link', { name: 'miyaty.ruo@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:miyaty.ruo@gmail.com',
    );
  });
});
