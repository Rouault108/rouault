import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  claimAcceptedIncoming,
  commitHistoryTableIncoming,
  prepareHistoryTableIncoming,
  readAcceptedIncoming,
} from '../../src/components/app/controllers/history-table-incoming.js';
import { readCurrentShellCommitId } from '../../src/components/app/shell/app-shell-lifecycle.js';
import {
  adoptContentBinding,
  beginContentMutation,
  beginNavigationIntent,
  initializeContentContext,
  isNavigationIntentCurrent,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import { readAddress, readHistoryEntry } from '../../src/navigation/history-entry.js';
import { createNavigationCommitReceipt } from '../../src/router/content-committer.js';
import type {
  ContentUpdatePayload,
  PreparedIncomingContent,
} from '../../src/router/router-types.js';
import { fixture } from './harness/browser-fixture.js';

let currentRoot: HTMLElement | null = null;
const tickets: PreparedIncomingContent[] = [];
afterEach(() => {
  releaseContentContext(currentRoot);
  currentRoot = null;
  for (const ticket of tickets) ticket.dispose();
  tickets.length = 0;
  vi.restoreAllMocks();
});

const setup = async (
  html = '<p>前文</p><div data-table-root="true"><table><tbody><tr><td>同一</td><td>同一</td></tr></tbody></table></div><!--末尾-->',
) => {
  const root = await fixture('<main id="main-content"><p>旧本文</p></main>');
  currentRoot = root;
  initializeContentContext(root);
  const intent = beginNavigationIntent('navigation', readAddress());
  const update: ContentUpdatePayload = { html, navigationUrl: readAddress(), renderedKind: 'page' };
  const ticket = await prepareHistoryTableIncoming(update, {
    signal: intent.signal,
    isCurrent: () => isNavigationIntentCurrent(intent),
    intent,
  });
  if (!ticket) throw new Error('incoming fixture was not prepared');
  tickets.push(ticket);
  const insert = () => {
    const contentEpoch = beginContentMutation(root);
    expect(commitHistoryTableIncoming(ticket, update, root)).toBe(true);
    adoptContentBinding(readAddress());
    const receipt = createNavigationCommitReceipt({
      intentId: intent.intentId,
      entryId: readHistoryEntry()?.id ?? null,
      url: readAddress(),
      root,
      contentEpoch,
      shellCommitId: readCurrentShellCommitId(),
      stateOnly: false,
    });
    ticket.accepted?.(receipt);
    return receipt;
  };
  return { root, ticket, update, insert };
};

describe('accepted incoming authored artifact', () => {
  it('UTF-8 byte上限を超えるsnapshotはparse前に対象外へ返す', async () => {
    const walk = vi.spyOn(document, 'createTreeWalker');
    expect(
      await prepareHistoryTableIncoming(
        {
          html: `<div data-table-root="true" title="${'あ'.repeat(180_000)}"><table><tbody><tr><td>本文</td></tr></tbody></table></div>`,
          navigationUrl: readAddress(),
          renderedKind: 'page',
        },
        { signal: new AbortController().signal, isCurrent: () => true },
      ),
    ).toBeNull();
    expect(walk).not.toHaveBeenCalled();
  });

  it('parse済み全nodeを移し固定receiptでclaimしfinally解放後もcontent leaseを保つ', async () => {
    const walk = vi.spyOn(document, 'createTreeWalker');
    const state = await setup();
    const parsed = walk.mock.calls[0]?.[0];
    if (!(parsed instanceof DocumentFragment)) throw new Error('parsed fragment missing');
    const parsedNodes = Array.from(parsed.childNodes);
    const parsedTable = parsed.querySelector('table');
    expect(state.root.textContent).toBe('旧本文');
    const receipt = state.insert();
    state.ticket.dispose();
    const artifact = readAcceptedIncoming(state.root, receipt);
    expect(artifact).not.toBeNull();
    expect(artifact?.authoredSerialization).toBe(state.root.innerHTML);
    expect(artifact?.orderedElements).toEqual(Array.from(state.root.querySelectorAll('*')));
    expect(artifact?.orderedNodes.at(-1)?.nodeType).toBe(Node.COMMENT_NODE);
    expect(artifact?.orderedTextNodes.map((node) => node.data).join('')).toBe('前文同一同一');
    expect(artifact?.tables[0]?.table).toBe(state.root.querySelector('table'));
    expect(artifact?.tables[0]?.table).toBe(parsedTable);
    expect(Array.from(state.root.childNodes)).toEqual(parsedNodes);
    expect(parsed.childNodes.length).toBe(0);
    expect(Object.isFrozen(artifact)).toBe(true);
    expect(Object.isFrozen(artifact?.orderedNodes)).toBe(true);
    const claim = claimAcceptedIncoming(state.root, receipt);
    expect(claim?.finishHandoff()).toEqual([]);
    expect(claim?.finishHandoff()).toBeNull();
    expect(claim?.isCurrent()).toBe(true);
    expect(claimAcceptedIncoming(state.root, receipt)).toBeNull();
    expect(commitHistoryTableIncoming(state.ticket, state.update, state.root)).toBe(false);
  });

  it('準備後のfragment往復変更を通常commitへの縮退として返す', async () => {
    const walk = vi.spyOn(document, 'createTreeWalker');
    const state = await setup();
    const parsed = walk.mock.calls[0]?.[0];
    if (!(parsed instanceof DocumentFragment)) throw new Error('parsed fragment missing');
    const cell = parsed.querySelector('td');
    if (!cell) throw new Error('parsed cell missing');
    cell.setAttribute('data-unknown', 'x');
    cell.removeAttribute('data-unknown');
    await Promise.resolve();
    expect(commitHistoryTableIncoming(state.ticket, state.update, state.root)).toBe(false);
    expect(state.root.textContent).toBe('旧本文');
  });

  it('異なるpayloadではticketを使わず通常commitへ返す', async () => {
    const state = await setup();
    expect(
      commitHistoryTableIncoming(
        state.ticket,
        { ...state.update, html: '<p>別内容</p>' },
        state.root,
      ),
    ).toBe(false);
    expect(state.root.textContent).toBe('旧本文');
    expect(commitHistoryTableIncoming(state.ticket, state.update, state.root)).toBe(false);
  });

  it('挿入前に新intentがあれば本文を変更せず中止する', async () => {
    const state = await setup();
    beginNavigationIntent('navigation', readAddress());
    expect(() => commitHistoryTableIncoming(state.ticket, state.update, state.root)).toThrow(
      'superseded',
    );
    expect(state.root.textContent).toBe('旧本文');
  });

  it.each(['attribute', 'text', 'same-markup-node-replacement', 'same-markup-order'] as const)(
    'claim前の%sをqueued recordsまたは全identityで拒否する',
    async (mutation) => {
      const state = await setup();
      const receipt = state.insert();
      const cells = Array.from(state.root.querySelectorAll('td'));
      const first = cells[0];
      const second = cells[1];
      if (!first || !second) throw new Error('missing cells');
      if (mutation === 'attribute') {
        first.setAttribute('data-unknown', 'x');
        first.removeAttribute('data-unknown');
      }
      if (mutation === 'text') {
        const text = first.firstChild;
        if (!text) throw new Error('missing text');
        text.textContent = '別';
        text.textContent = '同一';
      }
      if (mutation === 'same-markup-node-replacement') first.replaceWith(first.cloneNode(true));
      if (mutation === 'same-markup-order') first.parentNode?.insertBefore(second, first);
      expect(readAcceptedIncoming(state.root, receipt)).toBeNull();
      expect(claimAcceptedIncoming(state.root, receipt)).toBeNull();
    },
  );

  it.each(['attribute', 'child-roundtrip'] as const)(
    'connected callbackによる挿入中の%sもproofを拒否する',
    async (mutation) => {
      const tag = 'incoming-artifact-mutator';
      if (!customElements.get(tag))
        customElements.define(
          tag,
          class extends HTMLElement {
            connectedCallback() {
              if (this.getAttribute('data-mutation') === 'child-roundtrip') {
                const sibling = this.nextSibling;
                const parent = this.parentNode;
                if (sibling && parent) {
                  const next = sibling.nextSibling;
                  parent.removeChild(sibling);
                  parent.insertBefore(sibling, next);
                }
                return;
              }
              this.setAttribute('data-unknown', 'x');
              this.removeAttribute('data-unknown');
            }
          },
        );
      const state = await setup(
        `<${tag} data-mutation="${mutation}"></${tag}><div data-table-root="true"><table><tbody><tr><td>本文</td></tr></tbody></table></div>`,
      );
      const receipt = state.insert();
      expect(state.root.querySelector(tag)).not.toBeNull();
      expect(readAcceptedIncoming(state.root, receipt)).toBeNull();
    },
  );

  it('claimは未知変更の往復とroot外の変更もhandoffへ残す', async () => {
    const state = await setup();
    const receipt = state.insert();
    const claim = claimAcceptedIncoming(state.root, receipt);
    if (!claim) throw new Error('claim missing');
    state.root.setAttribute('data-unknown', 'x');
    state.root.removeAttribute('data-unknown');
    document.body.setAttribute('data-incoming-outside', 'x');
    document.body.removeAttribute('data-incoming-outside');
    await Promise.resolve();
    const records = claim.finishHandoff();
    expect(
      records?.map((record) => [record.target, record.attributeName, record.oldValue]),
    ).toEqual([
      [state.root, 'data-unknown', null],
      [state.root, 'data-unknown', 'x'],
      [document.body, 'data-incoming-outside', null],
      [document.body, 'data-incoming-outside', 'x'],
    ]);
  });

  it('rollbackの新epochと再parseには旧receiptを再採用しない', async () => {
    const state = await setup();
    const receipt = state.insert();
    const claim = claimAcceptedIncoming(state.root, receipt);
    claim?.finishHandoff();
    beginContentMutation(state.root);
    state.root.innerHTML = '<p>旧本文</p>';
    adoptContentBinding(readAddress());
    expect(claim?.isCurrent()).toBe(false);
    expect(readAcceptedIncoming(state.root, receipt)).toBeNull();
  });

  it('同scalarでも別receipt実体・新intentにはclaimしない', async () => {
    const state = await setup();
    const receipt = state.insert();
    expect(readAcceptedIncoming(state.root, Object.freeze({ ...receipt }))).toBeNull();
    beginNavigationIntent('navigation', readAddress());
    expect(claimAcceptedIncoming(state.root, receipt)).toBeNull();
  });
});
