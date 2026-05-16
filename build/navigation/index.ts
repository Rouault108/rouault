export { buildNoteNavigationModel } from './build-note-navigation-model.js';
export {
  SidebarNavHtmlInvariantError,
  validateSidebarNavHtmlInvariant,
} from './sidebar-nav-html-invariant.js';
export type { SidebarNavHtmlInvariantInput } from './sidebar-nav-html-invariant.js';
export { validateDocumentSidebarIdentityContract } from './sidebar-identity-dom-contract.js';
export { normalizeNoteNavigationUrl } from '../../shared/navigation/normalize-note-navigation-url.js';
export { normalizeNotePath } from '../../shared/navigation/normalize-note-path.js';
export type {
  BreadcrumbItem,
  BuildNoteNavigationModelInput,
  NormalizedNotePath,
  NoteNavigationEntry,
  NoteNavigationKind,
  NoteNavigationModel,
  NormalizeNotePathInput,
  SidebarScope,
  SidebarScopeRule,
} from '../../shared/navigation/navigation-types.js';
export { createSidebarGroupId, parseSidebarGroupId } from '../../shared/navigation/sidebar-group-id.js';
export { DEFAULT_SIDEBAR_ID, DEFAULT_SIDEBAR_STATE_SCOPE_ID } from '../../shared/navigation/sidebar-shell-defaults.js';
export {
  buildFixtureInternalDocumentRouteSet,
  buildInternalDocumentRouteSetForSourceRoot,
  buildProductionInternalDocumentRouteSet,
  type ContentDerivedInternalDocumentRoutes,
  type ContentRouteSetKind,
  type NoteRouteSeed,
} from './internal-document-routes.js';
export {
  STATIC_DOCUMENT_ROUTES,
  isStaticDocumentRoute,
  staticDocumentRouteSet,
  type StaticDocumentRoute,
} from './static-document-routes.js';
export {
  createInternalDocumentRouteSet,
  normalizeInternalDocumentRoutePathname,
  routeSetIncludesPathname,
  InternalDocumentRouteSetContractError,
  type InternalDocumentRoutePathname,
  type InternalDocumentRouteSet,
} from '../../shared/navigation/internal-document-route-set.js';
export { resolveNotePermalink } from '../../shared/note/resolve-note-permalink.js';
export {
  buildInternalDocumentRouteManifest,
  emitInternalDocumentRouteManifest,
  renderInternalDocumentRouteManifest,
  type BuildInternalDocumentRouteManifestOptions,
} from './internal-document-route-manifest.js';
