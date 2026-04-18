import { getDirectiveNameFromNode } from '../grammar/directive-grammar.js';
import { getDirectivePayload } from '../payload/registry.js';
import type {
  SyntaxCardPayload,
  SyntaxFieldPayload,
  SyntaxFieldsPayload,
  SyntaxSectionPayload,
} from '../payload/payload-types.js';
import type { MdastNode, VFileLike } from '../types.js';

export type AdaptRemarkNode = (node: MdastNode, file?: VFileLike) => MdastNode;

const toOptionalProps = (entries: [string, unknown][]): Record<string, unknown> =>
  Object.fromEntries(entries.filter(([, value]) => value !== undefined));

const preserveNodeMeta = (source: MdastNode, next: MdastNode): MdastNode => ({
  ...next,
  ...(source.position ? { position: source.position } : {}),
  ...(source.rouaultDirective ? { rouaultDirective: source.rouaultDirective } : {}),
});

const preserveNodeType = (node: MdastNode): Pick<MdastNode, 'type'> | Record<string, never> =>
  typeof node.type === 'string' ? { type: node.type } : {};

const normalizeLang = (value: string | undefined): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

const readSignatureCodeNode = (node: MdastNode): MdastNode | undefined =>
  (node.children ?? []).find((child) => child.type === 'code');

const resolveSyntaxCardLang = (node: MdastNode, payload: SyntaxCardPayload): string | undefined => {
  const signatureNode = (node.children ?? []).find(
    (child) => getDirectiveNameFromNode(child) === 'syntax-signature',
  );
  const signatureCode = signatureNode ? readSignatureCodeNode(signatureNode) : undefined;
  return payload.lang ?? normalizeLang(signatureCode?.lang);
};

const createSignaturePreNode = (signatureNode: MdastNode | undefined): MdastNode => {
  const signatureCode = signatureNode ? readSignatureCodeNode(signatureNode) : undefined;
  return {
    type: 'paragraph',
    ...(signatureNode?.position ? { position: signatureNode.position } : {}),
    data: {
      hName: 'pre',
      hProperties: {
        slot: 'signature',
        'data-syntax-signature': 'true',
      },
    },
    children: [{ type: 'text', value: signatureCode?.value ?? '' }],
  };
};

const adaptSyntaxFieldOutput = (
  node: MdastNode,
  adaptNode: AdaptRemarkNode,
  file?: VFileLike,
): MdastNode => {
  const payload = getDirectivePayload<SyntaxFieldPayload>(node);
  if (!payload) {
    return adaptNode({ ...node, children: node.children ?? [] }, file);
  }

  return preserveNodeMeta(node, {
    ...preserveNodeType(node),
    data: {
      hName: 'ui-syntax-field',
      hProperties: toOptionalProps([
        ['name', payload.name],
        ['type', payload.type],
        ['required', payload.required ? true : undefined],
        ['default', payload.defaultValue],
      ]),
    },
    ...(Array.isArray(node.children)
      ? { children: node.children.map((child) => adaptNode(child, file)) }
      : {}),
  });
};

const adaptSyntaxFieldsOutput = (
  node: MdastNode,
  adaptNode: AdaptRemarkNode,
  file?: VFileLike,
): MdastNode => {
  const payload = getDirectivePayload<SyntaxFieldsPayload>(node);
  if (!payload) {
    return adaptNode({ ...node, children: node.children ?? [] }, file);
  }

  return preserveNodeMeta(node, {
    ...preserveNodeType(node),
    data: {
      hName: 'dl',
    },
    ...(Array.isArray(node.children)
      ? {
          children: node.children.map((child) => {
            if (getDirectiveNameFromNode(child) === 'syntax-field') {
              return adaptSyntaxFieldOutput(child, adaptNode, file);
            }
            return adaptNode(child, file);
          }),
        }
      : {}),
  });
};

const adaptSyntaxSectionOutput = (
  node: MdastNode,
  adaptNode: AdaptRemarkNode,
  file?: VFileLike,
): MdastNode => {
  const payload = getDirectivePayload<SyntaxSectionPayload>(node);
  if (!payload) {
    return adaptNode({ ...node, children: node.children ?? [] }, file);
  }

  return preserveNodeMeta(node, {
    ...preserveNodeType(node),
    data: {
      hName: 'ui-syntax-section',
      hProperties: {
        label: payload.label,
      },
    },
    ...(Array.isArray(node.children)
      ? {
          children: node.children.map((child) => {
            if (getDirectiveNameFromNode(child) === 'syntax-fields') {
              return adaptSyntaxFieldsOutput(child, adaptNode, file);
            }
            return adaptNode(child, file);
          }),
        }
      : {}),
  });
};

export const adaptSyntaxCardOutput = (
  node: MdastNode,
  adaptNode: AdaptRemarkNode,
  file?: VFileLike,
): MdastNode => {
  const payload = getDirectivePayload<SyntaxCardPayload>(node);
  if (!payload) {
    return {
      ...node,
      ...(Array.isArray(node.children)
        ? { children: node.children.map((child) => adaptNode(child, file)) }
        : {}),
    };
  }

  const signatureNode = (node.children ?? []).find(
    (child) => getDirectiveNameFromNode(child) === 'syntax-signature',
  );
  const sectionNodes = (node.children ?? []).filter(
    (child) => getDirectiveNameFromNode(child) === 'syntax-section',
  );

  return preserveNodeMeta(node, {
    ...preserveNodeType(node),
    data: {
      hName: 'ui-syntax-card',
      hProperties: toOptionalProps([
        ['kind', payload.cardKind],
        ['name', payload.name],
        ['data-lang', resolveSyntaxCardLang(node, payload)],
        [
          'heading-level',
          typeof payload.headingLevel === 'number' ? String(payload.headingLevel) : undefined,
        ],
      ]),
    },
    children: [
      createSignaturePreNode(signatureNode),
      ...sectionNodes.map((child) => adaptSyntaxSectionOutput(child, adaptNode, file)),
    ],
  });
};
