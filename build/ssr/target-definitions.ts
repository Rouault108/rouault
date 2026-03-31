import { FOOTER_DOCUMENT_CSS, FOOTER_DOCUMENT_STYLE_ID } from '../../src/components/ui/footer/footer.js';
import {
  DOCUMENT_CSS as TABLE_DOCUMENT_CSS,
  DOCUMENT_STYLE_ID as TABLE_DOCUMENT_STYLE_ID,
} from '../../src/components/ui/table/table.js';
import {
  DOCUMENT_CSS as HIGHLIGHT_DOCUMENT_CSS,
  DOCUMENT_STYLE_ID as HIGHLIGHT_DOCUMENT_STYLE_ID,
} from '../../src/components/ui/highlight/highlight.js';

export type SsrComponentProfile = 'shell' | 'note' | 'page';
export type SsrComponentMode = 'shadow' | 'light' | 'none';

export type SsrAdapterKind =
  | 'none'
  | 'shadow-default'
  | 'shadow-article-header'
  | 'shadow-image'
  | 'light-app-router'
  | 'light-about-page'
  | 'light-layout-footer';

export interface SsrDocumentStyleDefinition {
  readonly id: string;
  readonly cssText: string;
}

export interface SsrComponentDefinition {
  readonly tag: string;
  readonly ssr: SsrComponentMode;
  readonly profiles: readonly SsrComponentProfile[];
  readonly adapterKind: SsrAdapterKind;
  readonly documentStyle?: SsrDocumentStyleDefinition;
}

export const SSR_COMPONENT_DEFINITIONS = [
  { tag: 'ui-icon', ssr: 'none', profiles: ['shell', 'note', 'page'], adapterKind: 'none' },
  { tag: 'ui-tag', ssr: 'shadow', profiles: ['shell', 'note', 'page'], adapterKind: 'shadow-default' },
  { tag: 'ui-skip-link', ssr: 'shadow', profiles: ['shell'], adapterKind: 'shadow-default' },
  { tag: 'layout-header', ssr: 'shadow', profiles: ['shell'], adapterKind: 'shadow-default' },
  { tag: 'app-router', ssr: 'light', profiles: ['shell'], adapterKind: 'light-app-router' },
  {
    tag: 'layout-footer',
    ssr: 'light',
    profiles: ['shell'],
    adapterKind: 'light-layout-footer',
    documentStyle: {
      id: FOOTER_DOCUMENT_STYLE_ID,
      cssText: FOOTER_DOCUMENT_CSS,
    },
  },
  { tag: 'ui-search-dialog', ssr: 'shadow', profiles: ['shell'], adapterKind: 'shadow-default' },
  { tag: 'ui-card', ssr: 'shadow', profiles: ['shell', 'page'], adapterKind: 'shadow-default' },
  { tag: 'about-page', ssr: 'light', profiles: ['page'], adapterKind: 'light-about-page' },
  { tag: 'search-page', ssr: 'shadow', profiles: ['page'], adapterKind: 'shadow-default' },
  { tag: 'tag-page', ssr: 'shadow', profiles: ['page'], adapterKind: 'shadow-default' },
  { tag: 'corpus-page', ssr: 'shadow', profiles: ['page'], adapterKind: 'shadow-default' },
  { tag: 'corpora-overview-page', ssr: 'shadow', profiles: ['page'], adapterKind: 'shadow-default' },
  { tag: 'not-found-page', ssr: 'shadow', profiles: ['page'], adapterKind: 'shadow-default' },
  {
    tag: 'ui-article-header',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-article-header',
  },
  { tag: 'layout-sidebar', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'layout-toc', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'ui-callout', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'ui-checkbox', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'ui-code-preview', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'ui-preview-sandbox', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  {
    tag: 'ui-table',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-default',
    documentStyle: {
      id: TABLE_DOCUMENT_STYLE_ID,
      cssText: TABLE_DOCUMENT_CSS,
    },
  },
  { tag: 'ui-blockquote', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'ui-details', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'ui-divider', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'ui-footnote', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  {
    tag: 'ui-highlight',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-default',
    documentStyle: {
      id: HIGHLIGHT_DOCUMENT_STYLE_ID,
      cssText: HIGHLIGHT_DOCUMENT_CSS,
    },
  },
  { tag: 'ui-image', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-image' },
  { tag: 'ui-info-box', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'ui-score', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'ui-tabs', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
  { tag: 'ui-translation', ssr: 'shadow', profiles: ['note'], adapterKind: 'shadow-default' },
] as const satisfies readonly SsrComponentDefinition[];

export type SsrComponentTag = (typeof SSR_COMPONENT_DEFINITIONS)[number]['tag'];

const SSR_COMPONENT_DEFINITION_MAP = new Map<string, SsrComponentDefinition>(
  SSR_COMPONENT_DEFINITIONS.map((definition) => [definition.tag, definition]),
);

export const getSsrComponentDefinition = (tag: string): SsrComponentDefinition | undefined =>
  SSR_COMPONENT_DEFINITION_MAP.get(tag);