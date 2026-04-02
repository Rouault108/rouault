import { HeadManager } from './head-manager.js';
import { LocationAdapter } from './location-adapter.js';
import type { ContentUpdateAdapter, DocumentSnapshot, HistoryMode } from './router-types.js';

interface CommitRequest {
  snapshot: DocumentSnapshot;
  normalizedUrl: string;
  historyMode: HistoryMode;
  state: Record<string, unknown> | undefined;
}

interface PreparedMutation {
  commit(): void | Promise<void>;
  rollback(): void | Promise<void>;
}

export class ContentCommitter {
  private headManager = new HeadManager();

  constructor(
    private outlet: HTMLElement,
    private location: LocationAdapter,
    private contentAdapter?: ContentUpdateAdapter,
  ) {}

  async commit(request: CommitRequest): Promise<void> {
    const previousTitle = document.title;
    const previousMetaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
    const previousUrl = this.location.readCurrentUrl();
    const previousHistoryState: unknown = history.state;
    const preparedMutation = await this.prepareContentMutation(
      request.snapshot,
      request.normalizedUrl,
    );
    let historyApplied = false;

    try {
      this.headManager.setTitle(request.snapshot.title);
      this.headManager.setMetaDescription(request.snapshot.metaDescription);
      await preparedMutation.commit();
      this.applyHistory(request.historyMode, request.normalizedUrl, request.state);
      historyApplied = request.historyMode !== 'none';
    } catch (error) {
      await preparedMutation.rollback();
      this.headManager.setTitle(previousTitle);
      this.headManager.setMetaDescription(previousMetaDescription);

      if (historyApplied) {
        window.history.replaceState(previousHistoryState, '', previousUrl);
      }

      throw error;
    }
  }

  private async prepareContentMutation(
    snapshot: DocumentSnapshot,
    normalizedUrl: string,
  ): Promise<PreparedMutation> {
    if (this.contentAdapter) {
      return this.contentAdapter.prepare({
        html: snapshot.html,
        renderedKind: snapshot.kind,
        navigationUrl: normalizedUrl,
      });
    }

    const previousHtml = this.outlet.innerHTML;
    return {
      commit: () => {
        this.outlet.innerHTML = snapshot.html;
      },
      rollback: () => {
        this.outlet.innerHTML = previousHtml;
      },
    };
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
