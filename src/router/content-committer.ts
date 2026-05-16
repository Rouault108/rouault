import { HeadManager } from './head-manager.js';
import { replaceElementChildrenFromHtml } from './declarative-shadow-dom.js';
import { LocationAdapter } from './location-adapter.js';
import type { NavigationEnvelope } from '../../shared/navigation/navigation-envelope.js';
import { validateCommittedRuntimeDomLinkContracts } from './dom-link-contract.js';
import type {
  ContentUpdateAdapter,
  HistoryMode,
  PreparedShellUpdate,
  RouterRuntimeUrlDependencies,
  ShellAdapter,
} from './router-types.js';

interface CommitRequest {
  envelope: NavigationEnvelope;
  normalizedUrl: string;
  historyMode: HistoryMode;
  state: Record<string, unknown> | undefined;
}

interface PreparedMutation {
  commit(): void | Promise<void>;
  rollback(): void | Promise<void>;
}

const createNoopMutation = (): PreparedMutation => ({
  commit() {
    // no-op
  },
  rollback() {
    // no-op
  },
});

const normalizeError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export class ContentCommitter {
  private headManager = new HeadManager();

  constructor(
    private outlet: HTMLElement,
    private location: LocationAdapter,
    private urlDependencies: RouterRuntimeUrlDependencies,
    private contentAdapter?: ContentUpdateAdapter,
    private shellAdapter?: ShellAdapter,
  ) {}

  async commit(request: CommitRequest): Promise<void> {
    const previousTitle = document.title;
    const previousMetaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
    const previousUrl = this.location.readCurrentUrl();
    const previousHistoryState: unknown = history.state;

    const preparedContentMutation = await this.prepareContentMutation(
      request.envelope,
      request.normalizedUrl,
    );
    const preparedShellMutation = await this.prepareShellMutation(
      request.envelope,
      request.normalizedUrl,
    );

    let historyApplied = false;

    try {
      await preparedContentMutation.commit();
      await preparedShellMutation.commit();
      validateCommittedRuntimeDomLinkContracts({
        root: document,
        sourceLabel: `commit:${request.normalizedUrl}`,
        siteUrlContext: this.urlDependencies.siteUrlContext,
        currentUrl: request.normalizedUrl,
        routeManifestState: this.urlDependencies.routeManifestState,
      });

      this.headManager.setTitle(request.envelope.document.title);
      this.headManager.setMetaDescription(request.envelope.document.description);

      this.applyHistory(request.historyMode, request.normalizedUrl, request.state);
      historyApplied = request.historyMode !== 'none';
    } catch (error) {
      const rollbackError = await this.rollbackCommit({
        preparedContentMutation,
        preparedShellMutation,
        previousTitle,
        previousMetaDescription,
        previousUrl,
        previousHistoryState,
        historyApplied,
      });

      if (rollbackError) {
        throw new AggregateError(
          [normalizeError(error), rollbackError],
          'commit に失敗し、rollback にも失敗しました。',
        );
      }

      throw error;
    }
  }

  private async prepareContentMutation(
    envelope: NavigationEnvelope,
    normalizedUrl: string,
  ): Promise<PreparedMutation> {
    if (this.contentAdapter) {
      return this.contentAdapter.prepare({
        html: envelope.document.html,
        renderedKind: envelope.document.renderedKind,
        navigationUrl: normalizedUrl,
      });
    }

    const previousHtml = this.outlet.innerHTML;

    return {
      commit: () => {
        replaceElementChildrenFromHtml(
          this.outlet,
          envelope.document.html,
          this.outlet.ownerDocument,
        );
      },
      rollback: () => {
        replaceElementChildrenFromHtml(this.outlet, previousHtml, this.outlet.ownerDocument);
      },
    };
  }

  private async prepareShellMutation(
    envelope: NavigationEnvelope,
    normalizedUrl: string,
  ): Promise<PreparedMutation> {
    if (!this.shellAdapter?.prepare) {
      return createNoopMutation();
    }

    const preparedShellUpdate: PreparedShellUpdate = await this.shellAdapter.prepare({
      shell: envelope.shellProjection ?? null,
      navigationUrl: normalizedUrl,
    });

    return {
      commit: () => preparedShellUpdate.commit(),
      rollback: () => preparedShellUpdate.rollback(),
    };
  }

  private async rollbackCommit(args: {
    preparedContentMutation: PreparedMutation;
    preparedShellMutation: PreparedMutation;
    previousTitle: string;
    previousMetaDescription: string | null;
    previousUrl: string;
    previousHistoryState: unknown;
    historyApplied: boolean;
  }): Promise<Error | null> {
    let rollbackError: Error | null = null;

    const captureRollbackError = (error: unknown): void => {
      rollbackError ??= normalizeError(error);
    };

    try {
      if (args.historyApplied) {
        window.history.replaceState(args.previousHistoryState, '', args.previousUrl);
      }
    } catch (error) {
      captureRollbackError(error);
    }

    try {
      this.headManager.setTitle(args.previousTitle);
      this.headManager.setMetaDescription(args.previousMetaDescription);
    } catch (error) {
      captureRollbackError(error);
    }

    try {
      await args.preparedShellMutation.rollback();
    } catch (error) {
      captureRollbackError(error);
    }

    try {
      await args.preparedContentMutation.rollback();
    } catch (error) {
      captureRollbackError(error);
    }

    return rollbackError;
  }

  private applyHistory(
    historyMode: HistoryMode,
    normalizedUrl: string,
    state?: Record<string, unknown>,
  ): void {
    if (historyMode === 'push') {
      this.location.push(normalizedUrl, state);
      return;
    }

    if (historyMode === 'replace') {
      this.location.replace(normalizedUrl, state);
    }
  }
}
