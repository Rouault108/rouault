import type { RuntimeSidebarShellSnapshot } from '../../../../shared/navigation/navigation-shell-snapshot.js';
import {
  isNavigationIntentCurrent,
  readContentContext,
} from '../../../navigation/content-navigation-context.js';
import { readAddress, readHistoryEntry } from '../../../navigation/history-entry.js';
import { readCurrentShellCommitId } from './app-shell-lifecycle.js';

const SOURCE_URL = '/notes/testing/reader-basic';
const TARGET_URL = '/notes/testing/toc-readable-long-heading';
const inScope = (url: string, path: string): boolean => url === path || url === `${path}/`;

type PresentSidebar = Extract<RuntimeSidebarShellSnapshot, { present: true }>;

export interface SidebarTraverseSelectionPatch {
  commit(): boolean;
  rollback(): boolean;
}

const metadata = (snapshot: PresentSidebar): string =>
  JSON.stringify([
    snapshot.sidebarId,
    snapshot.stateScopeId,
    snapshot.initialExpandedIds,
    snapshot.topologyRevision,
    snapshot.heading,
    snapshot.fixedBreakpoint,
    snapshot.presentation,
  ]);

const parseNav = (html: string, owner: Document): HTMLElement | null => {
  const template = owner.createElement('template');
  template.innerHTML = html.trim();
  const nav = template.content.firstElementChild;
  if (
    !(nav instanceof HTMLElement) ||
    !nav.matches('nav[data-sidebar-nav]') ||
    template.content.childNodes.length !== 1
  )
    return null;
  return nav;
};

const withoutSelection = (nav: HTMLElement): string => {
  const clone = nav.cloneNode(true) as HTMLElement;
  for (const element of [clone, ...clone.querySelectorAll('[aria-current]')])
    element.removeAttribute('aria-current');
  return clone.outerHTML;
};

const validSelection = (nav: HTMLElement, snapshot: PresentSidebar, url: string): boolean => {
  const selected = nav.querySelectorAll('[aria-current]');
  const link = selected[0];
  const row = link?.closest('li[data-node-id]');
  return (
    selected.length === 1 &&
    !nav.hasAttribute('aria-current') &&
    link instanceof HTMLAnchorElement &&
    link.matches('a[data-sidebar-nav-control]') &&
    link.getAttribute('aria-current') === 'page' &&
    row?.getAttribute('data-node-kind') === 'leaf' &&
    row.getAttribute('data-node-id') === snapshot.selectedId &&
    snapshot.selectedId === url.slice('/notes/'.length) &&
    row.querySelector(':scope > a') === link &&
    link.getAttribute('href') === url
  );
};

export const prepareSidebarTraverseSelectionPatch = (options: {
  root: HTMLElement;
  navigationUrl: string;
  previous: RuntimeSidebarShellSnapshot;
  next: RuntimeSidebarShellSnapshot;
  readCurrentSnapshot: () => RuntimeSidebarShellSnapshot;
}): SidebarTraverseSelectionPatch | null => {
  // URLだけで一般化せず、単一の検証経路と実projectionの一致を独立に要求する。
  try {
    const { root, previous, next } = options;
    const context = readContentContext();
    const intent = context?.intent;
    const host = root.ownerDocument.querySelector<HTMLElement>('[data-app-shell-sidebar-host]');
    const surface = root.querySelector<HTMLElement>('[data-layout-sidebar-surface]');
    const nav = surface?.querySelector<HTMLElement>('nav[data-sidebar-nav]');
    if (
      !context ||
      context.mutation ||
      !context.root?.isConnected ||
      !context.root.matches('main#main-content') ||
      context.root.ownerDocument !== root.ownerDocument ||
      !intent ||
      !isNavigationIntentCurrent(intent) ||
      intent.cause !== 'traverse' ||
      !inScope(context.displayedBinding.url, SOURCE_URL) ||
      !inScope(intent.target.url, TARGET_URL) ||
      options.navigationUrl !== TARGET_URL ||
      !context.displayedBinding.entryId ||
      !intent.target.entryId ||
      context.displayedBinding.entryId === intent.target.entryId ||
      !previous.present ||
      !next.present ||
      metadata(previous) !== metadata(next) ||
      !host ||
      !surface ||
      !nav ||
      previous.heading !== null ||
      surface.childElementCount !== 1 ||
      surface.firstElementChild !== nav
    )
      return null;
    // payloadはrouter正規化後のURL、intent/addressはbrowser entryのexact URLである。
    // direct表示の末尾slashを消さず、両者のscopeと所有権を別々に照合する。
    const binding = context.displayedBinding;
    const contentRoot = context.root;
    const epoch = context.contentEpoch;
    const generation = readCurrentShellCommitId();
    const sameOwner = (): boolean => {
      const current = readContentContext();
      return (
        current?.root === contentRoot &&
        contentRoot.isConnected &&
        current.intent?.intentId === intent.intentId &&
        isNavigationIntentCurrent(intent) &&
        current.displayedBinding.url === binding.url &&
        current.displayedBinding.entryId === binding.entryId &&
        current.addressBinding.url === intent.target.url &&
        current.addressBinding.entryId === intent.target.entryId &&
        readAddress() === intent.target.url &&
        readHistoryEntry()?.id === intent.target.entryId &&
        readCurrentShellCommitId() === generation
      );
    };
    const samePlacement = (requireFixedMode = true): boolean =>
      root.isConnected &&
      root.parentElement === host &&
      !root.hidden &&
      !host.hidden &&
      !root.inert &&
      (!requireFixedMode || root.getAttribute('data-mode') === 'fixed') &&
      window.innerWidth >= Math.max(1024, previous.fixedBreakpoint) &&
      root.querySelector('[data-layout-sidebar-surface]') === surface &&
      surface.childElementCount === 1 &&
      surface.firstElementChild === nav;
    if (!sameOwner() || !samePlacement()) return null;
    const previousNav = parseNav(previous.navHtml, root.ownerDocument);
    const nextNav = parseNav(next.navHtml, root.ownerDocument);
    if (
      !previousNav ||
      !nextNav ||
      !validSelection(previousNav, previous, SOURCE_URL) ||
      !validSelection(nextNav, next, TARGET_URL) ||
      withoutSelection(previousNav) !== withoutSelection(nextNav)
    )
      return null;
    const nodes = [nav, ...nav.querySelectorAll<HTMLElement>('*')];
    const nextNodes = [nextNav, ...nextNav.querySelectorAll<HTMLElement>('*')];
    if (nodes.length !== nextNodes.length) return null;
    const attributes = nodes.map((element, index) => ({
      element,
      before: element.getAttribute('aria-current'),
      after: nextNodes[index]?.getAttribute('aria-current') ?? null,
    }));
    const changes = attributes.filter(({ before, after }) => before !== after);
    const sameNodes = (): boolean => {
      const currentNodes = [nav, ...nav.querySelectorAll('*')];
      return (
        currentNodes.length === nodes.length &&
        currentNodes.every((element, index) => element === nodes[index])
      );
    };
    const matchesSnapshot = (expected: PresentSidebar): boolean => {
      try {
        const current = options.readCurrentSnapshot();
        const canonical = current.present ? parseNav(current.navHtml, root.ownerDocument) : null;
        return (
          current.present &&
          metadata(current) === metadata(expected) &&
          current.selectedId === expected.selectedId &&
          canonical !== null &&
          validSelection(canonical, current, expected === previous ? SOURCE_URL : TARGET_URL) &&
          withoutSelection(canonical) === withoutSelection(previousNav)
        );
      } catch {
        return false;
      }
    };
    const apply = (reverse: boolean): void => {
      for (const change of changes) {
        const value = reverse ? change.before : change.after;
        if (value === null) change.element.removeAttribute('aria-current');
        else change.element.setAttribute('aria-current', value);
      }
      const selectedId = reverse ? previous.selectedId : next.selectedId;
      if (selectedId === null) root.removeAttribute('selected-id');
      else root.setAttribute('selected-id', selectedId);
    };
    let applied = false;
    return {
      commit() {
        const current = readContentContext();
        // 本文適用後にはepochが進む。同じ古いepochを要求して正当な適用を除外しない。
        if (
          !sameOwner() ||
          !current?.mutation ||
          current.contentEpoch <= epoch ||
          !samePlacement() ||
          !sameNodes() ||
          !matchesSnapshot(previous)
        )
          return false;
        applied = true;
        apply(false);
        return true;
      },
      rollback() {
        // 失効intentのrollbackも必要なので、ここでは現在intentの一致を要求しない。
        // rollback-startでenhancerがdata-modeを外してstagedへ戻すことは正常である。
        if (!applied || !samePlacement(false) || !sameNodes()) return false;
        const selectedId = root.getAttribute('selected-id');
        if (selectedId !== previous.selectedId && selectedId !== next.selectedId) return false;
        // 自分の部分適用だけを戻す。別nodeの新ARIAや第三の値は全snapshot復元へ返す。
        if (
          !attributes.every(({ element, before, after }) => {
            const current = element.getAttribute('aria-current');
            return before === after ? current === before : current === before || current === after;
          })
        )
          return false;
        try {
          const current = options.readCurrentSnapshot();
          const canonical = current.present ? parseNav(current.navHtml, root.ownerDocument) : null;
          if (
            !current.present ||
            metadata(current) !== metadata(previous) ||
            !canonical ||
            withoutSelection(canonical) !== withoutSelection(previousNav)
          )
            return false;
        } catch {
          return false;
        }
        apply(true);
        applied = false;
        return true;
      },
    };
  } catch {
    // 最適化の証明に失敗しても、既存の検証済み全交換経路を変えない。
    return null;
  }
};
