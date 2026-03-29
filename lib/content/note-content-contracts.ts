import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import {
  type NoteContentKind,
  isReaderFacingNoteContentKind,
  normalizeNoteContentKind,
} from '../../src/types/note-kind.js';
import type { TestingArea } from '../../src/types/testing-area.js';

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

    if (isReaderFacingNoteContentKind(kind) && node.tagName === 'ui-preview-sandbox') {
      errors.push('reader note では preview-sandbox を使用できません');
    }

    if (isReaderFacingNoteContentKind(kind) && allowJs) {
      errors.push('reader note では allow-js="true" を使用できません');
    }

    if (kind === 'testing' && testingArea !== 'sandbox' && node.tagName === 'ui-preview-sandbox') {
      errors.push('testing/sandbox 以外では preview-sandbox を使用できません');
    }

    if (kind === 'testing' && testingArea !== 'sandbox' && allowJs) {
      errors.push('testing/sandbox 以外では allow-js="true" を使用できません');
    }

    const nextInsideCodePreview = insideCodePreview || node.tagName === 'ui-code-preview';

    if (isReaderFacingNoteContentKind(kind) && node.tagName === 'ui-code-preview') {
      const controls = getAttributeValue(node, 'controls')?.trim() ?? '';
      if (controls.length > 0) {
        errors.push('reader note の code-preview では controls を使用できません');
      }
    }

    const slot = getAttributeValue(node, 'slot')?.trim() ?? '';
    if (isReaderFacingNoteContentKind(kind) && nextInsideCodePreview && slot === 'toolbar') {
      errors.push('reader note の code-preview では toolbar slot を使用できません');
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

  const previewProfile = normalizeNoteContentKind(kind) === 'reader' ? 'reader' : 'demo';
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
