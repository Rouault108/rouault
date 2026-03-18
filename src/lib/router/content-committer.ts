import { HeadManager } from './head-manager.js';
import { ShellSynchronizer } from './shell-synchronizer.js';
import type { LoadResult } from './content-loader.js';

export class ContentCommitter {
  private headManager = new HeadManager();
  private shellSynchronizer = new ShellSynchronizer();

  constructor(
    private outlet: HTMLElement,
    private onContentUpdate?: (html: string) => void | Promise<void>,
  ) {}

  async commit(result: LoadResult): Promise<string> {
    switch (result.kind) {
      case 'handler': {
        await this.setContent(result.html);
        return document.title;
      }
      case 'page': {
        this.headManager.setTitle(result.title);
        this.headManager.setMetaDescription(result.metaDescription);
        this.shellSynchronizer.applyFromDocument(result.document);
        await this.setContent(result.html);
        return result.title;
      }
      case 'not-found': {
        this.headManager.setTitle(result.title);
        this.headManager.setMetaDescription(result.metaDescription);
        this.shellSynchronizer.clear();
        await this.setContent(result.html);
        return result.title;
      }
      case 'error': {
        this.headManager.setTitle(result.title);
        this.headManager.setMetaDescription(result.metaDescription);
        this.shellSynchronizer.clear();
        await this.setContent(result.html);
        return result.title;
      }
    }
  }

  private async setContent(html: string): Promise<void> {
    if (this.onContentUpdate) {
      await this.onContentUpdate(html);
      return;
    }

    this.outlet.innerHTML = html;
  }
}