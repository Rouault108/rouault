import type { HydrationRegistryProfile } from '../../shared/static-first-profiles.js';

export interface StaticFirstRetainedComponent {
  readonly tag: string;
  readonly kind: 'retained-shell' | 'retained-controller';
  readonly implementationPaths: readonly string[];
  readonly manifest: 'include' | 'exclude';
  readonly manifestModulePaths?: readonly string[];
  readonly manifestExcludeReason?: string;
  readonly hydrationRegistryRequired: boolean;
  readonly hydrationProfiles: readonly HydrationRegistryProfile[];
  readonly allowedFinalHtmlScopes: readonly ('shell' | 'layout')[];
}

export const STATIC_FIRST_RETAINED_COMPONENTS: readonly StaticFirstRetainedComponent[] = [
  {
    tag: 'router-document-host',
    kind: 'retained-shell',
    implementationPaths: ['src/components/app/router-document-host.ts'],
    manifest: 'include',
    manifestModulePaths: ['src/components/app/router-document-host.ts'],
    hydrationRegistryRequired: true,
    hydrationProfiles: ['shell'],
    allowedFinalHtmlScopes: ['shell'],
  },
  {
    tag: 'layout-toc-controller',
    kind: 'retained-controller',
    implementationPaths: ['src/components/layout/layout-toc-controller.ts'],
    manifest: 'exclude',
    manifestExcludeReason: 'hydration-only layout controller; not a public design-system element',
    hydrationRegistryRequired: true,
    hydrationProfiles: ['layout'],
    allowedFinalHtmlScopes: ['layout'],
  },
];
