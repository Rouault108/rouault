import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import { RouterDocumentHostPostRenderController } from '../../src/components/app/controllers/router-document-host-post-render-controller.js';
import { ReadingPositionController } from '../../src/components/app/controllers/reading-position-controller.js';
import { ownsAcceptedPostCommit } from '../../src/components/app/controllers/accepted-table-geometry.js';
import {
  adoptHistoryEntry,
  readAddress,
  readHistoryEntry,
} from '../../src/navigation/history-entry.js';
import {
  adoptContentBinding,
  beginContentMutation,
  beginNavigationIntent,
  initializeContentContext,
  readContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import {
  commitShellGeneration,
  readCurrentShellCommitId,
  resetShellLifecycleForTest,
} from '../../src/components/app/shell/app-shell-lifecycle.js';
import type {
  NavigationCommitReceipt,
  PostCommitController,
} from '../../src/router/router-types.js';

let controller: RouterDocumentHostPostRenderController | null = null;
afterEach(() => {
  controller?.dispose();
  controller = null;
  releaseContentContext(readContentContext()?.root ?? null);
  resetShellLifecycleForTest();
  vi.restoreAllMocks();
});

const setup = async () => {
  adoptHistoryEntry();
  const host = await fixture(`<div><main id="main-content"><h1>受理済み本文</h1>
    <div data-table-root style="width:120px;overflow-x:auto"><table style="width:360px">
    <tbody>${Array.from({ length: 20 }, () => '<tr><td>全文を保持</td><td>表の操作</td></tr>').join('')}</tbody>
    </table></div></main></div>`);
  const root = host.querySelector<HTMLElement>('main');
  const tableRoot = host.querySelector<HTMLElement>('[data-table-root]');
  if (!root || !tableRoot) throw new Error('表fixtureが必要');
  const epoch = initializeContentContext(root);
  adoptContentBinding(readAddress());
  const intent = beginNavigationIntent('traverse', readAddress());
  const receipt: NavigationCommitReceipt = Object.freeze({
    commitId: 1,
    intentId: intent.intentId,
    entryId: readHistoryEntry()?.id ?? null,
    url: readAddress(),
    contentEpoch: epoch,
    root,
    shellCommitId: readCurrentShellCommitId(),
    stateOnly: false,
  });
  const announce = vi.fn();
  const schedule = vi
    .spyOn(ReadingPositionController.prototype, 'schedule')
    .mockImplementation(() => undefined);
  const focus = vi.spyOn(root, 'focus').mockImplementation(() => undefined);
  controller = new RouterDocumentHostPostRenderController(announce);
  const run = controller.createPostCommitController(host).run;
  const context: Parameters<PostCommitController['run']>[0] = {
    outlet: root,
    previousUrl: readAddress(),
    url: readAddress(),
    isInitial: false,
    stateOnly: false,
    renderedKind: 'page',
    intent,
    receipt,
  };
  return { root, tableRoot, receipt, intent, announce, schedule, focus, run, context };
};

describe('受理後の表準備と位置jobの境界', () => {
  it('railを先に準備し、focus・通知・既存scheduleを一度だけ実行する', async () => {
    const value = await setup();
    const historyLength = history.length;
    await value.run(value.context);
    const rail = value.tableRoot.previousElementSibling;
    expect(rail?.hasAttribute('data-table-scroll-rail')).toBe(true);
    expect(rail?.getAttribute('aria-hidden')).toBe('true');
    expect(value.schedule).toHaveBeenCalledTimes(1);
    expect(value.schedule.mock.calls[0]?.[0].receipt).toBe(value.receipt);
    expect(value.schedule.mock.calls[0]?.[0].root).toBe(value.root);
    expect(value.focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(value.announce).toHaveBeenCalledExactlyOnceWith('ページが読み込まれました');
    expect(history.length).toBe(historyLength);
  });

  it('準備例外でも受理済み本文を保ち、現在のownerの通常scheduleへ進む', async () => {
    const value = await setup();
    const table = value.tableRoot.firstElementChild;
    Object.defineProperty(value.tableRoot, 'clientWidth', {
      configurable: true,
      get() {
        throw new Error('測定不能');
      },
    });
    await value.run(value.context);
    expect(value.schedule).toHaveBeenCalledTimes(1);
    expect(value.schedule.mock.calls[0]?.[0].tablePreparationWithinBudget).toBe(false);
    expect(value.tableRoot.firstElementChild).toBe(table);
    expect(readContentContext()?.displayedBinding.entryId).toBe(value.receipt.entryId);
    expect(readContentContext()?.recoveryRequired).toBe(false);
  });

  it('準備中に新intentが始まった旧ownerはscheduleも後続書込みもしない', async () => {
    const value = await setup();
    let changed = false;
    Object.defineProperty(value.tableRoot, 'clientWidth', {
      configurable: true,
      get() {
        if (!changed) {
          changed = true;
          beginNavigationIntent('navigation', readAddress());
        }
        return 120;
      },
    });
    await value.run(value.context);
    expect(changed).toBe(true);
    expect(value.intent.signal.aborted).toBe(true);
    expect(value.schedule).not.toHaveBeenCalled();
    expect(value.tableRoot.previousElementSibling?.hasAttribute('data-table-scroll-rail')).not.toBe(
      true,
    );
  });

  it('固定receiptとroot/epoch/shell/entry/exact URL/intentの差を拒否する', async () => {
    const value = await setup();
    expect(ownsAcceptedPostCommit(value.root, value.intent, value.receipt)).toBe(true);
    for (const receipt of [
      { ...value.receipt, contentEpoch: value.receipt.contentEpoch + 1 },
      { ...value.receipt, shellCommitId: value.receipt.shellCommitId + 1 },
      { ...value.receipt, entryId: '別entry' },
      { ...value.receipt, url: '/別URL' },
      { ...value.receipt, intentId: value.intent.intentId + 1 },
      { ...value.receipt, root: document.createElement('main') },
    ])
      expect(ownsAcceptedPostCommit(value.root, value.intent, receipt)).toBe(false);
    commitShellGeneration(value.receipt.shellCommitId + 1);
    await value.run(value.context);
    expect(value.schedule).not.toHaveBeenCalled();
    expect(value.focus).not.toHaveBeenCalled();
    expect(value.announce).not.toHaveBeenCalled();
  });

  it('epochが変わった旧receiptから準備や位置jobを開始しない', async () => {
    const value = await setup();
    beginContentMutation(value.root);
    await value.run(value.context);
    expect(value.schedule).not.toHaveBeenCalled();
    expect(value.focus).not.toHaveBeenCalled();
    expect(value.announce).not.toHaveBeenCalled();
  });
});
