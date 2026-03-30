import type { DirectiveName } from '../types.js';

export interface DirectiveAttributeSchema {
  readonly allowedKeys: readonly string[];
}

export const directiveAttributeSchemas: Record<DirectiveName, DirectiveAttributeSchema> = {
  callout: {
    allowedKeys: ['kind', 'heading', 'label', 'icon', 'heading-level'],
  },
  'code-group': {
    allowedKeys: ['aria-label'],
  },
  'code-preview': {
    allowedKeys: [
      'heading',
      'controls',
      'preview-padding',
      'preview-align',
      'preview-theme',
      'preview-surface',
      'preview-viewport',
    ],
  },
  'preview-sandbox': {
    allowedKeys: [
      'iframe-title',
      'base-url',
      'allow-js',
      'activation-policy',
      'height-mode',
      'allow-forms',
      'allow-downloads',
      'allow-pointer-lock',
      'allow-popups',
      'height',
      'max-height',
    ],
  },
  details: {
    allowedKeys: ['aria-label', 'summary', 'open', 'variant', 'region'],
  },
  'info-box': {
    allowedKeys: ['heading', 'icon', 'heading-level', 'landmark', 'variant', 'density'],
  },
  'link-card': {
    allowedKeys: ['url', 'title', 'description', 'image', 'site-name'],
  },
  score: {
    allowedKeys: ['src', 'caption', 'label', 'description', 'aspect-ratio', 'loading', 'primary'],
  },
  tabs: {
    allowedKeys: [
      'selected-value',
      'default-selected-value',
      'orientation',
      'automatic-activation',
      'url-sync',
    ],
  },
  translation: {
    allowedKeys: ['original', 'translated', 'lang', 'target-lang'],
  },
  'translation-overlay': {
    allowedKeys: ['original', 'translated', 'lang', 'target-lang', 'surface'],
  },
  preview: {
    allowedKeys: [],
  },
  toolbar: {
    allowedKeys: [],
  },
  tab: {
    allowedKeys: ['value'],
  },
  panel: {
    allowedKeys: [],
  },
};
