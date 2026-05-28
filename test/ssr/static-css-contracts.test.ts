import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cssDir = resolve(process.cwd(), 'src/assets/css');

const readCss = (fileName: string): string =>
  readFileSync(resolve(cssDir, fileName), 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '');

const ruleBlock = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const match = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{(?<body>[^}]*)\\}`, 'u').exec(css);
  return match?.groups?.['body'] ?? '';
};

const expectRuleToDeclare = (css: string, selector: string, declarations: readonly string[]): void => {
  const block = ruleBlock(css, selector);
  expect(block, `${selector} rule`).not.to.equal('');
  for (const declaration of declarations) {
    expect(block, `${selector} declaration ${declaration}`).to.contain(declaration);
  }
};

describe('static CSS contracts', () => {
  it('main.css imports static UI contract files', () => {
    const css = readCss('main.css');
    for (const fileName of [
      './link-primitives.css',
      './card-link.css',
      './utility-surfaces.css',
      './layout-containers.css',
      './stateful-note-bridges.css',
      './translation.css',
      './app-shell.css',
      './router-shell.css',
      './layout-header.css',
      './layout-sidebar.css',
      './note-shell.css',
      './about-shell.css',
      './page-shell.css',
      './home-page.css',
      './result-card.css',
      './not-found-page.css',
      './search-dialog.css',
      './search-page.css',
      './blockquote.css',
      './callout.css',
      './info-box.css',
      './table.css',
      './footnotes.css',
      './link-card.css',
      './image.css',
      './details-block.css',
      './syntax.css',
      './score.css',
      './empty-state.css',
      './page-corpora.css',
    ]) {
      expect(css).to.contain(`@import '${fileName}'`);
    }
    expect(css).not.to.match(/\.(?:app-root|note-shell|page-shell|home-shell|result-card|result-link)\b/u);
    expect(css).not.to.contain('ui-list-item >');
  });

  it('search dialog CSS contains required layout and state declarations', () => {
    const css = readCss('search-dialog.css');
    expectRuleToDeclare(css, '.search-dialog', [
      'border:',
      'border-radius:',
      'max-block-size:',
      'box-shadow:',
      'grid-template-rows:',
    ]);
    expectRuleToDeclare(css, '.search-dialog__body', ['min-block-size:', 'overflow:']);
    expectRuleToDeclare(css, '.search-dialog__icon', ['inline-size:', 'block-size:']);
    expectRuleToDeclare(css, '.search-dialog[data-closing]', ['animation:']);
    expectRuleToDeclare(css, '.search-dialog__spinner', [
      'box-sizing: border-box',
      'inline-size:',
      'block-size:',
      'border:',
      'border-block-start-color: transparent',
      'animation: rouault-static-spinner-rotate',
    ]);
    expect(css).not.to.contain('.search-dialog__spinner::before');
    expect(css).to.contain('@keyframes rouault-static-spinner-rotate');
    expectRuleToDeclare(css, '.search-dialog__state-icon', ['inline-size:', 'block-size:']);
    expect(ruleBlock(css, ".search-dialog__result[aria-selected='true']")).to.match(
      /background:|outline:/u,
    );
    expect(css).not.to.contain('.search-dialog__virtual-spacer');
    expect(css).to.contain('@media print');
    expect(css).to.contain('@media (forced-colors: active)');
    expect(css).to.contain('@media (prefers-reduced-motion: reduce)');
  });

  it('search page CSS maps static lower-level UI recipes', () => {
    const css = readCss('search-page.css');
    expectRuleToDeclare(css, '.search-controls', ['display: grid']);
    expectRuleToDeclare(css, '.search-input-field', ['border:', 'border-radius:']);
    expectRuleToDeclare(css, '.filter-summary', ['grid-template-columns:']);
    expectRuleToDeclare(css, '.filter-list', ['max-block-size:', 'overflow-y:']);
    expectRuleToDeclare(css, '.selected-tag', ['border:', 'border-radius:']);
    expectRuleToDeclare(css, '.filter-option-checkbox__control', ['inline-size: 16px', 'block-size: 16px']);
    expectRuleToDeclare(css, '.filter-option-checkbox__icon', ['opacity: 0']);
    expectRuleToDeclare(
      css,
      ".filter-option-checkbox__input:checked + .filter-option-checkbox__control .filter-option-checkbox__icon",
      ['opacity: 1'],
    );
    expectRuleToDeclare(css, ".filter-option[data-selected='true']", [
      'background: var(--bg-accent-muted, var(--bg-fill-muted))',
      'border-color: var(--border-accent, var(--border-default))',
    ]);
    expectRuleToDeclare(css, '.search-page__spinner', [
      'box-sizing: border-box',
      'inline-size:',
      'block-size:',
      'border:',
      'border-block-start-color: transparent',
      'animation: rouault-static-spinner-rotate',
    ]);
    expect(css).not.to.contain('.search-page__spinner::before');
    expect(css).to.contain('@keyframes rouault-static-spinner-rotate');
    expect(css).to.contain('@media (max-width: 640px)');
    expect(css).to.contain('.toolbar-row { align-items: stretch; }');
    expect(css).to.contain('@media (prefers-color-scheme: dark)');
    expect(css).to.contain(
      ".filter-option[data-selected='true'] { background: var(--bg-fill-muted); border-color: var(--border-accent, var(--border-default)); }",
    );
  });

  it('details, syntax, score, empty state, and corpora CSS expose static contracts', () => {
    const details = readCss('details-block.css');
    expectRuleToDeclare(details, '.details-block__chevron.static-icon', [
      'inline-size:',
      'block-size:',
      'transition:',
    ]);
    expectRuleToDeclare(details, '.details-block__chevron.static-icon > svg', [
      'inline-size: 100%',
      'block-size: 100%',
    ]);
    expect(details).to.contain('.details-block__summary::marker');
    expect(details).to.contain('.details-block__summary::-webkit-details-marker');
    expect(details).to.contain(
      '.details-block[open] > .details-block__summary .details-block__chevron',
    );
    expect(details).not.to.contain("data-variant='bordered'");

    const lists = readCss('lists.css');
    expectRuleToDeclare(lists, 'ol[data-list]', ['counter-reset:']);
    expectRuleToDeclare(lists, 'ol[data-list] > li', ['counter-increment:']);
    expectRuleToDeclare(lists, 'ol[data-list] > li[data-ol-has-value]', ['counter-set:']);

    const syntax = readCss('syntax.css');
    expectRuleToDeclare(syntax, '.syntax-card__signature pre', ['margin: 0', 'background: transparent']);
    expectRuleToDeclare(syntax, '.syntax-field__required', ['border:', 'color:']);
    expect(syntax).to.contain('@media print');

    const score = readCss('score.css');
    expectRuleToDeclare(score, '.score__scroll', ['overflow-x:', 'scrollbar-gutter:', 'border:']);
    expectRuleToDeclare(score, '.score__stage', ['aspect-ratio:']);
    expectRuleToDeclare(score, '.score__stage > svg', ['display: block']);
    expect(score).not.to.contain('score__svg');
    expect(score).not.to.contain('svg-host');
    expect(score).not.to.contain('score__skeleton');
    expect(score).not.to.contain('ui-score-shimmer');
    expect(score).to.contain('@media print');

    const footnotes = readCss('footnotes.css');
    expect(footnotes).not.to.contain('ui-footnote');

    const empty = readCss('empty-state.css');
    expectRuleToDeclare(empty, '.empty-hint__message', ['inline-size: min(100%, 40ch)']);
    expect(empty).to.contain('@keyframes empty-state-enter');

    const corpora = readCss('page-corpora.css');
    expectRuleToDeclare(corpora, '.corpora-overview__corpus-grid', ['grid-template-columns:']);
    expectRuleToDeclare(corpora, '.corpus-page .empty-hint[data-empty-state]', ['min-block-size:']);
    expect(corpora).not.to.match(/\.result-(card|link|title|meta|excerpt)\s*\{/u);
  });

  it('page shell CSS is split by responsibility', () => {
    const pageShell = readCss('page-shell.css');
    expectRuleToDeclare(pageShell, '.page-shell', ['--page-shell-padding-block-start']);
    expectRuleToDeclare(pageShell, '.page-shell .hero', ['display: grid']);

    const resultCard = readCss('result-card.css');
    expectRuleToDeclare(resultCard, '.page-shell .result-card', ['border:', 'background:']);
    expect(resultCard).not.to.contain('.hero');

    const homePage = readCss('home-page.css');
    expectRuleToDeclare(homePage, '.home-shell', ['--home-shell-padding-block-start']);
    expect(homePage).not.to.match(/\.hero\s*\{/u);
  });
});
