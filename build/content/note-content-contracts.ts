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
