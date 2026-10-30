import {
  isNavigationIntentCurrent,
  readContentContext,
  type NavigationIntent,
} from '../navigation/content-navigation-context.js';
import { readAddress, readHistoryEntry } from '../navigation/history-entry.js';
import { HeadManager } from './head-manager.js';
import { replaceElementChildrenFromHtml } from './html-fragment.js';
import { LocationAdapter } from './location-adapter.js';
import type { NavigationEnvelope } from '../../shared/navigation/navigation-envelope.js';
import { validateCommittedRuntimeDomLinkContracts } from './dom-link-contract.js';
import {
  commitShellGeneration,
  readCurrentShellCommitId,
  reserveShellCommitId,
  restoreShellGeneration,
  recordValidatedShellProof,
} from '../components/app/shell/app-shell-lifecycle.js';
import type {
  AppShellCommittedDetail,
  AppShellRollbackStartDetail,
  AppShellRestoredDetail,
  AppShellValidatedDetail,
  RuntimeDomLinkValidationContext,
} from '../components/app/shell/app-shell-events.js';
import { STATIC_HEADER_ROOT_SELECTOR } from '../../shared/navigation/static-header-contract.js';
import type {
  ContentUpdateAdapter,
  HistoryMode,
  NavigationCommitReceipt,
  PreparedContentUpdate,
  PreparedShellUpdate,
  RouterRuntimeUrlDependencies,
  ShellAdapter,
} from './router-types.js';

interface CommitRequest {
  envelope: NavigationEnvelope;
  normalizedUrl: string;
  historyMode: HistoryMode;
  state: Record<string, unknown> | undefined;
  intent?: NavigationIntent;
  signal?: AbortSignal;
}

type PreparedMutation = PreparedContentUpdate;

const createNoopMutation = (): PreparedMutation => ({
  commitTiming: 'synchronous',
  commit(): undefined {
    return undefined;
  },
  rollback() {
    // no-op
  },
});

const normalizeError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const dispatchShellValidated = (detail: AppShellValidatedDetail): void => {
  recordValidatedShellProof(detail, document);
  document.dispatchEvent(
    new CustomEvent<AppShellValidatedDetail>('app-shell:validated', { detail }),
  );
};

const dispatchShellRestored = (detail: AppShellRestoredDetail): void => {
  document.dispatchEvent(new CustomEvent<AppShellRestoredDetail>('app-shell:restored', { detail }));
};

const dispatchShellRollbackStart = (detail: AppShellRollbackStartDetail): void => {
  document.dispatchEvent(
    new CustomEvent<AppShellRollbackStartDetail>('app-shell:rollback-start', { detail }),
  );
};

let nextCommitId = 0;

export const createNavigationCommitReceipt = (
  lifetime: Omit<NavigationCommitReceipt, 'commitId'>,
): NavigationCommitReceipt => Object.freeze({ ...lifetime, commitId: ++nextCommitId });

export interface CommittedContentLifetime {
  readonly receipt: NavigationCommitReceipt;
  readonly postAcceptanceError?: Error;
  readonly contentEpoch: number;
  readonly shellCommitId: number;
}

export class ContentCommitter {
  private headManager = new HeadManager();

  constructor(
    private outlet: HTMLElement,
    private location: LocationAdapter,
    private urlDependencies: RouterRuntimeUrlDependencies,
    private contentAdapter?: ContentUpdateAdapter,
    private shellAdapter?: ShellAdapter,
  ) {}

  async commit(request: CommitRequest): Promise<CommittedContentLifetime> {
    const previousTitle = document.title;
    const previousMetaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
    const previousUrl = this.location.readCurrentUrl();
    const previousBinding = readContentContext()?.displayedBinding ?? {
      entryId: null,
      url: previousUrl,
    };
    const previousShellCommitId = readCurrentShellCommitId();
    const shellCommitId = reserveShellCommitId();

    const preparedContentMutation = await this.prepareContentMutation(
      request.envelope,
      request.normalizedUrl,
    );
    const preparedShellMutation = await this.prepareShellMutation(
      request.envelope,
      request.normalizedUrl,
      shellCommitId,
    );
    // DOMを書き始める前の宣言だけを採用し、受理時のcurrent値で保証を昇格しない。
    const declaredSynchronousCommit =
      preparedContentMutation.commitTiming === 'synchronous' &&
      preparedShellMutation.commitTiming === 'synchronous';
    let synchronousCommit = declaredSynchronousCommit;

    const checkCurrent = (): void => {
      if (request.signal?.aborted || (request.intent && !isNavigationIntentCurrent(request.intent)))
        throw new DOMException('superseded', 'AbortError');
    };
    checkCurrent();
    let historyApplied = false;
    const acceptance: { receipt: NavigationCommitReceipt | null } = { receipt: null };
    const isHistoryApplied = (): boolean => historyApplied;
    let validatedDetail: AppShellValidatedDetail;
    let contentEpoch = 0;
    let contentRoot = this.outlet;

    const accept = (): void => {
      historyApplied = true;
      acceptance.receipt = createNavigationCommitReceipt({
        intentId: request.intent?.intentId ?? null,
        entryId: readHistoryEntry()?.id ?? null,
        url: readAddress(),
        contentEpoch,
        root: contentRoot,
        shellCommitId,
        stateOnly: false,
        ...(synchronousCommit ? { commitTiming: 'synchronous' as const } : {}),
      });
    };
    try {
      checkCurrent();
      const contentCommit = preparedContentMutation.commit();
      // 型外のadapterが同期宣言に違反した場合も、既存awaitを保って保証だけ取り下げる。
      if (contentCommit !== undefined) synchronousCommit = false;
      await contentCommit;
      contentEpoch = readContentContext()?.contentEpoch ?? 0;
      contentRoot = readContentContext()?.root ?? this.outlet;
      checkCurrent();
      const shellCommit = preparedShellMutation.commit();
      if (shellCommit !== undefined) synchronousCommit = false;
      await shellCommit;
      checkCurrent();
      commitShellGeneration(shellCommitId);
      const header = document.querySelector<HTMLElement>(STATIC_HEADER_ROOT_SELECTOR);
      if (!(header instanceof HTMLElement)) {
        throw new Error(`committed ${STATIC_HEADER_ROOT_SELECTOR} is required.`);
      }
      const committedDetail: AppShellCommittedDetail = {
        header,
        shell: request.envelope.shell,
        shellCommitId,
        navigationUrl: request.normalizedUrl,
      };
      document.dispatchEvent(
        new CustomEvent<AppShellCommittedDetail>('app-shell:committed', {
          detail: committedDetail,
        }),
      );
      const linkValidationContext: RuntimeDomLinkValidationContext = {
        siteUrlContext: this.urlDependencies.siteUrlContext,
        currentAbsoluteUrl: new URL(
          request.normalizedUrl,
          `${this.urlDependencies.siteUrlContext.siteOrigin}${this.urlDependencies.siteUrlContext.basePath}/`,
        ).href,
        normalizedNavigationUrl: request.normalizedUrl,
        routeManifestState: this.urlDependencies.routeManifestState,
      };
      validateCommittedRuntimeDomLinkContracts({
        root: document,
        sourceLabel: `commit:${request.normalizedUrl}`,
        ...linkValidationContext,
      });
      validatedDetail = {
        ...committedDetail,
        linkValidationContext,
      };

      this.headManager.setTitle(request.envelope.document.title);
      this.headManager.setMetaDescription(request.envelope.document.description);

      checkCurrent();
      this.applyHistory(
        request.historyMode,
        request.normalizedUrl,
        request.state,
        accept,
        checkCurrent,
      );
      if (request.historyMode === 'none') {
        checkCurrent();
        if (
          this.location.normalizeInternalDocumentUrl(readAddress()) !== request.normalizedUrl ||
          (request.intent &&
            (readAddress() !== request.intent.target.url ||
              (readHistoryEntry()?.id ?? null) !== request.intent.target.entryId))
        )
          throw new DOMException('history target changed', 'AbortError');
        accept();
      }
    } catch (error) {
      if (isHistoryApplied() && acceptance.receipt)
        return {
          contentEpoch,
          shellCommitId,
          receipt: acceptance.receipt,
          postAcceptanceError: normalizeError(error),
        };
      const rollbackError = await this.rollbackCommit({
        preparedContentMutation,
        preparedShellMutation,
        previousTitle,
        previousMetaDescription,
        previousUrl,
        previousBinding,
        previousShellCommitId,
        failedShellCommitId: shellCommitId,
        failedNavigationUrl: request.normalizedUrl,
      });

      if (rollbackError) {
        throw new AggregateError(
          [normalizeError(error), rollbackError],
          'commit に失敗し、rollback にも失敗しました。',
          { cause: error },
        );
      }

      throw error;
    }
    // 通知後のenhancement失敗で、成功済みの文書transactionを巻き戻さない。
    const receipt = acceptance.receipt;
    if (!receipt) throw new Error('document commit was not accepted');
    try {
      dispatchShellValidated(validatedDetail);
    } catch (error) {
      return { contentEpoch, shellCommitId, receipt, postAcceptanceError: normalizeError(error) };
    }
    return { contentEpoch, shellCommitId, receipt };
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
      commitTiming: 'synchronous',
      commit: (): undefined => {
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
    shellCommitId: number,
  ): Promise<PreparedMutation> {
    if (!this.shellAdapter?.prepare) {
      return createNoopMutation();
    }

    const preparedShellUpdate: PreparedShellUpdate = await this.shellAdapter.prepare({
      shell: envelope.shell,
      navigationUrl: normalizedUrl,
      shellCommitId,
    });

    return preparedShellUpdate;
  }

  private async rollbackCommit(args: {
    preparedContentMutation: PreparedMutation;
    preparedShellMutation: PreparedMutation;
    previousTitle: string;
    previousMetaDescription: string | null;
    previousUrl: string;
    previousBinding: import('../navigation/content-navigation-context.js').ContentBinding;
    previousShellCommitId: number;
    failedShellCommitId: number;
    failedNavigationUrl: string;
  }): Promise<Error | null> {
    const rollbackErrors: Error[] = [];

    const captureRollbackError = (error: unknown): void => {
      if (rollbackErrors.length === 0) rollbackErrors.push(normalizeError(error));
    };

    dispatchShellRollbackStart({
      failedNavigationUrl: args.failedNavigationUrl,
      failedShellCommitId: args.failedShellCommitId,
      previousShellCommitId: args.previousShellCommitId,
      reason: 'rollback',
    });

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

    const rollbackError = rollbackErrors[0] ?? null;
    if (rollbackError === null) {
      restoreShellGeneration(args.previousShellCommitId);
      dispatchShellRestored({
        header: document.querySelector<HTMLElement>(STATIC_HEADER_ROOT_SELECTOR),
        restoredUrl: args.previousUrl,
        contentEpoch: readContentContext()?.contentEpoch ?? 0,
        contentBinding: args.previousBinding,
        failedNavigationUrl: args.failedNavigationUrl,
        restoredShellCommitId: args.previousShellCommitId,
        failedShellCommitId: args.failedShellCommitId,
        reason: 'rollback',
      });
    }

    return rollbackError;
  }

  private applyHistory(
    historyMode: HistoryMode,
    normalizedUrl: string,
    state?: Record<string, unknown>,
    onDurable?: () => void,
    beforeWrite?: () => void,
  ): void {
    if (historyMode === 'push') {
      this.location.push(normalizedUrl, state, onDurable, beforeWrite);
      return;
    }

    if (historyMode === 'replace') {
      this.location.replace(normalizedUrl, state, onDurable, beforeWrite);
    }
  }
}
