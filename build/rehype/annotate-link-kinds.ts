import { getOrCreateProperties, type HastNode } from './hast-utils.js';
import { classifyLinkHref, isExternalLinkKind } from '../../shared/link/link-kind.js';
import { parseFootnoteBackrefHref } from '../../shared/footnotes/footnote-id.js';

interface LinkContext {
  readonly insideCanonicalFootnoteItem: boolean;
  readonly insideCanonicalFootnoteList: boolean;
  readonly insideFootnotePopover: boolean;
  readonly insideUiFootnote: boolean;
}

const getClassNames = (node: HastNode): string[] => {
  const properties = node.properties ?? {};
  const raws = [properties['className'], properties['class']];
  const names: string[] = [];

  for (const raw of raws) {
    if (Array.isArray(raw)) {
      names.push(...raw.filter((value): value is string => typeof value === 'string'));
    } else if (typeof raw === 'string') {
      names.push(...raw.split(/\s+/u).filter((value) => value.length > 0));
    }
  }

  return names;
};

const hasClassName = (node: HastNode, className: string): boolean =>
  getClassNames(node).includes(className);

const normalizeMarkerText = (value: unknown): string | null => {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return null;
};

const isFalseFootnoteMarkerValue = (value: unknown): boolean => {
  const normalized = normalizeMarkerText(value);
  return (
    normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no'
  );
};

const isTruthyFootnoteMarkerValue = (value: unknown): boolean => {
  const normalized = normalizeMarkerText(value);
  if (normalized === null) {
    return false;
  }
  return !isFalseFootnoteMarkerValue(value);
};

const deleteLinkAnnotations = (properties: Record<string, unknown>): void => {
  delete properties['data-link-kind'];
  delete properties['data-link-surface'];
  delete properties['data-external'];
  delete properties['dataLinkKind'];
  delete properties['dataLinkSurface'];
  delete properties['dataExternal'];
  delete properties['datalinkkind'];
  delete properties['datalinksurface'];
  delete properties['datalinksuface'];
  delete properties['dataexternal'];
};

const isCanonicalFootnoteRef = (node: HastNode): boolean =>
  node.properties?.['data-footnote-ref'] === 'true' && node.properties?.['role'] === 'doc-noteref';

const isCanonicalFootnoteBackref = (node: HastNode): boolean =>
  node.properties?.['data-footnote-backref'] === 'true' &&
  node.properties?.['role'] === 'doc-backlink';

const isStructuralFootnoteMarker = (node: HastNode, context: LinkContext): boolean => {
  const properties = node.properties ?? {};
  const hasFalseRef =
    isFalseFootnoteMarkerValue(properties['data-footnote-ref']) ||
    isFalseFootnoteMarkerValue(properties['dataFootnoteRef']);
  const hasFalseBackref =
    isFalseFootnoteMarkerValue(properties['data-footnote-backref']) ||
    isFalseFootnoteMarkerValue(properties['dataFootnoteBackref']);

  if (isCanonicalFootnoteRef(node) || isCanonicalFootnoteBackref(node)) {
    return true;
  }

  if (
    isTruthyFootnoteMarkerValue(properties['data-footnote-ref']) ||
    isTruthyFootnoteMarkerValue(properties['dataFootnoteRef']) ||
    isTruthyFootnoteMarkerValue(properties['data-footnote-backref']) ||
    isTruthyFootnoteMarkerValue(properties['dataFootnoteBackref'])
  ) {
    return true;
  }

  if (properties['role'] === 'doc-noteref' || properties['role'] === 'doc-backlink') {
    return true;
  }

  if (hasClassName(node, 'data-footnote-ref') || hasClassName(node, 'data-footnote-backref')) {
    return true;
  }

  if (
    (hasFalseRef || hasFalseBackref) &&
    (properties['role'] !== undefined ||
      hasClassName(node, 'data-footnote-ref') ||
      hasClassName(node, 'data-footnote-backref'))
  ) {
    return true;
  }

  const href = typeof properties['href'] === 'string' ? properties['href'] : '';
  const parsedBackref = parseFootnoteBackrefHref(href);
  if (
    context.insideCanonicalFootnoteItem &&
    (parsedBackref.kind === 'canonical' || parsedBackref.kind === 'legacy-user-content-fnref')
  ) {
    return true;
  }

  return false;
};

const isStructuralLink = (node: HastNode, context: LinkContext): boolean => {
  if (hasClassName(node, 'heading-anchor')) {
    return true;
  }

  if (hasClassName(node, 'footnote-list-link')) {
    return context.insideFootnotePopover || context.insideUiFootnote;
  }

  return isStructuralFootnoteMarker(node, context);
};

const getMeaningfulChildren = (node: HastNode): HastNode[] =>
  (node.children ?? []).filter(
    (child) =>
      !(
        child.type === 'text' &&
        (typeof child.value !== 'string' || child.value.trim().length === 0)
      ),
  );

const isCanonicalFootnoteDefinitionList = (node: HastNode, parent: HastNode | null): boolean => {
  if (node.type !== 'element' || node.tagName !== 'ol') {
    return false;
  }
  if (parent?.type !== 'element' || parent.tagName !== 'section') {
    return false;
  }
  if (parent.properties?.['role'] !== 'doc-endnotes') {
    return false;
  }
  const meaningful = getMeaningfulChildren(parent);
  return (
    meaningful.length >= 2 &&
    meaningful[0]?.type === 'element' &&
    meaningful[0].tagName === 'h2' &&
    meaningful[0].properties?.['id'] === 'footnote-label' &&
    meaningful[1] === node
  );
};

const isCanonicalFootnoteItem = (node: HastNode, context: LinkContext): boolean =>
  node.type === 'element' && node.tagName === 'li' && context.insideCanonicalFootnoteList;

export function rehypeAnnotateLinkKinds() {
  return (tree: unknown) => {
    const visit = (node: unknown, context: LinkContext, parent: HastNode | null): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as HastNode;
      const currentIsCanonicalFootnoteList = isCanonicalFootnoteDefinitionList(current, parent);
      const nextContext: LinkContext = {
        insideCanonicalFootnoteItem:
          context.insideCanonicalFootnoteItem || isCanonicalFootnoteItem(current, context),
        insideCanonicalFootnoteList: currentIsCanonicalFootnoteList,
        insideFootnotePopover:
          context.insideFootnotePopover ||
          (current.type === 'element' &&
            current.properties?.['data-footnote-popover'] !== undefined),
        insideUiFootnote:
          context.insideUiFootnote ||
          (current.type === 'element' && current.tagName === 'ui-footnote'),
      };

      if (current.type === 'element' && current.tagName === 'a') {
        const properties = getOrCreateProperties(current);
        if (isStructuralLink(current, nextContext)) {
          deleteLinkAnnotations(properties);
          return;
        }

        const href = current.properties?.['href'];
        if (typeof href === 'string' && href.trim().length > 0) {
          const linkKind = classifyLinkHref(href);

          properties['data-link-kind'] = linkKind;
          properties['data-link-surface'] = 'prose';

          if (isExternalLinkKind(linkKind)) {
            properties['data-external'] = 'true';
          } else {
            delete properties['data-external'];
          }
        }
      }

      if (!Array.isArray(current.children)) {
        return;
      }

      for (const child of current.children) {
        visit(child, nextContext, current);
      }
    };

    visit(
      tree,
      {
        insideCanonicalFootnoteItem: false,
        insideCanonicalFootnoteList: false,
        insideFootnotePopover: false,
        insideUiFootnote: false,
      },
      null,
    );
  };
}
