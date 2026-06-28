import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  findLastDeclarationRuleOrderForSelector,
  hasDeclarationForSelector,
  readCssFile,
} from './support/css-contract.js';

const cssDir = resolve(process.cwd(), 'src/assets/css');
const { cssText: tokensCss } = readCssFile(resolve(cssDir, 'tokens.css'));
const { cssText: mainCss } = readCssFile(resolve(cssDir, 'main.css'));
const { cssText: bridgeCss } = readCssFile(resolve(cssDir, 'stateful-note-bridges.css'));

const surfaceFlowSelector = `:is(.prose, .about-prose)
  > *
  + :where(
    p,
    ul,
    ol,
    dl,
    pre,
    table,
    figure,
    blockquote,
    [data-callout],
    pre[data-code-block],
    section[data-code-group],
    [data-code-block-root],
    [data-link-card],
    [data-details],
    [data-info-box],
    [data-image],
    ui-video,
    [data-score],
    [data-table-root],
    ui-tabs,
    ui-translation,
    .translation-static
  )`;

const panelFlowSelector = `:is(.prose, .about-prose)
  > ui-tabs
  > [slot='panel']
  > *
  + :where(
    p,
    ul,
    ol,
    dl,
    pre,
    table,
    figure,
    blockquote,
    [data-callout],
    pre[data-code-block],
    section[data-code-group],
    [data-code-block-root],
    [data-link-card],
    [data-details],
    [data-info-box],
    [data-image],
    ui-video,
    [data-score],
    [data-table-root],
    ui-tabs,
    ui-translation
  )`;

describe('reading surface flow CSS contract', () => {
  it('defines paragraph space without changing generic block flow space', () => {
    expect(
      hasDeclarationForSelector(tokensCss, ':root', '--reading-flow-space', 'var(--space-4)', {
        scope: 'base',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tokensCss, ':root', '--reading-paragraph-space', 'var(--space-3)', {
        scope: 'base',
      }),
    ).toBe(true);
  });

  it('keeps direct reading-surface p + p tighter than generic block flow', () => {
    const paragraphSelector = ':is(.prose, .about-prose) > p + p';

    expect(
      hasDeclarationForSelector(
        mainCss,
        surfaceFlowSelector,
        'margin-block-start',
        'var(--reading-flow-space)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        mainCss,
        paragraphSelector,
        'margin-block-start',
        'var(--reading-paragraph-space)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      findLastDeclarationRuleOrderForSelector(mainCss, paragraphSelector, 'margin-block-start', {
        scope: 'base',
      }),
    ).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(mainCss, surfaceFlowSelector, 'margin-block-start', {
        scope: 'base',
      }),
    );
  });

  it('keeps ui-tabs panel p + p on the same paragraph contract', () => {
    const panelParagraphSelector =
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > p + p";

    expect(
      hasDeclarationForSelector(
        bridgeCss,
        panelFlowSelector,
        'margin-block-start',
        'var(--reading-flow-space)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        bridgeCss,
        panelParagraphSelector,
        'margin-block-start',
        'var(--reading-paragraph-space)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      findLastDeclarationRuleOrderForSelector(
        bridgeCss,
        panelParagraphSelector,
        'margin-block-start',
        { scope: 'base' },
      ),
    ).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(bridgeCss, panelFlowSelector, 'margin-block-start', {
        scope: 'base',
      }),
    );
  });
});
