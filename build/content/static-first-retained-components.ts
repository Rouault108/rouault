import type {
  HydrationRegistryProfile,
  SsrComponentProfile,
} from '../../shared/static-first-profiles.js';

export type StaticFirstRetainedComponentKind =
  | 'retained-production'
  | 'retained-shell'
  | 'retained-layout'
  | 'retained-note-stateful'
  | 'retained-controller';

export type StaticFirstManifestPolicy = 'include' | 'exclude';

export type StaticFirstFinalHtmlScope =
  | 'note-stateful-public-light-dom'
  | 'shell'
  | 'page'
  | 'layout'
  | 'note-stateful'
  | 'internal-test'
  | 'none';

export interface StaticFirstRetainedComponent {
  readonly tag: string;
  readonly kind: StaticFirstRetainedComponentKind;
  readonly implementationPaths: readonly string[];
  readonly manifest: StaticFirstManifestPolicy;
  readonly manifestModulePaths?: readonly string[];
  readonly manifestExcludeReason?: string;
  readonly ssrDefinitionRequired: boolean;
  readonly targetAdapterImportRequired: boolean;
  readonly targetAdapterImportPaths?: readonly string[];
  readonly targetAdapterImportExceptionReason?: string;
  readonly hydrationRegistryRequired: boolean;
  readonly ssrProfiles: readonly SsrComponentProfile[];
  readonly hydrationProfiles: readonly HydrationRegistryProfile[];
  readonly allowedFinalHtmlScopes: readonly StaticFirstFinalHtmlScope[];
}

const includeManifest = (
  path: string,
): Pick<StaticFirstRetainedComponent, 'manifest' | 'manifestModulePaths'> => ({
  manifest: 'include',
  manifestModulePaths: [path],
});

const retainedProductionInternal = (tag: string, path: string): StaticFirstRetainedComponent => ({
  tag,
  kind: 'retained-production',
  implementationPaths: [path],
  ...includeManifest(path),
  ssrDefinitionRequired: false,
  targetAdapterImportRequired: false,
  hydrationRegistryRequired: false,
  ssrProfiles: [],
  hydrationProfiles: [],
  allowedFinalHtmlScopes: ['note-stateful'],
});

const retainedSsrComponent = (
  tag: string,
  path: string,
  kind: StaticFirstRetainedComponentKind,
  ssrProfiles: readonly SsrComponentProfile[],
  hydrationProfiles: readonly HydrationRegistryProfile[],
  allowedFinalHtmlScopes: readonly StaticFirstFinalHtmlScope[],
): StaticFirstRetainedComponent => ({
  tag,
  kind,
  implementationPaths: [path],
  ...includeManifest(path),
  ssrDefinitionRequired: true,
  targetAdapterImportRequired: true,
  targetAdapterImportPaths: [path],
  hydrationRegistryRequired: true,
  ssrProfiles,
  hydrationProfiles,
  allowedFinalHtmlScopes,
});

const retainedPureSsrComponent = (
  tag: string,
  path: string,
  kind: StaticFirstRetainedComponentKind,
  ssrProfiles: readonly SsrComponentProfile[],
  hydrationProfiles: readonly HydrationRegistryProfile[],
  allowedFinalHtmlScopes: readonly StaticFirstFinalHtmlScope[],
  targetAdapterImportExceptionReason: string,
): StaticFirstRetainedComponent => ({
  tag,
  kind,
  implementationPaths: [path],
  ...includeManifest(path),
  ssrDefinitionRequired: true,
  targetAdapterImportRequired: false,
  targetAdapterImportExceptionReason,
  hydrationRegistryRequired: true,
  ssrProfiles,
  hydrationProfiles,
  allowedFinalHtmlScopes,
});

export const STATIC_FIRST_RETAINED_COMPONENTS: readonly StaticFirstRetainedComponent[] = [
  retainedPureSsrComponent(
    'router-document-host',
    'src/components/app/router-document-host.ts',
    'retained-shell',
    ['shell'],
    ['shell'],
    ['shell'],
    'router-document-host uses the light-router-document-host string adapter; SSR does not evaluate the HTMLElement module',
  ),
  {
    tag: 'layout-toc-controller',
    kind: 'retained-controller',
    implementationPaths: ['src/components/layout/layout-toc-controller.ts'],
    manifest: 'exclude',
    manifestExcludeReason: 'hydration-only layout controller; not a public design-system element',
    ssrDefinitionRequired: false,
    targetAdapterImportRequired: false,
    hydrationRegistryRequired: true,
    ssrProfiles: [],
    hydrationProfiles: ['layout'],
    allowedFinalHtmlScopes: ['layout'],
  },
  retainedProductionInternal('ui-button', 'src/components/ui/button/button.ts'),
  retainedSsrComponent(
    'ui-code-preview',
    'src/components/ui/code-preview/code-preview.ts',
    'retained-note-stateful',
    ['note'],
    ['note'],
    ['note-stateful'],
  ),
  retainedProductionInternal('ui-dropdown', 'src/components/ui/dropdown/dropdown.ts'),
  retainedProductionInternal('ui-menu-item', 'src/components/ui/dropdown/dropdown.ts'),
  retainedSsrComponent(
    'ui-preview-sandbox',
    'src/components/ui/preview-sandbox/preview-sandbox.ts',
    'retained-note-stateful',
    ['note'],
    ['note'],
    ['note-stateful'],
  ),
  retainedSsrComponent(
    'ui-tabs',
    'src/components/ui/tabs/tabs.ts',
    'retained-note-stateful',
    ['note'],
    ['note'],
    ['note-stateful'],
  ),
  retainedSsrComponent(
    'ui-translation',
    'src/components/ui/translation/translation.ts',
    'retained-note-stateful',
    ['note'],
    ['note'],
    ['note-stateful'],
  ),
  retainedSsrComponent(
    'ui-video',
    'src/components/ui/video/video.ts',
    'retained-note-stateful',
    ['note'],
    ['note'],
    ['note-stateful'],
  ),
];
