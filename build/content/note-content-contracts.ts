import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import { type NoteContentKind } from '../../shared/note/note-kind.js';
import type { TestingArea } from '../../shared/note/testing-area.js';
import { createNotePolicyContext } from '../remark/directives/policy/note-policy-context.js';
import {
  getCodePreviewControlsRestrictionMessage,
  getCodePreviewToolbarRestrictionMessage,
  getPreviewSandboxRestrictionMessage,
} from '../remark/directives/policy/preview-policy.js';
import { getSandboxJavaScriptRestrictionMessage } from '../remark/directives/policy/sandbox-policy.js';
import {
  canonicalizeFootnoteId,
  createFootnoteRefId,
  parseFootnoteBackrefHref,
  parseFootnoteRefHref,
} from '../../shared/footnotes/footnote-id.js';

type Parse5DocumentFragment = DefaultTreeAdapterMap['documentFragment'];
type Parse5Element = DefaultTreeAdapterMap['element'];
type Parse5Node = DefaultTreeAdapterMap['node'];
type Parse5Attribute = Parse5Element['attrs'][number];

const STATIC_FIRST_LEGACY_TAGS = new Set<string>([
  'ui-blockquote',
  'ui-callout',
  'ui-divider',
  'ui-footnote',
  'ui-highlight',
  'ui-image',
  'ui-info-box',
  'ui-table',
]);

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const getAttributeValue = (node: Parse5Element, name: string): string | undefined => {
  const matched = node.attrs.find((attribute) => attribute.name === name);
  return matched?.value;
};

const hasAttribute = (node: Parse5Element, name: string): boolean =>
  node.attrs.some((attribute) => attribute.name === name);

const setAttributeValue = (node: Parse5Element, name: string, value: string): void => {
  const matched = node.attrs.find((attribute) => attribute.name === name);
  if (matched) {
    matched.value = value;
    return;
  }

  node.attrs.push({ name, value } as Parse5Attribute);
};

const serializeFragment = (fragment: Parse5DocumentFragment): string => parse5.serialize(fragment);

const getChildNodes = (node: Parse5Node): Parse5Node[] =>
  'childNodes' in node && Array.isArray(node.childNodes) ? node.childNodes : [];

const hasDescendant = (
  node: Parse5Node,
  predicate: (candidate: Parse5Element) => boolean,
): boolean => {
  for (const child of getChildNodes(node)) {
    if (isElementNode(child) && predicate(child)) {
      return true;
    }
    if (hasDescendant(child, predicate)) {
      return true;
    }
  }

  return false;
};

const findDirectChild = (
  node: Parse5Node,
  predicate: (candidate: Parse5Element) => boolean,
): Parse5Element | undefined =>
  getChildNodes(node).find(
    (child): child is Parse5Element => isElementNode(child) && predicate(child),
  );

const getClassNames = (node: Parse5Element): string[] =>
  (getAttributeValue(node, 'class') ?? '')
    .split(/\s+/u)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const hasClassName = (node: Parse5Element, className: string): boolean =>
  getClassNames(node).includes(className);

const getTextContent = (node: Parse5Node): string => {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  return getChildNodes(node)
    .map((child) => getTextContent(child))
    .join('');
};

const isWhitespaceTextNode = (node: Parse5Node): boolean =>
  'value' in node && typeof node.value === 'string' && node.value.trim().length === 0;

const getMeaningfulChildren = (node: Parse5Node): Parse5Node[] =>
  getChildNodes(node).filter((child) => !isWhitespaceTextNode(child));

const isDirectChildOf = (
  node: Parse5Node,
  parent: Parse5Element,
  parentByNode: Map<Parse5Node, Parse5Element>,
): boolean => parentByNode.get(node) === parent;

const isDescendantOf = (
  node: Parse5Node,
  ancestor: Parse5Element,
  parentByNode: Map<Parse5Node, Parse5Element>,
): boolean => {
  let current = parentByNode.get(node);
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = parentByNode.get(current);
  }
  return false;
};

const isCanonicalFootnoteRefElement = (node: Parse5Element): boolean =>
  node.tagName === 'a' &&
  getAttributeValue(node, 'data-footnote-ref') === 'true' &&
  getAttributeValue(node, 'role') === 'doc-noteref';

const isCanonicalFootnoteBackrefElement = (node: Parse5Element): boolean =>
  node.tagName === 'a' &&
  getAttributeValue(node, 'data-footnote-backref') === 'true' &&
  getAttributeValue(node, 'role') === 'doc-backlink';

const hasFootnoteStructuralAttribute = (node: Parse5Element): boolean =>
  FOOTNOTE_STRUCTURAL_ATTRIBUTES.some((name) => hasAttribute(node, name));

const hasForbiddenFootnoteHydrationKey = (node: Parse5Element): boolean =>
  getAttributeValue(node, 'data-hydration-key') === 'footnote-popover-enhancer' &&
  !isCanonicalFootnoteRefElement(node);

const DECIMAL_STRING_PATTERN = /^[1-9]\d*$/u;

const FOOTNOTE_REF_REQUIRED_HYDRATION = {
  'data-hydration-key': 'footnote-popover-enhancer',
  'data-hydration-capability': 'progressive',
  'data-hydration-trigger': 'post-commit',
} as const;

const FORBIDDEN_LOWERCASE_FOOTNOTE_ATTRIBUTES = [
  'datafootnoteref',
  'datafootnotebackref',
  'datafootnoteid',
  'datafootnoteindex',
  'datafootnoterefinstance',
  'datafootnoterole',
  'datahydrationkey',
  'datahydrationcapability',
  'datahydrationtrigger',
] as const;

const FORBIDDEN_LINK_ANNOTATION_ATTRIBUTES = [
  'data-link-kind',
  'data-link-surface',
  'data-external',
  'datalinkkind',
  'datalinksurface',
  'datalinksuface',
  'dataexternal',
] as const;

const FOOTNOTE_STRUCTURAL_ATTRIBUTES = [
  'data-footnote-ref',
  'data-footnote-backref',
  'data-footnote-id',
  'data-footnote-index',
  'data-footnote-ref-instance',
  'data-footnote-role',
] as const;

const hasDataOlAttribute = (node: Parse5Element): boolean =>
  node.attrs.some((attribute) => attribute.name.startsWith('data-ol-'));

const hasCounterStyle = (node: Parse5Element): boolean => {
  const style = getAttributeValue(node, 'style') ?? '';
  return /--ui-ol-counter-(?:reset|step|set)/u.test(style);
};

interface FootnoteContractCollections {
  readonly elements: Parse5Element[];
  readonly parentByNode: Map<Parse5Node, Parse5Element>;
  readonly orderByNode: Map<Parse5Element, number>;
  readonly byId: Map<string, Parse5Element>;
  readonly endnotesSections: Parse5Element[];
  readonly footnoteRefs: Parse5Element[];
  readonly footnoteBackrefs: Parse5Element[];
}

interface FootnoteDefinitionContract {
  readonly id: string;
  readonly index: number;
  readonly item: Parse5Element;
}

interface CanonicalFootnoteRefContract {
  readonly id: string;
  readonly footnoteId: string;
  readonly index: number;
  readonly instance: number;
  readonly node: Parse5Element;
}

const isFootnoteRefLikeElement = (node: Parse5Element): boolean =>
  node.tagName === 'a' &&
  (hasAttribute(node, 'data-footnote-ref') ||
    getAttributeValue(node, 'role') === 'doc-noteref' ||
    hasClassName(node, 'data-footnote-ref'));

const isFootnoteBackrefLikeElement = (node: Parse5Element): boolean =>
  node.tagName === 'a' &&
  (hasAttribute(node, 'data-footnote-backref') ||
    getAttributeValue(node, 'role') === 'doc-backlink' ||
    hasClassName(node, 'data-footnote-backref'));

const collectFootnoteContractNodes = (
  fragment: Parse5DocumentFragment,
  errors: string[],
): FootnoteContractCollections => {
  const elements: Parse5Element[] = [];
  const parentByNode = new Map<Parse5Node, Parse5Element>();
  const orderByNode = new Map<Parse5Element, number>();
  const byId = new Map<string, Parse5Element>();
  const endnotesSections: Parse5Element[] = [];
  const footnoteRefs: Parse5Element[] = [];
  const footnoteBackrefs: Parse5Element[] = [];

  let order = 0;
  const visit = (node: Parse5Node, parent: Parse5Element | null): void => {
    if (parent) {
      parentByNode.set(node, parent);
    }
    if (isElementNode(node)) {
      elements.push(node);
      orderByNode.set(node, order);
      order += 1;
      const id = getAttributeValue(node, 'id')?.trim() ?? '';
      if (id.length > 0) {
        if (byId.has(id)) {
          errors.push(`duplicate id "${id}" は許可されません`);
        } else {
          byId.set(id, node);
        }
      }
      if (node.tagName === 'section' && getAttributeValue(node, 'role') === 'doc-endnotes') {
        endnotesSections.push(node);
      }
      if (isFootnoteRefLikeElement(node)) {
        footnoteRefs.push(node);
      }
      if (isFootnoteBackrefLikeElement(node)) {
        footnoteBackrefs.push(node);
      }
    }
    for (const child of getChildNodes(node)) {
      visit(child, isElementNode(node) ? node : parent);
    }
  };

  for (const child of fragment.childNodes) {
    visit(child, null);
  }

  return {
    elements,
    parentByNode,
    orderByNode,
    byId,
    endnotesSections,
    footnoteRefs,
    footnoteBackrefs,
  };
};

const assertCanonicalFootnoteRefChildren = (
  node: Parse5Element,
  indexText: string,
  errors: string[],
): void => {
  const meaningful = getMeaningfulChildren(node);
  const supCandidate = meaningful[0];
  if (
    meaningful.length !== 1 ||
    supCandidate === undefined ||
    !isElementNode(supCandidate) ||
    supCandidate.tagName !== 'sup'
  ) {
    errors.push('canonical footnote ref は a > sup > text の形でなければなりません');
    return;
  }
  const sup = supCandidate;
  const supMeaningful = getMeaningfulChildren(sup);
  if (supMeaningful.length !== 1 || getTextContent(sup).trim() !== indexText) {
    errors.push(
      'canonical footnote ref の sup text は data-footnote-index と一致する必要があります',
    );
  }
  if (hasDescendant(node, (child) => child.tagName === 'a')) {
    errors.push('canonical footnote ref に nested anchor を含めてはいけません');
  }
};

const isHiddenEndnotesHeading = (heading: Parse5Element): boolean =>
  hasClassName(heading, 'sr-only') ||
  hasAttribute(heading, 'hidden') ||
  getAttributeValue(heading, 'aria-hidden') === 'true' ||
  hasAttribute(heading, 'data-hidden');

const collectCanonicalFootnoteDefinitions = (
  section: Parse5Element,
  collections: FootnoteContractCollections,
  errors: string[],
): Map<string, FootnoteDefinitionContract> => {
  const definitions = new Map<string, FootnoteDefinitionContract>();
  const meaningful = getMeaningfulChildren(section);
  const heading = meaningful[0];
  const list = meaningful[1];

  if (
    meaningful.length !== 2 ||
    heading === undefined ||
    list === undefined ||
    !isElementNode(heading) ||
    heading.tagName !== 'h2' ||
    getAttributeValue(heading, 'id') !== 'footnote-label' ||
    getTextContent(heading).trim() !== '脚注' ||
    !isElementNode(list) ||
    list.tagName !== 'ol'
  ) {
    errors.push(
      'section[role="doc-endnotes"] は h2#footnote-label と direct ol だけをこの順序で持つ必要があります',
    );
    return definitions;
  }

  if (isHiddenEndnotesHeading(heading)) {
    errors.push('h2#footnote-label は表示される構造見出しでなければなりません');
    return definitions;
  }
  if (
    hasDescendant(
      heading,
      (child) =>
        hasClassName(child, 'heading-anchor') || hasAttribute(child, 'data-heading-permalink'),
    )
  ) {
    errors.push('endnotes 見出しには heading permalink を付けてはいけません');
    return definitions;
  }
  if (
    hasAttribute(list, 'start') ||
    hasAttribute(list, 'reversed') ||
    hasAttribute(list, 'data-marker-digits') ||
    hasDataOlAttribute(list) ||
    getAttributeValue(list, 'role') === 'list' ||
    hasCounterStyle(list)
  ) {
    errors.push('canonical footnote ol に ordered-list 補助属性を残してはいけません');
    return definitions;
  }

  let index = 0;
  for (const child of getMeaningfulChildren(list)) {
    if (
      !isElementNode(child) ||
      child.tagName !== 'li' ||
      !isDirectChildOf(child, list, collections.parentByNode)
    ) {
      errors.push('footnote definition は direct ol > li[id] でなければなりません');
      return definitions;
    }
    index += 1;
    if (
      hasAttribute(child, 'value') ||
      hasAttribute(child, 'data-marker-digits') ||
      hasDataOlAttribute(child) ||
      getAttributeValue(child, 'role') === 'listitem' ||
      hasCounterStyle(child)
    ) {
      errors.push('canonical footnote li に ordered-list 補助属性を残してはいけません');
      return definitions;
    }
    const rawId = getAttributeValue(child, 'id') ?? '';
    const canonicalId = canonicalizeFootnoteId(rawId);
    if (canonicalId === null || canonicalId !== rawId) {
      errors.push(`footnote definition id "${rawId}" は canonical fn-* 形式でなければなりません`);
      return definitions;
    }
    definitions.set(rawId, { id: rawId, index, item: child });
  }

  if (definitions.size === 0) {
    errors.push('空の endnotes section は許可されません');
  }
  return definitions;
};

const collectDescendantAnchors = (node: Parse5Node): Parse5Element[] => {
  const anchors: Parse5Element[] = [];
  const visit = (current: Parse5Node): void => {
    if (isElementNode(current) && current.tagName === 'a') {
      anchors.push(current);
    }
    for (const child of getChildNodes(current)) {
      visit(child);
    }
  };
  visit(node);
  return anchors;
};

const getExpectedBackrefContainer = (item: Parse5Element): Parse5Element => {
  const directParagraphs = getChildNodes(item).filter(
    (child): child is Parse5Element =>
      isElementNode(child) && child.tagName === 'p' && getTextContent(child).trim().length > 0,
  );
  return directParagraphs[directParagraphs.length - 1] ?? item;
};

const validateBackrefPlacement = (
  backref: Parse5Element,
  item: Parse5Element,
  parentByNode: Map<Parse5Node, Parse5Element>,
  errors: string[],
): void => {
  const expectedContainer = getExpectedBackrefContainer(item);
  if (parentByNode.get(backref) !== expectedContainer) {
    errors.push(
      'footnote backref は direct child paragraph 末尾または li 直下末尾に置く必要があります',
    );
    return;
  }
  const meaningful = getMeaningfulChildren(expectedContainer);
  const backrefIndex = meaningful.indexOf(backref);
  if (backrefIndex < 0) {
    errors.push('footnote backref の配置を検証できません');
    return;
  }
  for (const trailing of meaningful.slice(backrefIndex)) {
    if (!isElementNode(trailing) || !isCanonicalFootnoteBackrefElement(trailing)) {
      errors.push('footnote backref は footnote item 本文末尾に連続配置する必要があります');
      return;
    }
  }
};

const validateFootnoteContracts = (fragment: Parse5DocumentFragment, errors: string[]): void => {
  const collections = collectFootnoteContractNodes(fragment, errors);
  if (errors.length > 0) return;

  for (const element of collections.elements) {
    for (const name of FORBIDDEN_LOWERCASE_FOOTNOTE_ATTRIBUTES) {
      if (hasAttribute(element, name)) {
        errors.push(`${name} は note 最終 HTML に残してはいけません`);
        return;
      }
    }
    if (hasClassName(element, 'footnote-list-link')) {
      const inPopoverOrUiFootnote = collections.elements.some(
        (candidate) =>
          (hasAttribute(candidate, 'data-footnote-popover') ||
            candidate.tagName === 'ui-footnote') &&
          isDescendantOf(element, candidate, collections.parentByNode),
      );
      if (!inPopoverOrUiFootnote) {
        errors.push('.footnote-list-link は note 最終 HTML に残してはいけません');
        return;
      }
    }
    if (getAttributeValue(element, 'id') === 'footnote-label') {
      const parent = collections.parentByNode.get(element);
      if (
        !(
          element.tagName === 'h2' &&
          parent?.tagName === 'section' &&
          getAttributeValue(parent, 'role') === 'doc-endnotes'
        )
      ) {
        errors.push('footnote-label は endnotes 構造見出し専用 ID です');
        return;
      }
    }
    if (
      hasFootnoteStructuralAttribute(element) &&
      !isCanonicalFootnoteRefElement(element) &&
      !isCanonicalFootnoteBackrefElement(element)
    ) {
      errors.push('footnote structural 属性は canonical footnote ref/backref にだけ許可します');
      return;
    }
    if (hasForbiddenFootnoteHydrationKey(element)) {
      errors.push(
        'data-hydration-key="footnote-popover-enhancer" は canonical footnote ref にだけ許可します',
      );
      return;
    }
  }

  if (collections.endnotesSections.length > 1) {
    errors.push('section[role="doc-endnotes"] は 0 個または 1 個だけです');
    return;
  }

  if (collections.footnoteRefs.length === 0 && collections.endnotesSections.length === 0) {
    return;
  }
  if (collections.footnoteRefs.length === 0 && collections.endnotesSections.length > 0) {
    errors.push('footnote ref が 0 件の endnotes section は許可されません');
    return;
  }
  if (collections.footnoteRefs.length > 0 && collections.endnotesSections.length === 0) {
    errors.push('[data-footnote-ref] を含む note には section[role="doc-endnotes"] が必要です');
    return;
  }

  const section = collections.endnotesSections[0];
  if (!section) return;
  const definitions = collectCanonicalFootnoteDefinitions(section, collections, errors);
  if (errors.length > 0) return;

  for (const definition of definitions.values()) {
    for (const anchor of collectDescendantAnchors(definition.item)) {
      const href = getAttributeValue(anchor, 'href') ?? '';
      const parsedBackref = parseFootnoteBackrefHref(href);
      if (parsedBackref.kind === 'invalid') {
        errors.push('canonical footnote item 内の malformed backref-like href は許可されません');
        return;
      }
      if (
        (parsedBackref.kind === 'canonical' ||
          parsedBackref.kind === 'legacy-user-content-fnref') &&
        !isCanonicalFootnoteBackrefElement(anchor)
      ) {
        errors.push(
          'canonical footnote item 内の legacy / non-canonical backref は残してはいけません',
        );
        return;
      }
    }
  }

  const canonicalRefs: CanonicalFootnoteRefContract[] = [];
  for (const ref of collections.footnoteRefs) {
    if (
      getAttributeValue(ref, 'data-footnote-ref') !== 'true' ||
      getAttributeValue(ref, 'role') !== 'doc-noteref'
    ) {
      errors.push(
        'footnote ref は data-footnote-ref="true" かつ role="doc-noteref" でなければなりません',
      );
      return;
    }
    for (const name of FORBIDDEN_LINK_ANNOTATION_ATTRIBUTES) {
      if (hasAttribute(ref, name)) {
        errors.push('脚注構造リンクに通常リンク注釈を付与してはいけません');
        return;
      }
    }
    if (hasClassName(ref, 'link-text') || hasClassName(ref, 'data-footnote-ref')) {
      errors.push('脚注構造リンクに通常リンク用 class を付与してはいけません');
      return;
    }
    const id = getAttributeValue(ref, 'id') ?? '';
    const footnoteId = getAttributeValue(ref, 'data-footnote-id') ?? '';
    const indexText = getAttributeValue(ref, 'data-footnote-index') ?? '';
    const instanceText = getAttributeValue(ref, 'data-footnote-ref-instance') ?? '';
    if (!DECIMAL_STRING_PATTERN.test(indexText) || !DECIMAL_STRING_PATTERN.test(instanceText)) {
      errors.push(
        'data-footnote-index と data-footnote-ref-instance は正の canonical decimal string である必要があります',
      );
      return;
    }
    const index = Number.parseInt(indexText, 10);
    const instance = Number.parseInt(instanceText, 10);
    if (canonicalizeFootnoteId(footnoteId) !== footnoteId || !definitions.has(footnoteId)) {
      errors.push('data-footnote-id は実在する canonical footnote definition を指す必要があります');
      return;
    }
    const href = getAttributeValue(ref, 'href') ?? '';
    if (href !== `#${footnoteId}`) {
      errors.push(
        'canonical footnote ref の href は #${data-footnote-id} と exact に一致する必要があります',
      );
      return;
    }
    const parsedHref = parseFootnoteRefHref(href);
    if (parsedHref.kind !== 'canonical' || parsedHref.footnoteId !== footnoteId) {
      errors.push('canonical footnote ref の href は data-footnote-id と一致する必要があります');
      return;
    }
    if (id !== createFootnoteRefId(footnoteId, instance)) {
      errors.push(
        'canonical footnote ref の id は data-footnote-id と instance から生成される必要があります',
      );
      return;
    }
    if (getAttributeValue(ref, 'aria-label') !== `脚注 ${indexText} を開く`) {
      errors.push('canonical footnote ref の aria-label が index と一致しません');
      return;
    }
    for (const [name, expected] of Object.entries(FOOTNOTE_REF_REQUIRED_HYDRATION)) {
      if (getAttributeValue(ref, name) !== expected) {
        errors.push(`canonical footnote ref には ${name}="${expected}" が必要です`);
        return;
      }
    }
    if (hasAttribute(ref, 'aria-describedby') || hasAttribute(ref, 'ariadescribedby')) {
      errors.push('canonical footnote ref に legacy aria-describedby を残してはいけません');
      return;
    }
    assertCanonicalFootnoteRefChildren(ref, indexText, errors);
    if (errors.length > 0) return;
    canonicalRefs.push({ id, footnoteId, index, instance, node: ref });
  }

  const refsByFootnoteId = new Map<string, CanonicalFootnoteRefContract[]>();
  for (const ref of canonicalRefs) {
    const refs = refsByFootnoteId.get(ref.footnoteId) ?? [];
    refs.push(ref);
    refsByFootnoteId.set(ref.footnoteId, refs);
  }

  for (const [footnoteId, definition] of definitions) {
    const refs = refsByFootnoteId.get(footnoteId) ?? [];
    if (refs.length === 0) {
      errors.push(
        `footnote definition "${footnoteId}" は少なくとも 1 つの ref から参照される必要があります`,
      );
      return;
    }
    refs.sort(
      (left, right) =>
        (collections.orderByNode.get(left.node) ?? 0) -
        (collections.orderByNode.get(right.node) ?? 0),
    );
    for (const [arrayIndex, ref] of refs.entries()) {
      const expectedInstance = arrayIndex + 1;
      if (ref.index !== definition.index || ref.instance !== expectedInstance) {
        errors.push(
          'footnote ref の index / instance は definition 表示順と document order に一致する必要があります',
        );
        return;
      }
      const expectedRole = expectedInstance === 1 ? 'primary' : 'secondary';
      if (getAttributeValue(ref.node, 'data-footnote-role') !== expectedRole) {
        errors.push('data-footnote-role は primary / secondary 契約に一致する必要があります');
        return;
      }
    }
  }

  const backrefsByHref = new Map<string, Parse5Element[]>();
  for (const backref of collections.footnoteBackrefs) {
    if (
      getAttributeValue(backref, 'data-footnote-backref') !== 'true' ||
      getAttributeValue(backref, 'role') !== 'doc-backlink'
    ) {
      errors.push(
        'footnote backref は data-footnote-backref="true" かつ role="doc-backlink" でなければなりません',
      );
      return;
    }
    for (const name of FORBIDDEN_LINK_ANNOTATION_ATTRIBUTES) {
      if (hasAttribute(backref, name)) {
        errors.push('脚注構造リンクに通常リンク注釈を付与してはいけません');
        return;
      }
    }
    if (hasClassName(backref, 'link-text') || hasClassName(backref, 'data-footnote-backref')) {
      errors.push('脚注構造リンクに通常リンク用 class を付与してはいけません');
      return;
    }
    const href = getAttributeValue(backref, 'href') ?? '';
    const parsed = parseFootnoteBackrefHref(href);
    if (parsed.kind !== 'canonical') {
      errors.push('canonical footnote backref の href は #fn-*-ref-N でなければなりません');
      return;
    }
    const refs = refsByFootnoteId.get(parsed.footnoteId) ?? [];
    const targetRef = refs.find((ref) => ref.instance === parsed.instance);
    if (!targetRef) {
      errors.push('footnote backref は実在する footnote ref を指す必要があります');
      return;
    }
    if (href !== `#${targetRef.id}`) {
      errors.push(
        'canonical footnote backref の href は対応 ref id と exact に一致する必要があります',
      );
      return;
    }
    const definition = definitions.get(parsed.footnoteId);
    if (!definition || !isDescendantOf(backref, definition.item, collections.parentByNode)) {
      errors.push('footnote backref は対応する footnote item 内に置く必要があります');
      return;
    }
    validateBackrefPlacement(backref, definition.item, collections.parentByNode, errors);
    if (errors.length > 0) return;
    if (getAttributeValue(backref, 'aria-label') !== `脚注参照 ${String(parsed.instance)} に戻る`) {
      errors.push('canonical footnote backref の aria-label が instance と一致しません');
      return;
    }
    const expectedText = parsed.instance === 1 ? '↩︎' : `↩︎${String(parsed.instance)}`;
    if (getTextContent(backref).trim() !== expectedText) {
      errors.push('canonical footnote backref の表示 text が instance と一致しません');
      return;
    }
    const bucket = backrefsByHref.get(href) ?? [];
    bucket.push(backref);
    backrefsByHref.set(href, bucket);
  }

  for (const ref of canonicalRefs) {
    const expectedHref = `#${ref.id}`;
    const backrefs = backrefsByHref.get(expectedHref) ?? [];
    if (backrefs.length !== 1) {
      errors.push('footnote ref と backref は 1:1 で完全対応する必要があります');
      return;
    }
  }
};

interface StaticContractState {
  sawFootnoteRef: boolean;
  sawEndnotes: boolean;
}

const validateStaticNoteRootContracts = (
  node: Parse5Element,
  errors: string[],
  state: StaticContractState,
): void => {
  if (STATIC_FIRST_LEGACY_TAGS.has(node.tagName)) {
    errors.push(`${node.tagName} は note 最終 HTML に残してはいけません`);
    return;
  }

  if (node.tagName === 'div' && hasAttribute(node, 'data-table-root')) {
    if (getAttributeValue(node, 'role') !== 'region') {
      errors.push('[data-table-root] には role="region" が必要です');
      return;
    }
    if (getAttributeValue(node, 'tabindex') !== '0') {
      errors.push('[data-table-root] には tabindex="0" が必要です');
      return;
    }
    if (!findDirectChild(node, (child) => child.tagName === 'table')) {
      errors.push('[data-table-root] は直下に table を持つ必要があります');
      return;
    }
  }

  if (node.tagName === 'aside' && hasAttribute(node, 'data-callout')) {
    const kind = getAttributeValue(node, 'data-callout-kind')?.trim() ?? '';
    if (kind.length === 0) {
      errors.push('[data-callout] には data-callout-kind が必要です');
      return;
    }
    if (!hasDescendant(node, (child) => hasAttribute(child, 'data-callout-content'))) {
      errors.push('[data-callout] は data-callout-content を含む必要があります');
      return;
    }
    if (!hasDescendant(node, (child) => hasAttribute(child, 'data-callout-body'))) {
      errors.push('[data-callout] は data-callout-body を含む必要があります');
      return;
    }
  }

  if (node.tagName === 'section' && hasAttribute(node, 'data-info-box')) {
    const variant = getAttributeValue(node, 'data-variant')?.trim() ?? '';
    const density = getAttributeValue(node, 'data-density')?.trim() ?? '';
    if (variant.length === 0) {
      errors.push('[data-info-box] には data-variant が必要です');
      return;
    }
    if (density.length === 0) {
      errors.push('[data-info-box] には data-density が必要です');
      return;
    }
    if (!hasDescendant(node, (child) => hasAttribute(child, 'data-info-box-body'))) {
      errors.push('[data-info-box] は data-info-box-body を含む必要があります');
      return;
    }
  }

  if (node.tagName === 'figure' && hasAttribute(node, 'data-image')) {
    if (!hasDescendant(node, (child) => child.tagName === 'img')) {
      errors.push('figure[data-image] は img を含む必要があります');
      return;
    }

    const zoomable = getAttributeValue(node, 'data-image-zoomable') !== 'false';
    if (!zoomable) {
      return;
    }

    if (getAttributeValue(node, 'data-hydration-key') !== 'image-lightbox-enhancer') {
      errors.push(
        'zoomable な figure[data-image] には data-hydration-key="image-lightbox-enhancer" が必要です',
      );
      return;
    }

    if (!hasDescendant(node, (child) => hasAttribute(child, 'data-image-zoom-trigger'))) {
      errors.push('zoomable な figure[data-image] は data-image-zoom-trigger を含む必要があります');
      return;
    }
  }

  if (node.tagName === 'a' && hasAttribute(node, 'data-footnote-ref')) {
    state.sawFootnoteRef = true;

    if (getAttributeValue(node, 'role') !== 'doc-noteref') {
      errors.push('[data-footnote-ref] には role="doc-noteref" が必要です');
      return;
    }
    if ((getAttributeValue(node, 'data-footnote-id')?.trim() ?? '').length === 0) {
      errors.push('[data-footnote-ref] には data-footnote-id が必要です');
      return;
    }
    if ((getAttributeValue(node, 'data-footnote-ref-instance')?.trim() ?? '').length === 0) {
      errors.push('[data-footnote-ref] には data-footnote-ref-instance が必要です');
      return;
    }
    if (getAttributeValue(node, 'data-hydration-key') !== 'footnote-popover-enhancer') {
      errors.push(
        '[data-footnote-ref] には data-hydration-key="footnote-popover-enhancer" が必要です',
      );
      return;
    }
  }

  if (node.tagName === 'section' && getAttributeValue(node, 'role') === 'doc-endnotes') {
    state.sawEndnotes = true;
  }
};

export const validateNoteContentContracts = (
  kind: NoteContentKind,
  html: string | undefined,
  sourceLabel = 'unknown',
  testingArea?: TestingArea,
): void => {
  if (typeof html !== 'string' || html.trim().length === 0) {
    return;
  }

  const fragment = parse5.parseFragment(html);
  const errors: string[] = [];
  const policyContext = createNotePolicyContext(kind, testingArea);
  const staticContractState: StaticContractState = {
    sawFootnoteRef: false,
    sawEndnotes: false,
  };

  const visit = (node: Parse5Node, insideCodePreview: boolean): void => {
    if (!isElementNode(node)) {
      for (const child of getChildNodes(node)) {
        visit(child, insideCodePreview);
      }
      return;
    }

    validateStaticNoteRootContracts(node, errors, staticContractState);
    if (errors.length > 0) {
      return;
    }

    const allowJs = getAttributeValue(node, 'allow-js') === 'true';

    if (node.tagName === 'ui-preview-sandbox') {
      const previewSandboxRestriction = getPreviewSandboxRestrictionMessage(policyContext);
      if (previewSandboxRestriction) {
        errors.push(previewSandboxRestriction);
        return;
      }
    }

    if (allowJs) {
      const sandboxJavaScriptRestriction = getSandboxJavaScriptRestrictionMessage(policyContext);
      if (sandboxJavaScriptRestriction) {
        errors.push(sandboxJavaScriptRestriction);
        return;
      }
    }

    const nextInsideCodePreview = insideCodePreview || node.tagName === 'ui-code-preview';

    if (node.tagName === 'ui-code-preview') {
      const controls = getAttributeValue(node, 'controls')?.trim() ?? '';
      if (controls.length > 0 && getCodePreviewControlsRestrictionMessage(policyContext)) {
        errors.push(getCodePreviewControlsRestrictionMessage(policyContext) ?? '');
        return;
      }
    }

    const slot = getAttributeValue(node, 'slot')?.trim() ?? '';
    if (
      nextInsideCodePreview &&
      slot === 'toolbar' &&
      getCodePreviewToolbarRestrictionMessage(policyContext)
    ) {
      errors.push(getCodePreviewToolbarRestrictionMessage(policyContext) ?? '');
      return;
    }

    for (const child of getChildNodes(node)) {
      visit(child, nextInsideCodePreview);
      if (errors.length > 0) {
        return;
      }
    }
  };

  for (const child of fragment.childNodes) {
    visit(child, false);
    if (errors.length > 0) {
      break;
    }
  }

  if (errors.length === 0) {
    validateFootnoteContracts(fragment, errors);
  }

  if (
    errors.length === 0 &&
    staticContractState.sawFootnoteRef &&
    !staticContractState.sawEndnotes
  ) {
    errors.push('[data-footnote-ref] を含む note には section[role="doc-endnotes"] が必要です');
  }

  if (errors.length > 0) {
    throw new Error(`[note-content:${sourceLabel}] ${errors[0]}`);
  }
};

export const injectNoteContentProfiles = (
  html: string | undefined,
  kind: NoteContentKind,
): string => {
  if (typeof html !== 'string' || html.length === 0) {
    return '';
  }

  const previewProfile = createNotePolicyContext(kind).kind === 'reader' ? 'reader' : 'demo';
  const fragment = parse5.parseFragment(html);

  const visit = (node: Parse5Node): void => {
    if (isElementNode(node) && node.tagName === 'ui-code-preview') {
      setAttributeValue(node, 'preview-profile', previewProfile);
    }

    for (const child of getChildNodes(node)) {
      visit(child);
    }
  };

  for (const child of fragment.childNodes) {
    visit(child);
  }

  return serializeFragment(fragment);
};
