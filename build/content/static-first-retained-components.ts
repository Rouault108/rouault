import type {
  HydrationRegistryProfile,
  SsrComponentProfile,
} from '../../shared/static-first-profiles.js';

export type StaticFirstRetainedComponentKind =
  | 'retained-production'
  | 'retained-shell'
  | 'retained-layout'
  | 'retained-note-stateful'
  | 'retained-controller'
  | 'retained-design-system'
  | 'retained-storybook';

export type StaticFirstManifestPolicy = 'include' | 'exclude';

export type StaticFirstFinalHtmlScope =
  | 'note-stateful-public-light-dom'
  | 'shell'
  | 'page'
  | 'layout'
  | 'note-stateful'
  | 'design-system-only'
  | 'storybook-only'
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

const includeManifest = (path: string): Pick<
  StaticFirstRetainedComponent,
  'manifest' | 'manifestModulePaths'
> => ({
  manifest: 'include',
  manifestModulePaths: [path],
});

const retainedDesignSystem = (
  tag: string,
  path: string,
): StaticFirstRetainedComponent => ({
  tag,
  kind: 'retained-design-system',
  implementationPaths: [path],
  ...includeManifest(path),
  ssrDefinitionRequired: false,
  targetAdapterImportRequired: false,
  hydrationRegistryRequired: false,
  ssrProfiles: [],
  hydrationProfiles: [],
  allowedFinalHtmlScopes: ['design-system-only', 'storybook-only', 'internal-test'],
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
    'app-router',
    'src/components/app/app-router.ts',
    'retained-shell',
    ['shell'],
    ['shell'],
    ['shell'],
    'app-router uses the light-app-router string adapter; SSR does not evaluate the HTMLElement module',
  ),
  retainedSsrComponent('layout-header', 'src/components/layout/layout-header.ts', 'retained-shell', [
    'shell',
  ], ['shell'], ['shell']),
  {
    tag: 'layout-sidebar',
    kind: 'retained-layout',
    implementationPaths: ['src/components/layout/layout-sidebar.ts'],
    ...includeManifest('src/components/layout/layout-sidebar.ts'),
    ssrDefinitionRequired: true,
    targetAdapterImportRequired: false,
    targetAdapterImportExceptionReason:
      'layout-sidebar SSR target is a no-op layout host; rendering does not evaluate the custom element module',
    hydrationRegistryRequired: true,
    ssrProfiles: ['layout'],
    hydrationProfiles: ['layout'],
    allowedFinalHtmlScopes: ['layout'],
  },
  retainedDesignSystem(
    'layout-sidebar-surface',
    'src/components/layout/layout-sidebar-surface.ts',
  ),
  {
    tag: 'layout-toc',
    kind: 'retained-layout',
    implementationPaths: ['src/components/layout/layout-toc.ts'],
    ...includeManifest('src/components/layout/layout-toc.ts'),
    ssrDefinitionRequired: true,
    targetAdapterImportRequired: true,
    targetAdapterImportPaths: ['src/components/layout/layout-toc.ts'],
    hydrationRegistryRequired: false,
    ssrProfiles: ['layout'],
    hydrationProfiles: [],
    allowedFinalHtmlScopes: ['layout'],
  },
  {
    tag: 'layout-toc-controller',
    kind: 'retained-controller',
    implementationPaths: ['src/components/layout/layout-toc-controller.ts'],
    manifest: 'exclude',
    manifestExcludeReason:
      'hydration-only layout controller; not a public design-system element',
    ssrDefinitionRequired: false,
    targetAdapterImportRequired: false,
    hydrationRegistryRequired: true,
    ssrProfiles: [],
    hydrationProfiles: ['layout'],
    allowedFinalHtmlScopes: ['layout'],
  },
  retainedDesignSystem('ui-button', 'src/components/ui/button/button.ts'),
  retainedSsrComponent(
    'ui-code-preview',
    'src/components/ui/code-preview/code-preview.ts',
    'retained-note-stateful',
    ['note'],
    ['note'],
    ['note-stateful'],
  ),
  retainedDesignSystem('ui-dialog', 'src/components/ui/dialog/dialog.ts'),
  retainedDesignSystem('ui-dropdown', 'src/components/ui/dropdown/dropdown.ts'),
  retainedDesignSystem('ui-menu-item', 'src/components/ui/dropdown/dropdown.ts'),
  retainedDesignSystem('ui-menu-link', 'src/components/ui/dropdown/dropdown.ts'),
  retainedDesignSystem('ui-menu-separator', 'src/components/ui/dropdown/dropdown.ts'),
  retainedDesignSystem('ui-file-tree', 'src/components/ui/file-tree/file-tree.ts'),
  retainedDesignSystem('ui-header', 'src/components/ui/header/header.ts'),
  retainedDesignSystem('ui-input', 'src/components/ui/input/input.ts'),
  retainedDesignSystem('ui-list', 'src/components/ui/list/list.ts'),
  retainedDesignSystem('ui-list-item', 'src/components/ui/list-item/list-item.ts'),
  retainedDesignSystem('ui-popover', 'src/components/ui/popover/popover.ts'),
  retainedSsrComponent(
    'ui-preview-sandbox',
    'src/components/ui/preview-sandbox/preview-sandbox.ts',
    'retained-note-stateful',
    ['note'],
    ['note'],
    ['note-stateful'],
  ),
  retainedDesignSystem('ui-radio', 'src/components/ui/radio/radio.ts'),
  retainedDesignSystem('ui-radio-group', 'src/components/ui/radio/radio-group.ts'),
  retainedDesignSystem('ui-sidebar', 'src/components/ui/sidebar/sidebar.ts'),
  retainedDesignSystem('ui-sidebar-shell', 'src/components/ui/sidebar-shell/sidebar-shell.ts'),
  retainedSsrComponent('ui-skip-link', 'src/components/ui/skip-link/skip-link.ts', 'retained-shell', [
    'shell',
  ], ['shell'], ['shell']),
  retainedDesignSystem('ui-spinner', 'src/components/ui/spinner/spinner.ts'),
  retainedDesignSystem('ui-switch', 'src/components/ui/switch/switch.ts'),
  retainedSsrComponent('ui-tabs', 'src/components/ui/tabs/tabs.ts', 'retained-note-stateful', [
    'note',
  ], ['note'], ['note-stateful']),
  retainedDesignSystem('ui-tag', 'src/components/ui/tag/tag.ts'),
  retainedDesignSystem('ui-textarea', 'src/components/ui/textarea/textarea.ts'),
  retainedDesignSystem('ui-toast', 'src/components/ui/toast/toast.ts'),
  retainedDesignSystem('ui-toc', 'src/components/ui/toc/toc.ts'),
  retainedDesignSystem('ui-tooltip', 'src/components/ui/tooltip/tooltip.ts'),
  retainedSsrComponent(
    'ui-translation',
    'src/components/ui/translation/translation.ts',
    'retained-note-stateful',
    ['note'],
    ['note'],
    ['note-stateful'],
  ),
  retainedDesignSystem('ui-tree-item', 'src/components/ui/tree-item/tree-item.ts'),
  retainedSsrComponent('ui-video', 'src/components/ui/video/video.ts', 'retained-note-stateful', [
    'note',
  ], ['note'], ['note-stateful']),
];
