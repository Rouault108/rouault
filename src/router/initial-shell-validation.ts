import { validateCommittedRuntimeDomLinkContracts } from './dom-link-contract.js';
import type { RouterRuntimeUrlDependencies } from './router-types.js';

export const validateInitialAppShell = (options: {
  readonly urlDependencies: RouterRuntimeUrlDependencies;
  readonly currentAbsoluteUrl: string;
}): void => {
  validateCommittedRuntimeDomLinkContracts({
    root: document,
    sourceLabel: 'initial-shell',
    siteUrlContext: options.urlDependencies.siteUrlContext,
    currentAbsoluteUrl: options.currentAbsoluteUrl,
    routeManifestState: options.urlDependencies.routeManifestState,
  });
  document.dispatchEvent(
    new CustomEvent('app-shell:validated', {
      detail: {
        shellCommitId: 0,
        navigationUrl: window.location.pathname + window.location.search + window.location.hash,
      },
      bubbles: true,
      composed: true,
    }),
  );
};
