import { readFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { buildNotFoundPageMarkup } from '../../src/components/not-found/not-found-page.js';
import { ArticleHeader } from '../../src/components/ui/article-header/article-header.js';
import { Badge } from '../../src/components/ui/badge/badge.js';
import { Banner } from '../../src/components/ui/banner/banner.js';
import { Blockquote } from '../../src/components/ui/blockquote/blockquote.js';
import { Breadcrumbs } from '../../src/components/ui/breadcrumbs/breadcrumbs.js';
import { Callout } from '../../src/components/ui/callout/callout.js';
import { CodeBlock } from '../../src/components/ui/codeblock/codeblock.js';
import { CodePreview } from '../../src/components/ui/code-preview/code-preview.js';
import { FileTree } from '../../src/components/ui/file-tree/file-tree.js';
import { CopyButton } from '../../src/components/ui/copy-button/copy-button.js';
import { Details } from '../../src/components/ui/details/details.js';
import { UiDialog } from '../../src/components/ui/dialog/dialog.js';
import { Dropdown, MenuItem, MenuSeparator } from '../../src/components/ui/dropdown/dropdown.js';
import { DOCUMENT_CSS as FOOTNOTE_DOCUMENT_CSS } from '../../src/components/ui/footnote/footnote.js';
import { InfoBox } from '../../src/components/ui/info-box/info-box.js';
import { DOCUMENT_CSS as POPOVER_DOCUMENT_CSS } from '../../src/components/ui/popover/popover.js';
import { Select } from '../../src/components/ui/select/select.js';
import { SearchField } from '../../src/components/ui/search-field/search-field.js';
import { searchDialogStyles } from '../../src/components/ui/search-dialog/search-dialog.styles.js';
import { SearchTrigger } from '../../src/components/ui/search-trigger/search-trigger.js';
import { SyntaxCard } from '../../src/components/ui/syntax-card/syntax-card.js';
import { SyntaxSection } from '../../src/components/ui/syntax-card/syntax-section.js';
import { Tag } from '../../src/components/ui/tag/tag.js';
import { Switch } from '../../src/components/ui/switch/switch.js';
import { Checkbox } from '../../src/components/ui/checkbox/checkbox.js';
import { FOOTER_DOCUMENT_CSS } from '../../src/components/ui/footer/footer.js';
import { DOCUMENT_CSS as HIGHLIGHT_DOCUMENT_CSS } from '../../src/components/ui/highlight/highlight.js';
import { UiImage } from '../../src/components/ui/image/image.js';
import { UiMath } from '../../src/components/ui/math/math.js';
import { Pagination } from '../../src/components/ui/pagination/pagination.js';
import { UiScore } from '../../src/components/ui/score/score.js';
import { DOCUMENT_CSS as SYNTAX_FIELD_DOCUMENT_CSS } from '../../src/components/ui/syntax-field/syntax-field.js';
import { DOCUMENT_CSS as TABLE_DOCUMENT_CSS } from '../../src/components/ui/table/table.js';
import { UiToast } from '../../src/components/ui/toast/toast.js';
import { DOCUMENT_CSS as TOOLTIP_DOCUMENT_CSS } from '../../src/components/ui/tooltip/tooltip.js';
import { DOCUMENT_CSS as TRANSLATION_DOCUMENT_CSS } from '../../src/components/ui/translation/translation.js';
import { TreeItem } from '../../src/components/ui/tree-item/tree-item.js';
import { DOCUMENT_CSS as UL_DOCUMENT_CSS } from '../../src/components/ui/ul/ul.js';
import { UiVideo } from '../../src/components/ui/video/video.js';
import {
  collectCssText,
  expectCssExcludes,
  expectCssIncludes,
  extractStyleTagCss,
} from './css-contract-test-helpers.js';

describe('css structure contracts', () => {
  it('not-found-page fallback markup が a11y/media rule を保持すること', () => {
    const cssText = extractStyleTagCss(buildNotFoundPageMarkup({ requestedPath: '/missing' }));

    expectCssIncludes(cssText, [
      ':focus-visible',
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
    ]);
  });

  it('article-header が touch / reduced-motion / forced-colors / semantic token 契約を保持すること', () => {
    const cssText = collectCssText(ArticleHeader.styles);

    expectCssIncludes(cssText, [
      '@media (hover: none) and (pointer: coarse)',
      'text-decoration: underline',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      '@media (forced-colors: active)',
      'CanvasText',
      'GrayText',
      'LinkText',
      'var(--fg-default',
      'var(--fg-muted',
      'var(--fg-subtle',
      'var(--focus-ring-color',
      'var(--reading-measure',
    ]);
  });

  it('badge が render state / variant / forced-colors の構造契約を保持すること', () => {
    const cssText = collectCssText(Badge.styles);

    expectCssIncludes(cssText, [
      "data-render-state='empty'",
      "data-variant='solid'",
      "data-variant='subtle'",
      "data-variant='dot'",
      "data-color='primary'",
      "data-color='danger'",
      "data-color='success'",
      "data-color='warning'",
      "data-color='neutral'",
      '@media (forced-colors: active)',
      'ButtonText',
      'ButtonFace',
      'width: 10px',
      'min-width: 8px',
      'border: var(--border-width, 1px) solid ButtonText',
    ]);
  });

  it('breadcrumbs が responsive visibility / motion / forced-colors / print の構造契約を保持すること', () => {
    const cssText = collectCssText(Breadcrumbs.styles);

    expectCssIncludes(cssText, [
      '.breadcrumb-list',
      '.breadcrumb-item',
      '.breadcrumb-link',
      '.breadcrumb-current',
      '.breadcrumb-separator',
      '.breadcrumb-ellipsis-button',
      '@media (max-width: 639px)',
      'display: none !important',
      '@media (forced-colors: active)',
      'LinkText',
      'CanvasText',
      'ButtonText',
      'ButtonFace',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      '@media print',
      'display: none !important',
    ]);
  });

  it('video が breakout / motion / forced-colors / print の構造契約を保持すること', () => {
    const cssText = collectCssText(UiVideo.styles);

    expectCssIncludes(cssText, [
      '.player-shell',
      '.video-element',
      '.overlay-center',
      '.floating-bar',
      '.caption',
      '.fullscreen-caption',
      '.retry-button',
      '.loading-spinner',
      ':host-context(.prose).root',
      'calc(100% + var(--space-8, 2rem))',
      'calc(100% + var(--space-16, 4rem))',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      'animation: none',
      '@media (forced-colors: active)',
      'CanvasText',
      'Highlight',
      '@media print',
      '.player-shell',
      'display: none !important',
    ]);
  });

  it('tag が root token 参照 / interactive surface / forced-colors の構造契約を保持すること', () => {
    const cssText = collectCssText(Tag.styles);

    expectCssIncludes(cssText, [
      '.tag-root',
      '.tag-link',
      '.tag-group',
      '.tag-remove-button',
      '.tag-link::after',
      '.tag-remove-button::after',
      'var(--tag-surface-l',
      'var(--tag-content-l',
      'var(--tag-neutral-bg-chroma',
      'var(--tag-neutral-fg-chroma',
      'var(--tag-accent-bg-chroma',
      'var(--tag-accent-fg-chroma',
      'var(--tag-gold-bg-chroma',
      'var(--tag-gold-fg-chroma',
      'var(--tag-solid-surface-l',
      'var(--tag-solid-neutral-surface-l',
      'var(--tag-solid-fg',
      '@media (forced-colors: active)',
      'CanvasText',
      'LinkText',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
    ]);

    expectCssExcludes(cssText, [
      'prefers-color-scheme',
      ':host-context([data-theme=',
      ":host-context([data-theme='dark'])",
      ':host-context([data-theme="dark"])',
    ]);
  });

  it('switch が role surface / motion / forced-colors の構造契約を保持すること', () => {
    const cssText = collectCssText(Switch.styles);

    expectCssIncludes(cssText, [
      '.track',
      '.thumb',
      '.label',
      '--switch-thumb-size',
      '--switch-track-width',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      '@media (forced-colors: active)',
      'CanvasText',
      'Highlight',
      'outline: 3px solid CanvasText',
    ]);
  });

  it('blockquote が dark-mode token / forced-colors / print 契約を保持すること', () => {
    const cssText = collectCssText(Blockquote.styles);

    expectCssIncludes(cssText, [
      'var(--fg-default',
      'var(--fg-muted',
      'var(--border-default',
      'var(--border-muted',
      '@media (forced-colors: active)',
      'border-inline-start: var(--border-width-thick',
      'forced-color-adjust: auto',
      '.source cite',
      '@media print',
      'break-inside: avoid',
    ]);

    expectCssExcludes(cssText, ['prefers-color-scheme']);
  });

  it('details が disclosure / motion / forced-colors の構造契約を保持すること', () => {
    const cssText = collectCssText(Details.styles);

    expectCssIncludes(cssText, [
      '.trigger',
      '.icon',
      '.summary',
      '.content-wrapper',
      '.content-body',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms !important',
      '@media (forced-colors: active)',
      'CanvasText',
      "variant='bordered'",
      'outline: 2px solid CanvasText',
    ]);
  });

  it('checkbox が role surface / motion / forced-colors の構造契約を保持すること', () => {
    const cssText = collectCssText(Checkbox.styles);

    expectCssIncludes(cssText, [
      '.wrapper',
      '.control',
      '.icon-check',
      '.icon-minus',
      '.error-message',
      "data-state='checked'",
      "data-state='mixed'",
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      '@media (forced-colors: active)',
      'CanvasText',
      'Highlight',
      'HighlightText',
      'outline: 3px solid CanvasText',
    ]);
  });

  it('footer document css が token / forced-colors / print 契約を保持すること', () => {
    expectCssIncludes(FOOTER_DOCUMENT_CSS, [
      '--footer-bg',
      '--footer-fg',
      '--footer-border',
      '--footer-border-width',
      '--footer-max-inline-size',
      '--footer-padding-block',
      '--footer-inner-padding-inline',
      '--footer-gap',
      '--footer-build-fg',
      '--footer-build-font-size',
      '--footer-build-letter-spacing',
      '--footer-build-line-height',
      '--footer-build-font-weight',
      '@media (forced-colors: active)',
      '@media print',
      'CanvasText',
      'display: none !important',
      '.ui-footer__build',
      '.ui-footer__subline',
      '.ui-footer__nav-item',
      'font-size: var(--_footer-build-font-size)',
      'font-weight: var(--_footer-build-font-weight)',
      'letter-spacing: var(--_footer-build-letter-spacing)',
      'line-height: var(--_footer-build-line-height)',
    ]);

    expectCssExcludes(FOOTER_DOCUMENT_CSS, ['prefers-color-scheme']);
  });

  it('highlight document css が media / token 契約を保持すること', () => {
    expectCssIncludes(HIGHLIGHT_DOCUMENT_CSS, [
      '@media (forced-colors: active)',
      '@media print',
      'var(--bg-highlight-subtle)',
      '--bg-highlight-current',
      "data-current-match='true'",
      'text-decoration-line: underline',
    ]);
  });

  it('ui-image が environment / prose / print 契約を保持すること', () => {
    const cssText = collectCssText(UiImage.styles);

    expectCssIncludes(cssText, [
      '@media (prefers-color-scheme: dark)',
      'filter: brightness(var(--brightness-dimmed, 0.85));',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms !important;',
      '@media (forced-colors: active)',
      'border-color: CanvasText;',
      '@media (max-width: 767px)',
      ':host-context(.prose) .caption {',
      'padding-inline: var(--space-4, 1rem);',
      '@media print',
      '.lightbox {',
      'display: none !important;',
    ]);

    expectCssExcludes(cssText, [
      'width: calc(100% + var(--space-8, 2rem));',
      'margin-inline: var(--space-n4, -1rem);',
      'width: calc(100% + var(--space-16, 4rem));',
      'margin-inline: var(--space-n8, -2rem);',
    ]);
  });

  it('ui-math が forced-colors 構造契約を保持すること', () => {
    const cssText = collectCssText(UiMath.styles);

    expectCssIncludes(cssText, [
      '@media (forced-colors: active)',
      '.math-display',
      'CanvasText',
      'mask-image: none',
    ]);
  });

  it('pagination が style contract を保持すること', () => {
    const cssText = collectCssText(Pagination.styles);

    expectCssIncludes(cssText, [
      'prefers-reduced-motion: reduce',
      'forced-colors: active',
      'CanvasText',
      'GrayText',
    ]);
  });

  it('popover が visual mode 構造契約を保持すること', () => {
    const cssText = collectCssText(POPOVER_DOCUMENT_CSS);

    expectCssIncludes(cssText, [
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
      '@media print',
    ]);
  });

  it('score が reduced-motion / forced-colors / print 契約を保持すること', () => {
    const cssText = collectCssText(UiScore.styles);

    expectCssIncludes(cssText, [
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
      '@media print',
      'mask-image: none',
    ]);
  });

  it('syntax-field document css が light-dom / responsive / media 契約を保持すること', () => {
    expectCssIncludes(SYNTAX_FIELD_DOCUMENT_CSS, [
      'ui-syntax-field {',
      'display: contents;',
      '@media (min-width: 768px)',
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
      '@media print',
      'transition-duration: 0.01ms',
      'CanvasText',
      'background-color: transparent !important;',
    ]);
  });

  it('table document css が visual accessibility 契約を保持すること', () => {
    expectCssIncludes(TABLE_DOCUMENT_CSS, [
      '@media (hover: hover) and (pointer: fine)',
      '@media (hover: none) and (pointer: coarse)',
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
      'CanvasText',
    ]);
  });

  it('toast が media style contract を保持すること', () => {
    const cssText = collectCssText(UiToast.styles);

    expectCssIncludes(cssText, [
      '@media (forced-colors: active)',
      '@media (prefers-reduced-motion: reduce)',
      '@media print',
    ]);
  });

  it('tree-item が hierarchy / motion / forced-colors / print の構造契約を保持すること', () => {
    const cssText = collectCssText(TreeItem.styles);

    expectCssIncludes(cssText, [
      '.item-row',
      '.item',
      '.children',
      '.content-icon',
      '.content-icon.hidden',
      '.label-tooltip',
      '.expand-icon',
      '.current-slot-indicator',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      '@media (forced-colors: active)',
      'CanvasText',
      'Highlight',
      'HighlightText',
      '@media print',
      ':host([print-mode]) .expand-icon',
    ]);
  });

  it('ul が scope / token / forced-colors 契約を保持すること', () => {
    const cssText = collectCssText(UL_DOCUMENT_CSS);

    expectCssIncludes(cssText, [
      ':where(.prose ul, ui-ul > ul)',
      '@media (forced-colors: active)',
      'color: CanvasText',
      'var(--fg-muted)',
      'var(--space-2)',
      'var(--space-4)',
      'var(--control-min-touch',
    ]);
  });

  it('callout が forced-colors / semantic token 契約を保持すること', () => {
    const cssText = collectCssText(Callout.styles);

    expectCssIncludes(cssText, [
      '@media (forced-colors: active)',
      'var(--border-width-thick',
      'var(--border-default)',
      'var(--bg-note-subtle)',
      'var(--bg-tip-subtle)',
      'var(--bg-success-subtle)',
      'var(--bg-warning-subtle)',
      'var(--bg-danger-subtle)',
      'var(--fg-muted)',
      'var(--fg-info)',
      'var(--fg-success)',
      'var(--fg-warning)',
      'var(--fg-danger)',
      'stroke-width: 1.5',
    ]);

    expectCssExcludes(cssText, ['prefers-color-scheme']);
  });

  it('code-preview が forced-colors / print / breakout / hierarchy 契約を保持すること', () => {
    const cssText = collectCssText(CodePreview.styles);

    expectCssIncludes(cssText, [
      '@media (forced-colors: active)',
      'border-color: CanvasText',
      'background: Canvas',
      'border-bottom-color: CanvasText',
      'border-bottom-width: var(--border-width-thick, 2px)',
      '@media print',
      'width: 100% !important',
      'margin-inline: 0 !important',
      'border-color: #000 !important',
      'background: transparent !important',
      '.header-tools',
      '.header-toolbar',
      'display: none !important',
      'page-break-inside: avoid',
      'break-inside: avoid',
      '--ui-code-surface-breakout-width: 100%',
      '--ui-code-surface-breakout-margin: 0',
      '--ui-code-surface-radius-top: 0',
      '--ui-code-block-breakout-width: 100%',
      '--ui-code-block-breakout-margin: 0',
      '--ui-code-block-radius-top: 0',
      '--ui-code-group-width: 100%',
      '--ui-code-group-margin-inline: 0',
      '--_ui-code-preview-surface-bg',
      '--ui-code-preview-preview-bg',
      'var(--bg-fill-muted',
      'var(--border-style-subtle',
    ]);
  });

  it('file-tree が loading / motion / forced-colors / print の構造契約を保持すること', () => {
    const cssText = collectCssText(FileTree.styles);

    expectCssIncludes(cssText, [
      '.container',
      '.empty-state',
      '.skeleton',
      '.skeleton-item',
      '@keyframes shimmer',
      "variant='card'",
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      'animation: none',
      '@media (forced-colors: active)',
      'Canvas',
      'CanvasText',
      '@media print',
      ':host([printable])',
      'display: none !important',
      'background: transparent !important',
    ]);
  });

  it('copy-button が state / motion / forced-colors / print の構造契約を保持すること', () => {
    const cssText = collectCssText(CopyButton.styles);

    expectCssIncludes(cssText, [
      '.copy-button-icon-container',
      '.sr-only',
      ":host([state='idle']) ui-icon",
      ":host([state='success']) ui-icon",
      ":host([state='error']) ui-icon",
      '@keyframes flash-copy-success',
      '@keyframes flash-copy-error',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      'animation-duration: 0.01ms',
      '@media (forced-colors: active)',
      'CanvasText',
      'Highlight',
      'outline: 2px solid CanvasText',
      '@media print',
      'display: none',
    ]);
  });

  it('tooltip / select / translation が overlay 関連の CSS token 契約を保持すること', () => {
    const selectSource = readFileSync(
      new URL('../../src/components/ui/select/select.ts', import.meta.url),
      'utf8',
    );
    const selectCssText = collectCssText(Select.styles);

    expectCssIncludes(TOOLTIP_DOCUMENT_CSS, [
      'data-ui-tooltip-content',
      'var(--z-anchored-overlay',
      '@media (forced-colors: active)',
      '@media print',
    ]);

    expectCssIncludes(selectCssText, [
      '.trigger',
      '.icon-chevron',
      '@media (forced-colors: active)',
      '@media print',
    ]);

    expectCssIncludes(selectSource, [
      'data-ui-select-listbox',
      'data-ui-overlay-surface',
      'var(--z-anchored-overlay',
      'AnchoredOverlayController',
    ]);

    expectCssIncludes(TRANSLATION_DOCUMENT_CSS, [
      "[data-surface='popover']",
      "[data-surface='drawer']",
      'var(--z-anchored-overlay',
      'var(--z-non-modal-panel',
    ]);

    expectCssExcludes(TRANSLATION_DOCUMENT_CSS, [
      '--ui-translation-popover-left',
      '--ui-translation-popover-top',
    ]);
  });

  it('footnote / popover の document css が media / token / endnotes 契約を保持すること', () => {
    expectCssIncludes(FOOTNOTE_DOCUMENT_CSS, [
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
      '@media print',
      `section[role='doc-endnotes']`,
      'section.footnotes',
      '> h2#footnote-label',
      'list-style-position: outside',
      'padding-inline-start',
      'li > :first-child',
      'li > :last-child',
      'data-footnote-backref',
      'var(--primary',
    ]);

    expectCssIncludes(POPOVER_DOCUMENT_CSS, [
      'var(--bg-surface-2',
      'var(--fg-default',
      'var(--border-default',
      'var(--z-popover',
    ]);

    if (
      /section(?:\[role=['"]doc-endnotes['"]\]|\.footnotes)\s*\{[^}]*display\s*:\s*none/i.test(
        FOOTNOTE_DOCUMENT_CSS,
      )
    ) {
      throw new Error('endnotes section を非表示にする契約違反があります');
    }

    expectCssExcludes(FOOTNOTE_DOCUMENT_CSS, ["section[role='doc-endnotes'] .sr-only"]);
  });

  it('info-box が forced-colors / semantic token / density / print 契約を保持すること', () => {
    const cssText = collectCssText(InfoBox.styles);

    expectCssIncludes(cssText, [
      '@media (forced-colors: active)',
      'var(--bg-fill-muted',
      'var(--font-semibold',
      'var(--tracking-wide',
      'var(--icon-xs',
      'var(--border-style-subtle',
      ":host([density='compact']) .header",
      ":host([density='compact']) .body",
      '@media print',
      'background: transparent',
      'border: var(--border-style-subtle',
      'var(--fg-muted,',
      'var(--fg-default,',
    ]);

    expectCssExcludes(cssText, ['prefers-color-scheme']);
  });

  it('syntax-card / syntax-section が forced-colors / print 契約を保持すること', () => {
    const syntaxCardCssText = collectCssText(SyntaxCard.styles);
    const syntaxSectionCssText = collectCssText(SyntaxSection.styles);

    expectCssIncludes(syntaxCardCssText, [
      '@media (forced-colors: active)',
      'border-color: CanvasText;',
      '.signature-area',
      '.kind-tag',
      '.copy-action',
      '@media print',
      'display: none;',
      'background: transparent !important;',
    ]);

    expectCssIncludes(syntaxSectionCssText, ['@media (forced-colors: active)', '.section-title']);
  });

  it('dropdown / menu-item / separator が media / forced-colors / print 契約を保持すること', () => {
    const dropdownCssText = collectCssText(Dropdown.styles);
    const menuItemCssText = collectCssText(MenuItem.styles);
    const menuSeparatorCssText = collectCssText(MenuSeparator.styles);

    expectCssIncludes(dropdownCssText, [
      '.panel',
      ".panel[data-position-phase='ready']",
      '@media (prefers-color-scheme: dark)',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      '@media (forced-colors: active)',
      'ButtonFace',
      'ButtonText',
      'CanvasText',
      'GrayText',
      '@media print',
      'display: none !important',
    ]);

    expectCssIncludes(menuItemCssText, [
      'button:hover:not(:disabled)',
      'button:focus-visible:not(:disabled)',
      ":host([variant='danger']) button",
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      '@media (forced-colors: active)',
      'CanvasText',
      'Highlight',
      'HighlightText',
      'GrayText',
      'outline: 3px solid CanvasText',
    ]);

    expectCssIncludes(menuSeparatorCssText, [
      '.separator',
      '@media (forced-colors: active)',
      'CanvasText',
    ]);
  });

  it('dialog が reduced-motion / forced-colors / print / backdrop 契約を保持すること', () => {
    const cssText = collectCssText(UiDialog.styles);

    expectCssIncludes(cssText, [
      'dialog',
      'dialog::backdrop',
      '--ui-dialog-min-width',
      '--ui-dialog-max-width',
      '--ui-dialog-max-height',
      '@keyframes dialog-enter',
      '@keyframes backdrop-enter',
      '@media (prefers-reduced-motion: reduce)',
      'animation-duration: 0.01ms !important',
      '@media (forced-colors: active)',
      'CanvasText',
      'ButtonText',
      '@media print',
      'display: none !important',
    ]);
  });

  it('search-field が token / reduced-motion / forced-colors 契約を保持すること', () => {
    const cssText = collectCssText(SearchField.styles);

    expectCssIncludes(cssText, [
      '.label',
      '.label--hidden',
      '.field',
      '.clear-button',
      '--ui-search-field-height',
      '--ui-search-field-radius',
      '--ui-search-field-bg',
      '--ui-search-field-font-size',
      '--ui-search-field-icon-color',
      '@media (prefers-reduced-motion: reduce)',
      'transition-duration: 0.01ms',
      '@media (forced-colors: active)',
      'Field',
      'FieldText',
      'ButtonText',
    ]);
  });

  it('search-trigger が density / responsive / reduced-motion / forced-colors 契約を保持すること', () => {
    const cssText = collectCssText(SearchTrigger.styles);

    expectCssIncludes(cssText, [
      "ui-button[data-density='compact']::part(button)",
      "ui-button[data-density='icon-only']::part(button)",
      '--search-trigger-rest-background',
      '--search-trigger-hover-background',
      '@media (max-width: 960px)',
      '@media (max-width: 639px)',
      '@media (forced-colors: active)',
      'CanvasText',
      'ButtonFace',
      '@media (prefers-reduced-motion: reduce)',
      'transform: none',
    ]);
  });

  it('search-dialog が token / keyframes / reduced-motion / forced-colors / print 契約を保持すること', () => {
    const cssText = collectCssText(searchDialogStyles);

    expectCssIncludes(cssText, [
      '--ui-search-dialog-max-width',
      '--ui-search-dialog-max-height',
      '--ui-search-dialog-position-top',
      '--ui-search-dialog-body-min-height',
      '.dialog',
      '.result-item',
      ".result-item[aria-selected='true']",
      '.close-button',
      '.footer',
      '@keyframes search-dialog-enter',
      '@keyframes search-backdrop-enter',
      '@media (prefers-reduced-motion: reduce)',
      'animation-duration: 0.01ms !important',
      '@media (forced-colors: active)',
      'CanvasText',
      'Highlight',
      'ButtonText',
      '@media print',
      'display: none !important',
    ]);
  });

  it('banner が variant / reduced-motion / forced-colors / print 契約を保持すること', () => {
    const cssText = collectCssText(Banner.styles);

    expectCssIncludes(cssText, [
      '--ui-banner-fg-color',
      ":host([data-resolved-variant='info'])",
      ":host([data-resolved-variant='success'])",
      ":host([data-resolved-variant='warning'])",
      ":host([data-resolved-variant='error'])",
      '.dismiss',
      ".actions slot::slotted(a[slot='action'][href])",
      '@keyframes banner-enter',
      '@keyframes banner-exit',
      '@media (prefers-reduced-motion: reduce)',
      '@media (forced-colors: active)',
      'CanvasText',
      'GrayText',
      'Highlight',
      'LinkText',
      '@media print',
      'display: none !important',
    ]);

    expectCssExcludes(cssText, ['prefers-color-scheme']);
  });

  it('code-block が forced-colors / print / coarse-pointer 契約を保持すること', () => {
    const cssText = collectCssText(CodeBlock.styles);

    expectCssIncludes(cssText, [
      '.root',
      '.caption',
      '.copy-button-shell',
      '@media (hover: none) and (pointer: coarse)',
      '@media (forced-colors: active)',
      'ButtonText',
      '@media print',
      'page-break-inside: avoid',
      'break-inside: avoid',
      'display: none !important',
      'width: 100% !important',
      'margin-inline: 0 !important',
    ]);
  });
});
