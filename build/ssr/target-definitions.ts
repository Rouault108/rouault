import type { SsrComponentProfile } from '../../shared/static-first-profiles.js';

export type { SsrComponentProfile } from '../../shared/static-first-profiles.js';
export type SsrComponentMode = 'shadow' | 'light' | 'none';

export type SsrAdapterKind =
  | 'none'
  | 'light-host-passthrough'
  | 'shadow-default'
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
    tag: 'ui-skip-link',
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
    tag: 'layout-sidebar',
    ssr: 'none',
    profiles: ['layout'],
    adapterKind: 'none',
  },
  {
    tag: 'layout-toc',
    ssr: 'shadow',
    profiles: ['layout'],
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
    tag: 'ui-tabs',
    ssr: 'shadow',
    profiles: ['note'],
    adapterKind: 'shadow-default',
  },
  {
    tag: 'ui-translation',
    ssr: 'light',
    profiles: ['note'],
    adapterKind: 'light-host-passthrough',
  },
  {
    tag: 'ui-video',
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
