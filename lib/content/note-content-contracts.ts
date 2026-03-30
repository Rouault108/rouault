import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import {
  type NoteContentKind,
} from '../../src/types/note-kind.js';
import type { TestingArea } from '../../src/types/testing-area.js';
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

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const getAttributeValue = (node: Parse5Element, name: string): string | undefined => {
  const matched = node.attrs.find((attribute) => attribute.name === name);
  return matched?.value;
};

const setAttributeValue = (node: Parse5Element, name: string, value: string): void => {
  const matched = node.attrs.find((attribute) => attribute.name === name);
  if (matched) {
    matched.value = value;
    return;
  }

  node.attrs.push({ name, value } as Parse5Attribute);
};

const serializeFragment = (fragment: Parse5DocumentFragment): string => parse5.serialize(fragment);

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

  const visit = (node: Parse5Node, insideCodePreview: boolean): void => {
    if (!isElementNode(node)) {
      if ('childNodes' in node && Array.isArray(node.childNodes)) {
        for (const child of node.childNodes) {
          visit(child, insideCodePreview);
        }
      }
      return;
    }

    const allowJs = getAttributeValue(node, 'allow-js') === 'true';

    if (node.tagName === 'ui-preview-sandbox') {
      const previewSandboxRestriction = getPreviewSandboxRestrictionMessage(policyContext);
      if (previewSandboxRestriction) {
        errors.push(previewSandboxRestriction);
      }
    }

    if (allowJs) {
      const sandboxJavaScriptRestriction = getSandboxJavaScriptRestrictionMessage(policyContext);
      if (sandboxJavaScriptRestriction) {
        errors.push(sandboxJavaScriptRestriction);
      }
    }

    const nextInsideCodePreview = insideCodePreview || node.tagName === 'ui-code-preview';

    if (node.tagName === 'ui-code-preview') {
      const controls = getAttributeValue(node, 'controls')?.trim() ?? '';
      if (controls.length > 0 && getCodePreviewControlsRestrictionMessage(policyContext)) {
        errors.push(getCodePreviewControlsRestrictionMessage(policyContext) ?? '');
      }
    }

    const slot = getAttributeValue(node, 'slot')?.trim() ?? '';
    if (
      nextInsideCodePreview &&
      slot === 'toolbar' &&
      getCodePreviewToolbarRestrictionMessage(policyContext)
    ) {
      errors.push(getCodePreviewToolbarRestrictionMessage(policyContext) ?? '');
    }

    if ('childNodes' in node && Array.isArray(node.childNodes)) {
      for (const child of node.childNodes) {
        visit(child, nextInsideCodePreview);
      }
    }
  };

  for (const child of fragment.childNodes) {
    visit(child, false);
    if (errors.length > 0) {
      break;
    }
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

    if ('childNodes' in node && Array.isArray(node.childNodes)) {
      for (const child of node.childNodes) {
        visit(child);
      }
    }
  };

  for (const child of fragment.childNodes) {
    visit(child);
  }

  return serializeFragment(fragment);
};
