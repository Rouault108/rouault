import {
  readContentContext,
  subscribeContentContext,
} from '../../../navigation/content-navigation-context.js';
import { readAddress, readHistoryEntry } from '../../../navigation/history-entry.js';
import type {
  ContentUpdatePayload,
  IncomingContentPreparationContext,
  NavigationCommitReceipt,
  PreparedIncomingContent,
} from '../../../router/router-types.js';
import { readCurrentShellCommitId } from '../shell/app-shell-lifecycle.js';

export interface AcceptedIncomingTableArtifact {
  readonly root: HTMLElement;
  readonly contentEpoch: number;
  readonly shellCommitId: number;
  readonly entryId: string | null;
  readonly url: string;
  readonly receipt: NavigationCommitReceipt;
  readonly authoredSerialization: string;
  readonly orderedElements: readonly Element[];
  readonly orderedTextNodes: readonly Text[];
  readonly orderedNodes: readonly Node[];
  readonly tables: readonly {
    readonly root: HTMLElement;
    readonly table: HTMLTableElement;
    readonly ordinal: number;
  }[];
  // claim後の既知geometry変更は呼出側が完全検証し、この関数は固定ownerだけを確認する。
  readonly isCurrent: () => boolean;
  // 同期prepare区間の全document変更を一度だけ引き渡し、既知差の判定はproof層が所有する。
  readonly finishHandoff: () => readonly MutationRecord[] | null;
}

interface IncomingState {
  readonly update: ContentUpdatePayload;
  readonly context: IncomingContentPreparationContext;
  readonly fragment: DocumentFragment;
  readonly authoredSerialization: string;
  readonly nodes: readonly Node[];
  readonly parents: readonly (Node | null)[];
  readonly nextSiblings: readonly (Node | null)[];
  readonly elements: readonly Element[];
  readonly texts: readonly Text[];
  readonly topNodes: readonly Node[];
  readonly tables: AcceptedIncomingTableArtifact['tables'];
  readonly fragmentObserver: MutationObserver;
  rootObserver: MutationObserver | null;
  lifecycleObserver: MutationObserver | null;
  root: HTMLElement | null;
  epoch: number | null;
  receipt: NavigationCommitReceipt | null;
  phase: 'prepared' | 'inserted' | 'accepted' | 'claimed' | 'disposed';
  invalid: boolean;
  handoffFinished: boolean;
  readonly handoffRecords: MutationRecord[];
  stopContext: () => void;
}

const tickets = new WeakMap<PreparedIncomingContent, IncomingState>();
const accepted = new WeakMap<HTMLElement, IncomingState>();

const dispose = (state: IncomingState): void => {
  if (state.phase === 'disposed') return;
  state.phase = 'disposed';
  state.fragmentObserver.disconnect();
  state.rootObserver?.disconnect();
  state.lifecycleObserver?.disconnect();
  state.stopContext();
  if (state.root && accepted.get(state.root) === state) accepted.delete(state.root);
};

const ownerMatches = (state: IncomingState, receipt: NavigationCommitReceipt): boolean => {
  const context = readContentContext();
  return (
    state.root === receipt.root &&
    state.epoch === receipt.contentEpoch &&
    !receipt.stateOnly &&
    Object.isFrozen(receipt) &&
    receipt.root.isConnected &&
    receipt.root.matches('main#main-content') &&
    receipt.root.ownerDocument === document &&
    document.getElementById('main-content') === receipt.root &&
    context?.root === receipt.root &&
    context.contentEpoch === receipt.contentEpoch &&
    !context.mutation &&
    !context.recoveryRequired &&
    context.displayedBinding.entryId === receipt.entryId &&
    context.displayedBinding.url === receipt.url &&
    readAddress() === receipt.url &&
    (readHistoryEntry()?.id ?? null) === receipt.entryId &&
    readCurrentShellCommitId() === receipt.shellCommitId
  );
};

const nodesMatch = (state: IncomingState): boolean =>
  state.nodes.every((node, index) => {
    const parent = state.parents[index];
    return (
      node.ownerDocument === state.root?.ownerDocument &&
      node.parentNode === (parent === state.fragment ? state.root : parent) &&
      node.nextSibling === state.nextSiblings[index]
    );
  }) &&
  state.topNodes.length === state.root?.childNodes.length &&
  state.topNodes.every((node, index) => state.root?.childNodes[index] === node);

const flush = (state: IncomingState): boolean => {
  if (state.fragmentObserver.takeRecords().length || state.rootObserver?.takeRecords().length)
    state.invalid = true;
  return !state.invalid;
};

// source側でも同じnative serializationを使い、所有生成物の限定正規化はproof層へ閉じる。
export const serializeIncomingAuthored = (root: HTMLElement): string => root.innerHTML;

export const prepareHistoryTableIncoming = async (
  update: ContentUpdatePayload,
  context: IncomingContentPreparationContext,
  ownerDocument: Document = document,
): Promise<PreparedIncomingContent | null> => {
  const current = (): boolean => !context.signal.aborted && context.isCurrent();
  if (
    update.renderedKind !== 'page' ||
    !/<table(?:\s|>)/iu.test(update.html) ||
    update.html.length > 524_288 ||
    new TextEncoder().encode(update.html).byteLength > 524_288 ||
    !current()
  )
    return null;
  const serializer = ownerDocument.createElement('template');
  serializer.innerHTML = update.html;
  const preparedFragment = serializer.content;
  const authoredSerialization = serializer.innerHTML;
  if (
    authoredSerialization.length > 524_288 ||
    new TextEncoder().encode(authoredSerialization).byteLength > 524_288
  )
    return null;
  const preparation = { invalid: false };
  let activeState: IncomingState | null = null;
  let transferred = false;
  const observer = new MutationObserver(() => {
    if (activeState) activeState.invalid = true;
    else preparation.invalid = true;
  });
  observer.observe(preparedFragment, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
  const nodes: Node[] = [];
  const parents: (Node | null)[] = [];
  const nextSiblings: (Node | null)[] = [];
  const elements: Element[] = [];
  const texts: Text[] = [];
  const tables: { root: HTMLElement; table: HTMLTableElement; ordinal: number }[] = [];
  const walker = ownerDocument.createTreeWalker(preparedFragment, NodeFilter.SHOW_ALL);
  let node: Node | null;
  let chunkStart = performance.now();
  let textLength = 0;
  try {
    while ((node = walker.nextNode())) {
      if (!current() || preparation.invalid || observer.takeRecords().length) return null;
      nodes.push(node);
      parents.push(node.parentNode);
      nextSiblings.push(node.nextSibling);
      if (nodes.length > 16_384) return null;
      if (node instanceof Element) {
        elements.push(node);
        if (elements.length > 8192) return null;
        if (node instanceof HTMLTableElement) {
          const tableRoot = node.parentElement;
          if (!(tableRoot instanceof HTMLElement) || !tableRoot.matches('[data-table-root]'))
            return null;
          tables.push({ root: tableRoot, table: node, ordinal: tables.length });
        }
      }
      if (node instanceof Text) {
        texts.push(node);
        textLength += node.length;
        if (textLength > 128_000) return null;
      }
      if (performance.now() - chunkStart >= 4) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        chunkStart = performance.now();
      }
    }
    if (!tables.length || !current() || preparation.invalid || observer.takeRecords().length)
      return null;
    const state: IncomingState = {
      update: Object.freeze({ ...update }),
      context,
      fragment: preparedFragment,
      authoredSerialization,
      nodes: Object.freeze(nodes),
      parents: Object.freeze(parents),
      nextSiblings: Object.freeze(nextSiblings),
      elements: Object.freeze(elements),
      texts: Object.freeze(texts),
      topNodes: Object.freeze(Array.from(preparedFragment.childNodes)),
      tables: Object.freeze(tables.map((table) => Object.freeze(table))),
      fragmentObserver: observer,
      rootObserver: null,
      lifecycleObserver: null,
      root: null,
      epoch: null,
      receipt: null,
      phase: 'prepared',
      invalid: false,
      handoffFinished: false,
      handoffRecords: [],
      stopContext: () => {
        // 受理前は購読を持たない。
      },
    };
    const ticket: PreparedIncomingContent = Object.freeze({
      dispose: () => {
        // executionのfinallyは採用済みcontent leaseを破棄しない。
        if (state.phase === 'prepared' || state.phase === 'inserted') dispose(state);
      },
      accepted: (receipt: NavigationCommitReceipt) => {
        if (
          state.phase !== 'inserted' ||
          (state.context.intent !== undefined &&
            receipt.intentId !== state.context.intent.intentId) ||
          !current() ||
          !flush(state) ||
          !ownerMatches(state, receipt)
        )
          return;
        state.receipt = receipt;
        state.phase = 'accepted';
        const previous = accepted.get(receipt.root);
        if (previous && previous !== state) dispose(previous);
        accepted.set(receipt.root, state);
        state.stopContext = subscribeContentContext(() => {
          if (!ownerMatches(state, receipt)) dispose(state);
        });
        state.lifecycleObserver = new MutationObserver(() => {
          if (!ownerMatches(state, receipt)) dispose(state);
        });
        state.lifecycleObserver.observe(receipt.root.ownerDocument, {
          childList: true,
          subtree: true,
        });
      },
    });
    tickets.set(ticket, state);
    activeState = state;
    transferred = true;
    return ticket;
  } finally {
    // ticketへ所有権を移さなかったobserverだけを解放する。
    if (!transferred) observer.disconnect();
  }
};

export const commitHistoryTableIncoming = (
  ticket: PreparedIncomingContent | undefined,
  update: ContentUpdatePayload,
  root: HTMLElement,
): boolean => {
  const state = ticket ? tickets.get(ticket) : undefined;
  if (state?.phase !== 'prepared') return false;
  if (state.context.signal.aborted || !state.context.isCurrent())
    throw new DOMException('superseded incoming content', 'AbortError');
  if (
    state.update.html !== update.html ||
    state.update.navigationUrl !== update.navigationUrl ||
    state.update.renderedKind !== update.renderedKind ||
    !flush(state)
  ) {
    dispose(state);
    return false;
  }
  state.root = root;
  state.epoch = readContentContext()?.contentEpoch ?? null;
  state.rootObserver = new MutationObserver((records) => {
    if (state.phase === 'claimed') {
      if (state.handoffRecords.length + records.length > 16_384) {
        state.invalid = true;
        state.rootObserver?.disconnect();
      } else state.handoffRecords.push(...records);
    } else state.invalid = true;
  });
  state.rootObserver.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeOldValue: true,
    characterDataOldValue: true,
  });
  const removed = Array.from(root.childNodes);
  root.replaceChildren(state.fragment);
  const fragmentRecords = state.fragmentObserver.takeRecords();
  const rootRecords = state.rootObserver.takeRecords();
  const equals = (actual: ArrayLike<Node>, expected: readonly Node[]): boolean =>
    actual.length === expected.length && expected.every((node, index) => actual[index] === node);
  // WebKitはfragmentの移送をtop-level nodeごとのremoval recordへ分割する。
  // 件数ではなく、移送以外の変更がなく全nodeを元の順で一度だけ除いたことを証明する。
  const fragmentRemoved = fragmentRecords.flatMap((record) => Array.from(record.removedNodes));
  const rootRecord = rootRecords[0];
  if (
    fragmentRecords.length === 0 ||
    fragmentRecords.some(
      (record) =>
        record.type !== 'childList' ||
        record.target !== state.fragment ||
        record.addedNodes.length !== 0 ||
        record.removedNodes.length === 0,
    ) ||
    !equals(fragmentRemoved, state.topNodes) ||
    rootRecords.length !== 1 ||
    rootRecord?.type !== 'childList' ||
    rootRecord.target !== root ||
    !equals(rootRecord.addedNodes, state.topNodes) ||
    !equals(rootRecord.removedNodes, removed) ||
    !nodesMatch(state) ||
    root.innerHTML !== state.authoredSerialization
  )
    state.invalid = true;
  state.phase = 'inserted';
  return true;
};

const readArtifact = (
  root: HTMLElement,
  receipt: NavigationCommitReceipt,
  claim: boolean,
): AcceptedIncomingTableArtifact | null => {
  const state = accepted.get(root);
  if (state?.phase !== 'accepted' || state.receipt !== receipt) return null;
  if (
    !ownerMatches(state, receipt) ||
    readContentContext()?.intent?.intentId !== receipt.intentId ||
    !flush(state) ||
    !nodesMatch(state) ||
    root.innerHTML !== state.authoredSerialization
  ) {
    dispose(state);
    return null;
  }
  if (claim) {
    state.phase = 'claimed';
    state.fragmentObserver.disconnect();
    state.rootObserver?.disconnect();
    state.rootObserver?.observe(root.ownerDocument.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeOldValue: true,
      characterDataOldValue: true,
    });
  }
  return Object.freeze({
    root,
    receipt,
    contentEpoch: receipt.contentEpoch,
    shellCommitId: receipt.shellCommitId,
    entryId: receipt.entryId,
    url: receipt.url,
    authoredSerialization: state.authoredSerialization,
    orderedElements: state.elements,
    orderedTextNodes: state.texts,
    orderedNodes: state.nodes,
    tables: state.tables,
    finishHandoff: () => {
      if (!claim || state.phase !== 'claimed' || state.handoffFinished) return null;
      state.handoffFinished = true;
      const records = [...state.handoffRecords, ...(state.rootObserver?.takeRecords() ?? [])];
      state.handoffRecords.length = 0;
      state.rootObserver?.disconnect();
      if (
        state.invalid ||
        records.length > 16_384 ||
        !ownerMatches(state, receipt) ||
        readContentContext()?.intent?.intentId !== receipt.intentId
      )
        return null;
      return Object.freeze(records);
    },
    isCurrent: () =>
      state.phase !== 'disposed' &&
      !state.invalid &&
      ownerMatches(state, receipt) &&
      (state.phase === 'claimed' ||
        (flush(state) && nodesMatch(state) && root.innerHTML === state.authoredSerialization)),
  });
};

export const readAcceptedIncoming = (
  root: HTMLElement,
  receipt: NavigationCommitReceipt,
): AcceptedIncomingTableArtifact | null => readArtifact(root, receipt, false);

export const claimAcceptedIncoming = (
  root: HTMLElement,
  receipt: NavigationCommitReceipt,
): AcceptedIncomingTableArtifact | null => readArtifact(root, receipt, true);
