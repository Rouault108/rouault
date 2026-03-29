import type { DirectiveName, MdastNode } from '../types';

export type DirectiveKind = 'leaf' | 'container';

export interface DirectiveMetadata {
  readonly kind: DirectiveKind;
  readonly nodeType: string;
  readonly slotName?: string;
  readonly allowsChildren: boolean;
  readonly allowedParentDirectives?: readonly DirectiveName[];
  readonly requiresFenceCodeLanguages?: readonly string[];
  readonly mutuallyExclusiveWith?: readonly DirectiveName[];
  readonly maxOccurrencesWithinParent?: number;
}

export const directiveMetadata: Record<DirectiveName, DirectiveMetadata> = {
  callout: {
    kind: 'container',
    nodeType: 'rouaultDirectiveCallout',
    allowsChildren: true,
  },

  'code-group': {
    kind: 'container',
    nodeType: 'rouaultDirectiveCodeGroup',
    allowsChildren: true,
  },

  'code-preview': {
    kind: 'container',
    nodeType: 'rouaultDirectiveCodePreview',
    allowsChildren: true,
  },

  'preview-sandbox': {
    kind: 'container',
    nodeType: 'rouaultDirectivePreviewSandbox',
    slotName: 'preview',
    allowsChildren: true,
    allowedParentDirectives: ['code-preview'],
    requiresFenceCodeLanguages: ['preview-html', 'preview-css', 'preview-js'],
    mutuallyExclusiveWith: ['preview'],
    maxOccurrencesWithinParent: 1,
  },

  details: {
    kind: 'container',
    nodeType: 'rouaultDirectiveDetails',
    allowsChildren: true,
  },

  'info-box': {
    kind: 'container',
    nodeType: 'rouaultDirectiveInfoBox',
    allowsChildren: true,
  },

  'link-card': {
    kind: 'leaf',
    nodeType: 'rouaultDirectiveLinkCard',
    allowsChildren: false,
  },

  score: {
    kind: 'container',
    nodeType: 'rouaultDirectiveScore',
    allowsChildren: true,
  },

  tabs: {
    kind: 'container',
    nodeType: 'rouaultDirectiveTabs',
    allowsChildren: true,
  },

  translation: {
    kind: 'container',
    nodeType: 'rouaultDirectiveTranslation',
    allowsChildren: true,
  },

  'translation-overlay': {
    kind: 'container',
    nodeType: 'rouaultDirectiveTranslationOverlay',
    allowsChildren: true,
  },

  preview: {
    kind: 'container',
    nodeType: 'rouaultDirectivePreviewSlot',
    slotName: 'preview',
    allowsChildren: true,
    allowedParentDirectives: ['code-preview'],
    mutuallyExclusiveWith: ['preview-sandbox'],
    maxOccurrencesWithinParent: 1,
  },

  toolbar: {
    kind: 'container',
    nodeType: 'rouaultDirectiveToolbarSlot',
    slotName: 'toolbar',
    allowsChildren: true,
    allowedParentDirectives: ['code-preview'],
    maxOccurrencesWithinParent: 1,
  },

  tab: {
    kind: 'container',
    nodeType: 'rouaultDirectiveTabSlot',
    slotName: 'tab',
    allowsChildren: true,
    allowedParentDirectives: ['tabs'],
  },

  panel: {
    kind: 'container',
    nodeType: 'rouaultDirectivePanelSlot',
    slotName: 'panel',
    allowsChildren: true,
    allowedParentDirectives: ['tabs'],
  },
};

export const supportedDirectiveNames = Object.keys(directiveMetadata) as DirectiveName[];

export const SUPPORTED_DIRECTIVES = new Set<DirectiveName>(supportedDirectiveNames);

export const leafDirectiveNames = new Set<DirectiveName>(
  supportedDirectiveNames.filter((name) => directiveMetadata[name].kind === 'leaf'),
);

export const containerDirectiveNames = new Set<DirectiveName>(
  supportedDirectiveNames.filter((name) => directiveMetadata[name].kind === 'container'),
);

export const directiveNodeTypeByName: Record<DirectiveName, string> = Object.fromEntries(
  supportedDirectiveNames.map((name) => [name, directiveMetadata[name].nodeType]),
) as Record<DirectiveName, string>;

export const directiveNameByNodeType: Partial<Record<string, DirectiveName>> = Object.fromEntries(
  supportedDirectiveNames.map((name) => [directiveMetadata[name].nodeType, name]),
) as Partial<Record<string, DirectiveName>>;

export const getDirectiveNameFromNode = (node: MdastNode): DirectiveName | null => {
  const type = node.type;
  if (typeof type !== 'string') {
    return null;
  }

  return directiveNameByNodeType[type] ?? null;
};

export const getDirectiveNameFromNodeType = (
  nodeType: string | undefined,
): DirectiveName | null => {
  if (typeof nodeType !== 'string') {
    return null;
  }

  return directiveNameByNodeType[nodeType] ?? null;
};
