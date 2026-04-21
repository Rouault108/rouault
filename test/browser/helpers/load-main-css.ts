const TOKENS_STYLE_ID = 'test-global-tokens-css';
const MAIN_STYLE_ID = 'test-global-main-css';

const waitForStyleRecalc = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
};

const ensureStyleTag = async (id: string, href: string, transform?: (cssText: string) => string) => {
  if (document.getElementById(id)) {
    await waitForStyleRecalc();
    return;
  }

  const response = await fetch(href);
  if (!response.ok) {
    throw new Error(`${href} の読み込みに失敗しました: ${response.status} ${response.statusText}`);
  }

  const cssText = await response.text();
  const style = document.createElement('style');
  style.id = id;
  style.textContent = transform ? transform(cssText) : cssText;
  document.head.append(style);

  await waitForStyleRecalc();
};

export const ensureMainCssLoaded = async (): Promise<void> => {
  await ensureStyleTag(
    TOKENS_STYLE_ID,
    new URL('../../../src/assets/css/tokens.css', import.meta.url).href,
  );
  await ensureStyleTag(
    MAIN_STYLE_ID,
    new URL('../../../src/assets/css/main.css', import.meta.url).href,
    (cssText) => cssText.replace(/^@import\s+[^;]+;\s*$/gm, ''),
  );
};
