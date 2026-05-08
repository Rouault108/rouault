import { expect, fixture, html } from '@open-wc/testing';

import { ensureMainCssLoaded } from './helpers/load-main-css.js';

const STYLE_ID = 'test-layout-toc-css';

const waitForStyleRecalc = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
};

const ensureLayoutTocCssLoaded = async (): Promise<void> => {
  if (document.getElementById(STYLE_ID)) {
    await waitForStyleRecalc();
    return;
  }

  const response = await fetch(
    new URL('../../src/assets/css/layout-toc.css', import.meta.url).href,
  );
  if (!response.ok) {
    throw new Error(`layout-toc.css の読み込みに失敗しました: ${response.status}`);
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = await response.text();
  document.head.append(style);
  await waitForStyleRecalc();
};

describe('layout-toc static nav browser style contract', () => {
  before(async () => {
    await ensureMainCssLoaded();
    await ensureLayoutTocCssLoaded();
  });

  it('SSR layout toc uses readable compact wrapping for inactive and active labels', async () => {
    const root = await fixture<HTMLElement>(html`
      <aside class="layout-toc-col" data-density-tier="compact">
        <nav class="layout-toc" data-layout-toc-nav data-density-tier="compact" aria-label="目次">
          <ol class="layout-toc__list">
            <li class="layout-toc__item" data-heading-id="overview" data-heading-depth="0">
              <a class="layout-toc__link" href="#overview" data-toc-link data-heading-id="overview">
                <span class="layout-toc__link-label">概要</span>
              </a>
            </li>
            <li class="layout-toc__item" data-heading-id="long" data-heading-depth="2">
              <a
                class="layout-toc__link is-active"
                href="#long"
                data-toc-link
                data-active="true"
                aria-current="location"
                data-heading-id="long"
                data-heading-depth="2"
              >
                <span class="layout-toc__link-label"
                  >第2章
                  ソースコードから実行まで：コンパイル単位、アセンブリ、IL、メタデータ、CLRの関係</span
                >
              </a>
            </li>
            <li class="layout-toc__item" data-heading-id="deep" data-heading-depth="3">
              <a
                class="layout-toc__link"
                href="#deep"
                data-toc-link
                data-heading-id="deep"
                data-heading-depth="3"
              >
                <span class="layout-toc__link-label"
                  >実行時境界を越えるときに発生する型情報、例外、依存解決の扱い</span
                >
              </a>
            </li>
          </ol>
        </nav>
      </aside>
    `);

    const inactiveLabel = root.querySelector<HTMLElement>(
      '[data-heading-id="deep"] .layout-toc__link-label',
    );
    const activeLabel = root.querySelector<HTMLElement>(
      '[aria-current="location"] .layout-toc__link-label',
    );
    if (!(inactiveLabel instanceof HTMLElement) || !(activeLabel instanceof HTMLElement)) {
      throw new Error('layout toc label が見つかりません。');
    }

    const inactiveStyle = getComputedStyle(inactiveLabel);
    const activeStyle = getComputedStyle(activeLabel);
    expect(inactiveStyle.webkitLineClamp).to.equal('2');
    expect(inactiveStyle.whiteSpace).to.equal('normal');
    expect(inactiveStyle.textOverflow).to.not.equal('ellipsis');
    expect(activeStyle.webkitLineClamp).to.equal('3');
    expect(activeStyle.whiteSpace).to.equal('normal');
  });

  it('mobile panel styling hook receives the same density variables', async () => {
    const panel = await fixture<HTMLElement>(html`
      <div class="layout-toc-mobile-panel" data-layout-toc-mobile-panel data-density-tier="compact">
        <nav
          class="layout-toc layout-toc--mobile"
          data-layout-toc-mobile-nav
          data-density-tier="compact"
        >
          <a class="layout-toc__link" href="#deep" data-toc-link data-heading-depth="3">
            <span class="layout-toc__link-label"
              >実行時境界を越えるときに発生する型情報、例外、依存解決の扱い</span
            >
          </a>
        </nav>
      </div>
    `);

    const label = panel.querySelector<HTMLElement>('.layout-toc__link-label');
    if (!(label instanceof HTMLElement)) {
      throw new Error('mobile panel label が見つかりません。');
    }

    const style = getComputedStyle(label);
    expect(style.webkitLineClamp).to.equal('2');
    expect(style.whiteSpace).to.equal('normal');
  });
});
