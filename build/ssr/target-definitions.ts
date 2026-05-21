import {
  DOCUMENT_CSS as HIGHLIGHT_DOCUMENT_CSS,
  DOCUMENT_STYLE_ID as HIGHLIGHT_DOCUMENT_STYLE_ID,
} from '../../src/components/ui/highlight/highlight.js';
export type SsrComponentProfile = 'shell' | 'note' | 'page';
export type SsrComponentMode = 'shadow' | 'light' | 'none';

export type SsrAdapterKind =
  | 'none'
  | 'light-host-passthrough'
  | 'shadow-default'
  | 'shadow-article-header'
  | 'light-app-router';

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
  {
    tag: 'ui-tag',
    ssr: 'shadow',
    profiles: ['shell', 'note', 'page'],
    adapterKind: 'shadow-default',
  },
  {
    tag: 'ui-skip-link',
    ssr: 'shadow',
    profiles: ['shell'],
    adapterKind: 'shadow-default',
  },
  {
    tag: 'layout-header',
    ssr: 'shadow',
    profiles: ['shell'],
    adapterKind: 'shadow-default',
  },
  {
    tag: 'app-router',
    ssr: 'light',
    profiles: ['shell'],
    adapterKind: 'light-app-router',
  },
  {
    tag: 'ui-article-header',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-article-header',
  },
  {
    tag: 'layout-sidebar',
    ssr: 'none',
    profiles: ['note'],
    adapterKind: 'none',
  },
  {
    tag: 'layout-toc',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-default',
  },
  {
    tag: 'ui-checkbox',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-default',
  },
  {
    tag: 'ui-code-preview',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-default',
  },
  {
    tag: 'ui-preview-sandbox',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-default',
  },
  {
    tag: 'ui-highlight',
    ssr: 'shadow',
    profiles: ['shell'],
    adapterKind: 'shadow-default',
    documentStyle: {
      id: HIGHLIGHT_DOCUMENT_STYLE_ID,
      cssText: HIGHLIGHT_DOCUMENT_CSS,
    },
  },
  {
    tag: 'ui-score',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-default',
  },
  {
    tag: 'ui-tabs',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-default',
  },
  {
    tag: 'ui-translation',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-default',
  },
] as const satisfies readonly SsrComponentDefinition[];

export type SsrComponentTag = (typeof SSR_COMPONENT_DEFINITIONS)[number]['tag'];

const SSR_COMPONENT_DEFINITION_MAP = new Map<string, SsrComponentDefinition>(
  SSR_COMPONENT_DEFINITIONS.map((definition) => [definition.tag, definition]),
);

export const getSsrComponentDefinition = (tag: string): SsrComponentDefinition | undefined =>
  SSR_COMPONENT_DEFINITION_MAP.get(tag);
