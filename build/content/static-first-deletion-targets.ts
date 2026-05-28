import type { StaticFirstTagClassification } from './static-first-tags.js';
import { getStaticFirstTagClassifications } from './static-first-tags.js';

export type StaticFirstDeletionMode =
  | 'delete-source'
  | 'delete-if-present'
  | 'delete-if-unreferenced';

export interface StaticFirstDeletionTarget {
  readonly tag: string;
  readonly implementationPaths: readonly string[];
  readonly classifications: readonly StaticFirstTagClassification[];
  readonly replacementContract: string;
  readonly deleteMode: StaticFirstDeletionMode;
}

const createDeletionTarget = (
  tag: string,
  implementationPath: string,
  replacementContract: string,
): StaticFirstDeletionTarget => ({
  tag,
  implementationPaths: [implementationPath],
  classifications: getStaticFirstTagClassifications(tag),
  replacementContract,
  deleteMode: 'delete-source',
});

export const STATIC_FIRST_DELETION_TARGETS = [
  createDeletionTarget(
    'ui-article-header',
    'src/components/ui/article-header/article-header.ts',
    'static article header HTML from src/layouts/article-header-html.ts',
  ),
  createDeletionTarget(
    'ui-blockquote',
    'src/components/ui/blockquote/blockquote.ts',
    'native blockquote plus src/assets/css/blockquote.css',
  ),
  createDeletionTarget(
    'ui-breadcrumbs',
    'src/components/ui/breadcrumbs/breadcrumbs.ts',
    'static link markup from src/layouts/link-html.ts',
  ),
  createDeletionTarget(
    'ui-callout',
    'src/components/ui/callout/callout.ts',
    'static callout HTML plus src/assets/css/callout.css',
  ),
  createDeletionTarget(
    'ui-card',
    'src/components/ui/card/card.ts',
    'static card/link-card HTML plus CSS modules',
  ),
  createDeletionTarget(
    'ui-checkbox',
    'src/components/ui/checkbox/checkbox.ts',
    'native checkbox/task-list static markup',
  ),
  createDeletionTarget(
    'ui-code-block',
    'src/components/ui/codeblock/codeblock.ts',
    'figure[data-code-block-root] static code block contract',
  ),
  createDeletionTarget(
    'ui-code-group',
    'src/components/ui/code-group/code-group.ts',
    'section[data-code-group] static code group contract',
  ),
  createDeletionTarget(
    'ui-copy-button',
    'src/components/ui/copy-button/copy-button.ts',
    'static copy button enhancer contract',
  ),
  createDeletionTarget(
    'ui-details',
    'src/components/ui/details/details.ts',
    'native details.details-block static contract',
  ),
  createDeletionTarget(
    'ui-divider',
    'src/components/ui/divider/divider.ts',
    'native hr/static divider contract',
  ),
  createDeletionTarget(
    'ui-footnote',
    'src/components/ui/footnote/footnote.ts',
    'static footnote/endnote HTML contract',
  ),
  createDeletionTarget(
    'ui-highlight',
    'src/components/ui/highlight/highlight.ts',
    'native mark/static highlight contract',
  ),
  createDeletionTarget(
    'ui-image',
    'src/components/ui/image/image.ts',
    'figure/image static media contract',
  ),
  createDeletionTarget(
    'ui-info-box',
    'src/components/ui/info-box/info-box.ts',
    'static info box HTML plus CSS module',
  ),
  createDeletionTarget(
    'ui-math',
    'src/components/ui/math/math.ts',
    'KaTeX static math output',
  ),
  createDeletionTarget('ui-ol', 'src/components/ui/ol/ol.ts', 'native ordered list output'),
  createDeletionTarget('ui-ul', 'src/components/ui/ul/ul.ts', 'native unordered list output'),
  createDeletionTarget('ui-score', 'src/components/ui/score/score.ts', 'static score SVG output'),
  createDeletionTarget(
    'ui-search-field',
    'src/components/ui/search-field/search-field.ts',
    'static search page/dialog input markup',
  ),
  createDeletionTarget(
    'ui-search-trigger',
    'src/components/ui/search-trigger/search-trigger.ts',
    'static search trigger button contract',
  ),
  createDeletionTarget(
    'ui-syntax-card',
    'src/components/ui/syntax-card/syntax-card.ts',
    'static syntax card output',
  ),
  createDeletionTarget(
    'ui-syntax-section',
    'src/components/ui/syntax-card/syntax-section.ts',
    'static syntax section output',
  ),
  createDeletionTarget(
    'ui-syntax-field',
    'src/components/ui/syntax-field/syntax-field.ts',
    'static syntax field output',
  ),
  createDeletionTarget('ui-table', 'src/components/ui/table/table.ts', 'native table output'),
] as const satisfies readonly StaticFirstDeletionTarget[];
