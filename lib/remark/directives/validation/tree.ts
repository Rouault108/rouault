import type { DirectiveName, MdastNode, VFileLike } from '../types';
import {
  directiveMetadata,
  getDirectiveNameFromNode,
  getDirectiveNameFromNodeType,
} from '../shared/directive-metadata';
import { toError } from '../shared/errors';
import { directiveValidators } from './registry';

const countChildDirectives = (children: MdastNode[]): Map<DirectiveName, number> => {
  const counts = new Map<DirectiveName, number>();

  for (const child of children) {
    const directiveName = getDirectiveNameFromNode(child);
    if (!directiveName) {
      continue;
    }

    counts.set(directiveName, (counts.get(directiveName) ?? 0) + 1);
  }

  return counts;
};

const validateDirectiveParentConstraint = (
  node: MdastNode,
  file: VFileLike | undefined,
  parentType: string | undefined,
): void => {
  const directiveName = getDirectiveNameFromNode(node);
  if (!directiveName) {
    return;
  }

  const metadata = directiveMetadata[directiveName];
  const allowedParents = metadata.allowedParentDirectives;
  if (!allowedParents || allowedParents.length === 0) {
    return;
  }

  const parentDirectiveName = getDirectiveNameFromNodeType(parentType);
  if (parentDirectiveName && allowedParents.includes(parentDirectiveName)) {
    return;
  }

  throw toError(
    file,
    node,
    `${directiveName} は ${allowedParents.join(' / ')} の直下でのみ使用できます`,
  );
};

const validateDirectiveChildrenConstraint = (
  node: MdastNode,
  file: VFileLike | undefined,
): void => {
  const directiveName = getDirectiveNameFromNode(node);
  if (!directiveName) {
    return;
  }

  const metadata = directiveMetadata[directiveName];
  const children = node.children ?? [];

  if (!metadata.allowsChildren && children.length > 0) {
    throw toError(file, node, `${directiveName} は子ノードを持てません`);
  }
};

const validateChildOccurrenceConstraints = (
  node: MdastNode,
  file: VFileLike | undefined,
): void => {
  const children = node.children ?? [];
  if (children.length === 0) {
    return;
  }

  const counts = countChildDirectives(children);

  for (const [directiveName, count] of counts) {
    const metadata = directiveMetadata[directiveName];
    const maxOccurrences = metadata.maxOccurrencesWithinParent;

    if (typeof maxOccurrences === 'number' && count > maxOccurrences) {
      throw toError(
        file,
        node,
        `${directiveName} は同一親の直下に ${String(maxOccurrences)} 個までしか配置できません`,
      );
    }
  }
};

const validateChildMutualExclusionConstraints = (
  node: MdastNode,
  file: VFileLike | undefined,
): void => {
  const children = node.children ?? [];
  if (children.length === 0) {
    return;
  }

  const presentDirectives = new Set<DirectiveName>();
  for (const child of children) {
    const directiveName = getDirectiveNameFromNode(child);
    if (directiveName) {
      presentDirectives.add(directiveName);
    }
  }

  for (const directiveName of presentDirectives) {
    const metadata = directiveMetadata[directiveName];
    const mutuallyExclusiveWith = metadata.mutuallyExclusiveWith ?? [];

    for (const otherName of mutuallyExclusiveWith) {
      if (presentDirectives.has(otherName)) {
        throw toError(
          file,
          node,
          `${directiveName} と ${otherName} は同一親の直下で併用できません`,
        );
      }
    }
  }
};

const validateFenceCodeLanguageRequirements = (
  node: MdastNode,
  file: VFileLike | undefined,
): void => {
  const directiveName = getDirectiveNameFromNode(node);
  if (!directiveName) {
    return;
  }

  const metadata = directiveMetadata[directiveName];
  const requiredLanguages = metadata.requiresFenceCodeLanguages;
  if (!requiredLanguages || requiredLanguages.length === 0) {
    return;
  }

  const children = node.children ?? [];
  const codeChildren = children.filter((child) => child.type === 'code');

  for (const child of children) {
    if (child.type !== 'code') {
      throw toError(
        file,
        child,
        `${directiveName} には fenced code block のみ配置できます`,
      );
    }
  }

  const counts = new Map<string, number>();
  for (const codeChild of codeChildren) {
    const language = codeChild.lang?.trim().toLowerCase() ?? '';
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }

  for (const language of counts.keys()) {
    if (!requiredLanguages.includes(language)) {
      throw toError(
        file,
        node,
        `${directiveName} の code lang は ${requiredLanguages.join('/')} のみ指定可能です`,
      );
    }
  }
};

const validateDirectiveSpecificRules = (
  node: MdastNode,
  file: VFileLike | undefined,
  parentType: string | undefined,
): void => {
  const directiveName = getDirectiveNameFromNode(node);
  if (!directiveName) {
    return;
  }

  const validator = directiveValidators[directiveName];
  if (!validator) {
    return;
  }

  const context = {
    ...(file ? { file } : {}),
    ...(parentType ? { parentType } : {}),
  };

  validator.validate(node, context);
};

export const validateDirectiveTree = (
  nodes: MdastNode[],
  file?: VFileLike,
  parentType: string | undefined = undefined,
): void => {
  for (const node of nodes) {
    validateDirectiveParentConstraint(node, file, parentType);
    validateDirectiveChildrenConstraint(node, file);
    validateFenceCodeLanguageRequirements(node, file);
    validateDirectiveSpecificRules(node, file, parentType);

    if (Array.isArray(node.children) && node.children.length > 0) {
      validateChildOccurrenceConstraints(node, file);
      validateChildMutualExclusionConstraints(node, file);
      validateDirectiveTree(node.children, file, node.type);
    }
  }
};