import { readContentContext } from '../navigation/content-navigation-context.js';
import {
  normalizeTocCapabilities,
  normalizeTocHeading,
  hasDynamicTocScopeSelections,
  type TocHeading,
  type TocCapabilities,
} from './toc-headings.js';
import { readTocJsonSourceScriptContract } from './toc-json-source-script.js';

export interface TocSourceBinding {
  readonly controller: HTMLElement;
  readonly root: HTMLElement;
  readonly toc: HTMLElement;
  readonly nav: HTMLElement;
  readonly contentRoot: HTMLElement;
  readonly source: HTMLScriptElement;
  readonly headings: TocHeading[];
  readonly capabilities: TocCapabilities;
  readonly ownerId: string;
  isCurrent(verifyStructure?: boolean): boolean;
}

// sourceの寿命と入力のintent/bindingの寿命を分け、URL正規化でtrackerを作り直さない。
export const readTocSourceBinding = (controller: HTMLElement): TocSourceBinding | null => {
  try {
    const toc = controller.closest<HTMLElement>('[data-layout-toc-root]');
    if (!toc || toc.getAttribute('data-toc-hydration') === 'static') return null;
    const sourceId = controller.getAttribute('source-id') ?? '';
    const contentRootId = controller.getAttribute('content-root-id') ?? '';
    const ownerId = controller.getAttribute('toc-owner-id') ?? '';
    const doc = controller.ownerDocument;
    const unique = (id: string): Element | null => {
      const matches = Array.from(doc.querySelectorAll('[id]')).filter((e) => e.id === id);
      return matches.length === 1 ? (matches[0] ?? null) : null;
    };
    const source = unique(sourceId);
    const contentRoot = unique(contentRootId);
    const navs = toc.querySelectorAll<HTMLElement>('[data-layout-toc-nav]');
    const nav = navs[0];
    if (
      !(source instanceof HTMLScriptElement) ||
      !(contentRoot instanceof HTMLElement) ||
      !nav ||
      navs.length !== 1 ||
      toc.querySelectorAll('layout-toc-controller').length !== 1 ||
      !toc.contains(source)
    )
      return null;
    const contract = readTocJsonSourceScriptContract(source);
    if (
      contract?.ownerId !== ownerId ||
      toc.getAttribute('data-hydration-owner-id') !== ownerId ||
      controller.getAttribute('toc-runtime-id') !== sourceId
    )
      return null;
    const context = readContentContext();
    const root = context?.root?.contains(controller)
      ? context.root
      : (controller.closest<HTMLElement>('main') ?? toc.parentElement);
    if (!root?.contains(contentRoot)) return null;
    const raw: unknown = JSON.parse(source.text);
    if (!Array.isArray(raw)) return null;
    const headings: TocHeading[] = [];
    for (const item of raw) {
      const heading = normalizeTocHeading(item);
      if (!heading) return null;
      headings.push(heading);
    }
    if (new Set(headings.map((h) => h.id)).size !== headings.length) return null;
    const links = Array.from(nav.querySelectorAll('[data-toc-link][data-heading-id]'));
    if (
      links.length !== headings.length ||
      headings.some(
        (h) => links.filter((l) => l.getAttribute('data-heading-id') === h.id).length !== 1,
      )
    )
      return null;
    const normalized = normalizeTocCapabilities(
      JSON.parse(controller.getAttribute('capabilities-json') ?? '{}') as unknown,
    );
    const capabilities = {
      ...normalized,
      dynamicScopes: normalized.dynamicScopes || hasDynamicTocScopeSelections(headings),
    };
    const text = source.text;
    const epoch = context?.root === root ? context.contentEpoch : null;
    const attributes = [
      'source-id',
      'content-root-id',
      'toc-owner-id',
      'toc-runtime-id',
      'capabilities-json',
    ].map((name) => [name, controller.getAttribute(name)] as const);
    const sourceAttributes = Array.from(source.attributes, (a) => [a.name, a.value] as const);
    const nodes = Array.from(
      nav.querySelectorAll('*'),
      (n) => [n, n.getAttribute('data-heading-id')] as const,
    );
    const isCurrent = (verifyStructure = true): boolean => {
      const current = readContentContext();
      const tree = verifyStructure ? nav.querySelectorAll('*') : null;
      return (
        controller.isConnected &&
        root.isConnected &&
        toc.contains(controller) &&
        root.contains(toc) &&
        root.contains(contentRoot) &&
        toc.contains(source) &&
        source.text === text &&
        doc.getElementById(sourceId) === source &&
        doc.getElementById(contentRootId) === contentRoot &&
        (!verifyStructure ||
          (unique(sourceId) === source &&
            unique(contentRootId) === contentRoot &&
            toc.querySelectorAll('layout-toc-controller').length === 1 &&
            toc.querySelectorAll('[data-layout-toc-nav]').length === 1)) &&
        toc.querySelector('[data-layout-toc-nav]') === nav &&
        toc.getAttribute('data-hydration-owner-id') === ownerId &&
        attributes.every(([name, value]) => controller.getAttribute(name) === value) &&
        sourceAttributes.every(([name, value]) => source.getAttribute(name) === value) &&
        (!tree ||
          (nodes.length === tree.length &&
            nodes.every(
              ([node, id], i) => tree[i] === node && node.getAttribute('data-heading-id') === id,
            ))) &&
        (epoch === null ||
          (current?.root === root &&
            current.contentEpoch === epoch &&
            !current.mutation &&
            !current.recoveryRequired))
      );
    };
    return isCurrent()
      ? {
          controller,
          root,
          toc,
          nav,
          contentRoot,
          source,
          headings,
          capabilities,
          ownerId,
          isCurrent,
        }
      : null;
  } catch {
    return null;
  }
};
