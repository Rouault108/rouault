import type { DirectiveName } from '../types.js';

export interface DirectiveStructuralRule {
  readonly allowsChildren: boolean;
  readonly allowedParentDirectives?: readonly DirectiveName[];
  readonly requiresFenceCodeLanguages?: readonly string[];
  readonly mutuallyExclusiveWith?: readonly DirectiveName[];
  readonly maxOccurrencesWithinParent?: number;
}

export const directiveStructuralRules: Record<DirectiveName, DirectiveStructuralRule> = {
  callout: {
    allowsChildren: true,
  },
  'code-group': {
    allowsChildren: true,
  },
  'code-preview': {
    allowsChildren: true,
  },
  'preview-sandbox': {
    allowsChildren: true,
    allowedParentDirectives: ['code-preview'],
    requiresFenceCodeLanguages: ['preview-html', 'preview-css', 'preview-js'],
    mutuallyExclusiveWith: ['preview'],
    maxOccurrencesWithinParent: 1,
  },
  details: {
    allowsChildren: true,
  },
  'info-box': {
    allowsChildren: true,
  },
  'link-card': {
    allowsChildren: false,
  },
  score: {
    allowsChildren: true,
  },
  tabs: {
    allowsChildren: true,
  },
  translation: {
    allowsChildren: true,
  },
  'translation-overlay': {
    allowsChildren: true,
  },
  preview: {
    allowsChildren: true,
    allowedParentDirectives: ['code-preview'],
    mutuallyExclusiveWith: ['preview-sandbox'],
    maxOccurrencesWithinParent: 1,
  },
  toolbar: {
    allowsChildren: true,
    allowedParentDirectives: ['code-preview'],
    maxOccurrencesWithinParent: 1,
  },
  tab: {
    allowsChildren: true,
    allowedParentDirectives: ['tabs'],
  },
  panel: {
    allowsChildren: true,
    allowedParentDirectives: ['tabs'],
  },

  'syntax-card': {
    allowsChildren: true,
  },
  'syntax-signature': {
    allowsChildren: true,
    allowedParentDirectives: ['syntax-card'],
    maxOccurrencesWithinParent: 1,
  },
  'syntax-section': {
    allowsChildren: true,
    allowedParentDirectives: ['syntax-card'],
  },
  'syntax-fields': {
    allowsChildren: true,
    allowedParentDirectives: ['syntax-section'],
  },
  'syntax-field': {
    allowsChildren: true,
    allowedParentDirectives: ['syntax-fields'],
  },
};
