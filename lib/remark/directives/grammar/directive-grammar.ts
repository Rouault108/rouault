import type { DirectiveName, MdastNode } from '../types.js';
import type { DirectiveAttributeSchema } from './attribute-schemas.js';
import { directiveAttributeSchemas } from './attribute-schemas.js';
import type { DirectiveKind } from './directive-kinds.js';
import type { DirectiveStructuralRule } from './structural-rules.js';
import { directiveStructuralRules } from './structural-rules.js';

export interface DirectiveGrammarDescriptor {
  readonly name: DirectiveName;
  readonly kind: DirectiveKind;
  readonly nodeType: string;
  readonly attributeSchema: DirectiveAttributeSchema;
  readonly structuralRule: DirectiveStructuralRule;
}

export const directiveGrammar: Record<DirectiveName, DirectiveGrammarDescriptor> = {
  callout: {
    name: 'callout',
    kind: 'container',
    nodeType: 'rouaultDirectiveCallout',
    attributeSchema: directiveAttributeSchemas.callout,
    structuralRule: directiveStructuralRules.callout,
  },
  'code-group': {
    name: 'code-group',
    kind: 'container',
    nodeType: 'rouaultDirectiveCodeGroup',
    attributeSchema: directiveAttributeSchemas['code-group'],
    structuralRule: directiveStructuralRules['code-group'],
  },
  'code-preview': {
    name: 'code-preview',
    kind: 'container',
    nodeType: 'rouaultDirectiveCodePreview',
    attributeSchema: directiveAttributeSchemas['code-preview'],
    structuralRule: directiveStructuralRules['code-preview'],
  },
  'preview-sandbox': {
    name: 'preview-sandbox',
    kind: 'container',
    nodeType: 'rouaultDirectivePreviewSandbox',
    attributeSchema: directiveAttributeSchemas['preview-sandbox'],
    structuralRule: directiveStructuralRules['preview-sandbox'],
  },
  details: {
    name: 'details',
    kind: 'container',
    nodeType: 'rouaultDirectiveDetails',
    attributeSchema: directiveAttributeSchemas.details,
    structuralRule: directiveStructuralRules.details,
  },
  'info-box': {
    name: 'info-box',
    kind: 'container',
    nodeType: 'rouaultDirectiveInfoBox',
    attributeSchema: directiveAttributeSchemas['info-box'],
    structuralRule: directiveStructuralRules['info-box'],
  },
  'link-card': {
    name: 'link-card',
    kind: 'leaf',
    nodeType: 'rouaultDirectiveLinkCard',
    attributeSchema: directiveAttributeSchemas['link-card'],
    structuralRule: directiveStructuralRules['link-card'],
  },
  score: {
    name: 'score',
    kind: 'container',
    nodeType: 'rouaultDirectiveScore',
    attributeSchema: directiveAttributeSchemas.score,
    structuralRule: directiveStructuralRules.score,
  },
  tabs: {
    name: 'tabs',
    kind: 'container',
    nodeType: 'rouaultDirectiveTabs',
    attributeSchema: directiveAttributeSchemas.tabs,
    structuralRule: directiveStructuralRules.tabs,
  },
  translation: {
    name: 'translation',
    kind: 'container',
    nodeType: 'rouaultDirectiveTranslation',
    attributeSchema: directiveAttributeSchemas.translation,
    structuralRule: directiveStructuralRules.translation,
  },
  'translation-overlay': {
    name: 'translation-overlay',
    kind: 'container',
    nodeType: 'rouaultDirectiveTranslationOverlay',
    attributeSchema: directiveAttributeSchemas['translation-overlay'],
    structuralRule: directiveStructuralRules['translation-overlay'],
  },
  preview: {
    name: 'preview',
    kind: 'container',
    nodeType: 'rouaultDirectivePreviewSlot',
    attributeSchema: directiveAttributeSchemas.preview,
    structuralRule: directiveStructuralRules.preview,
  },
  toolbar: {
    name: 'toolbar',
    kind: 'container',
    nodeType: 'rouaultDirectiveToolbarSlot',
    attributeSchema: directiveAttributeSchemas.toolbar,
    structuralRule: directiveStructuralRules.toolbar,
  },
  tab: {
    name: 'tab',
    kind: 'container',
    nodeType: 'rouaultDirectiveTabSlot',
    attributeSchema: directiveAttributeSchemas.tab,
    structuralRule: directiveStructuralRules.tab,
  },
  panel: {
    name: 'panel',
    kind: 'container',
    nodeType: 'rouaultDirectivePanelSlot',
    attributeSchema: directiveAttributeSchemas.panel,
    structuralRule: directiveStructuralRules.panel,
  },
};

export const supportedDirectiveNames = Object.keys(directiveGrammar) as DirectiveName[];

export const supportedDirectives = new Set<DirectiveName>(supportedDirectiveNames);

const directiveNameByNodeType: Partial<Record<string, DirectiveName>> = Object.fromEntries(
  supportedDirectiveNames.map((name) => [directiveGrammar[name]!.nodeType, name]),
) as Partial<Record<string, DirectiveName>>;

export const getDirectiveDescriptor = (name: DirectiveName): DirectiveGrammarDescriptor =>
  directiveGrammar[name]!;

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
