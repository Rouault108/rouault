import type { NavigationShellSnapshot } from '../../../../shared/navigation/navigation-shell-snapshot.js';
import type { SiteUrlContext } from '../../../../shared/site/site-url-context.js';
import type { LoadedInternalDocumentRouteManifestState } from '../../../router/internal-document-route-manifest-loader.js';

export interface RuntimeDomLinkValidationContext {
  readonly siteUrlContext: SiteUrlContext;
  readonly currentAbsoluteUrl: string;
  readonly normalizedNavigationUrl: string;
  readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
}

export interface AppShellCommittedDetail {
  readonly header: HTMLElement;
  readonly navigationUrl: string;
  readonly shell: NavigationShellSnapshot;
  readonly shellCommitId: number;
}

export interface AppShellValidatedDetail extends AppShellCommittedDetail {
  readonly linkValidationContext: RuntimeDomLinkValidationContext;
}

export interface AppShellRestoredDetail {
  readonly header: HTMLElement | null;
  readonly restoredUrl: string;
  readonly failedNavigationUrl: string;
  readonly restoredShellCommitId: number;
  readonly failedShellCommitId: number;
  readonly reason: 'rollback';
}

export interface AppShellRollbackStartDetail {
  readonly failedNavigationUrl: string;
  readonly failedShellCommitId: number;
  readonly previousShellCommitId: number;
  readonly reason: 'rollback';
}

export interface AppContentHydrationReadyDetail {
  readonly contentRoot: HTMLElement;
  readonly initial: boolean;
}
