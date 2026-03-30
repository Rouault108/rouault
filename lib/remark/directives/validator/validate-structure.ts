import { getDirectiveDescriptor, getDirectiveNameFromNode } from '../grammar/directive-grammar.js';
import { getDirectivePayload } from '../payload/registry.js';
import type { PreviewSandboxPayload, TabPayload, TabsPayload } from '../payload/payload-types.js';
import { toError } from '../shared/errors.js';
import type { DirectiveName, MdastNode, VFileLike } from '../types.js';

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
  parentDirectiveName: DirectiveName | undefined,
): void => {
  const directiveName = getDirectiveNameFromNode(node);
  if (!directiveName) {
    return;
  }

  const allowedParents = getDirectiveDescriptor(directiveName).structuralRule.allowedParentDirectives;
  if (!allowedParents || allowedParents.length === 0) {
    return;
  }

  if (parentDirectiveName && allowedParents.includes(parentDirectiveName)) {
    return;
  }

  throw toError(
    file,
    node,
    `${directiveName} は ${allowedParents.join(' / ')} の直下でのみ使用できます`,
  );
};

const validateDirectiveChildrenConstraint = (node: MdastNode, file?: VFileLike): void => {
  const directiveName = getDirectiveNameFromNode(node);
  if (!directiveName) {
    return;
  }

  const allowsChildren = getDirectiveDescriptor(directiveName).structuralRule.allowsChildren;
  const children = node.children ?? [];

  if (!allowsChildren && children.length > 0) {
    throw toError(file, node, `${directiveName} は子ノードを持てません`);
  }
};

const validateChildOccurrenceConstraints = (node: MdastNode, file?: VFileLike): void => {
  const children = node.children ?? [];
  const counts = countChildDirectives(children);

  for (const [directiveName, count] of counts) {
    const maxOccurrences = getDirectiveDescriptor(directiveName).structuralRule.maxOccurrencesWithinParent;
    if (typeof maxOccurrences === 'number' && count > maxOccurrences) {
      throw toError(
        file,
        node,
        `${directiveName} は同一親の直下に ${String(maxOccurrences)} 個までしか配置できません`,
      );
    }
  }
};

const validateChildMutualExclusionConstraints = (node: MdastNode, file?: VFileLike): void => {
  const children = node.children ?? [];
  const presentDirectives = new Set<DirectiveName>();

  for (const child of children) {
    const directiveName = getDirectiveNameFromNode(child);
    if (directiveName) {
      presentDirectives.add(directiveName);
    }
  }

  for (const directiveName of presentDirectives) {
    const mutuallyExclusiveWith =
      getDirectiveDescriptor(directiveName).structuralRule.mutuallyExclusiveWith ?? [];
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

const validateFenceCodeLanguageRequirements = (node: MdastNode, file?: VFileLike): void => {
  const directiveName = getDirectiveNameFromNode(node);
  if (!directiveName) {
    return;
  }

  const requiredLanguages =
    getDirectiveDescriptor(directiveName).structuralRule.requiresFenceCodeLanguages;
  if (!requiredLanguages || requiredLanguages.length === 0) {
    return;
  }

  const children = node.children ?? [];
  const codeChildren = children.filter((child) => child.type === 'code');

  for (const child of children) {
    if (child.type !== 'code') {
      throw toError(file, child, `${directiveName} には fenced code block のみ配置できます`);
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

const validatePreviewSandboxStructure = (
  node: MdastNode,
  payload: PreviewSandboxPayload,
  file?: VFileLike,
): void => {
  const children = node.children ?? [];
  let htmlCount = 0;
  let cssCount = 0;
  let jsCount = 0;

  for (const child of children) {
    if (child.type !== 'code') {
      throw toError(file, child, 'preview-sandbox には fenced code block のみ配置できます');
    }

    const language = child.lang?.trim().toLowerCase() ?? '';
    if (language === 'preview-html') {
      htmlCount += 1;
    } else if (language === 'preview-css') {
      cssCount += 1;
    } else if (language === 'preview-js') {
      jsCount += 1;
    }
  }

  if (htmlCount === 0) {
    throw toError(file, node, 'preview-sandbox には preview-html が必須です');
  }

  if (htmlCount > 1) {
    throw toError(file, node, 'preview-sandbox の preview-html は 1 つだけ指定できます');
  }

  if (cssCount > 1) {
    throw toError(file, node, 'preview-sandbox の preview-css は 1 つだけ指定できます');
  }

  if (jsCount > 1) {
    throw toError(file, node, 'preview-sandbox の preview-js は 1 つだけ指定できます');
  }

  if (jsCount > 0 && !payload.allowJs) {
    throw toError(
      file,
      node,
      'preview-js を使う場合、preview-sandbox の allow-js="true" が必要です',
    );
  }
};

const validateCodePreviewStructure = (node: MdastNode, file?: VFileLike): void => {
  const children = node.children ?? [];
  const sandboxChildren = children.filter(
    (child) => getDirectiveNameFromNode(child) === 'preview-sandbox',
  );

  if (sandboxChildren.length === 0) {
    return;
  }

  const hasManualCodeArea = children.some((child) => {
    const directiveName = getDirectiveNameFromNode(child);
    return (
      child.type !== 'code' &&
      directiveName !== 'preview-sandbox' &&
      directiveName !== 'preview' &&
      directiveName !== 'toolbar'
    );
  });

  if (hasManualCodeArea || children.some((child) => child.type === 'code')) {
    throw toError(
      file,
      node,
      'preview-sandbox を使う code-preview では手書きの code area を併用できません',
    );
  }
};

const validateTabsStructure = (node: MdastNode, payload: TabsPayload, file?: VFileLike): void => {
  const children = node.children ?? [];
  const tabChildren = children.filter((child) => getDirectiveNameFromNode(child) === 'tab');
  const panelChildren = children.filter((child) => getDirectiveNameFromNode(child) === 'panel');

  for (const child of children) {
    const directiveName = getDirectiveNameFromNode(child);
    if (directiveName && directiveName !== 'tab' && directiveName !== 'panel') {
      throw toError(file, child, 'tabs の直下には tab または panel のみ配置できます');
    }
  }

  if (tabChildren.length === 0) {
    throw toError(file, node, 'tabs には少なくとも 1 つの tab が必要です');
  }

  if (panelChildren.length === 0) {
    throw toError(file, node, 'tabs には少なくとも 1 つの panel が必要です');
  }

  if (tabChildren.length !== panelChildren.length) {
    throw toError(file, node, 'tabs 直下の tab と panel の個数は一致している必要があります');
  }

  const seenValues = new Set<string>();
  for (const tabNode of tabChildren) {
    const tabPayload = getDirectivePayload<TabPayload>(tabNode);
    const value = tabPayload?.value?.trim();
    if (!value) {
      throw toError(file, tabNode, 'tab には value 属性が必須です');
    }

    if (seenValues.has(value)) {
      throw toError(file, tabNode, `tab の value "${value}" が重複しています`);
    }

    seenValues.add(value);
  }

  if (payload.selectedValue && !seenValues.has(payload.selectedValue)) {
    throw toError(
      file,
      node,
      `tabs の selected-value "${payload.selectedValue}" に対応する tab.value が存在しません`,
    );
  }

  if (payload.defaultSelectedValue && !seenValues.has(payload.defaultSelectedValue)) {
    throw toError(
      file,
      node,
      `tabs の default-selected-value "${payload.defaultSelectedValue}" に対応する tab.value が存在しません`,
    );
  }
};

const validateTabStructure = (node: MdastNode, payload: TabPayload | undefined, file?: VFileLike): void => {
  if (!payload?.value?.trim()) {
    throw toError(file, node, 'tab には value 属性が必須です');
  }
};

export const validateStructure = (
  nodes: MdastNode[],
  file?: VFileLike,
  parentDirectiveName: DirectiveName | undefined = undefined,
): void => {
  for (const node of nodes) {
    const directiveName = getDirectiveNameFromNode(node);
    validateDirectiveParentConstraint(node, file, parentDirectiveName);
    validateDirectiveChildrenConstraint(node, file);
    validateFenceCodeLanguageRequirements(node, file);

    if (directiveName === 'preview-sandbox') {
      validatePreviewSandboxStructure(node, getDirectivePayload<PreviewSandboxPayload>(node)!, file);
    }
    if (directiveName === 'code-preview') {
      validateCodePreviewStructure(node, file);
    }
    if (directiveName === 'tabs') {
      validateTabsStructure(node, getDirectivePayload<TabsPayload>(node)!, file);
    }
    if (directiveName === 'tab') {
      validateTabStructure(node, getDirectivePayload<TabPayload>(node), file);
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      validateChildOccurrenceConstraints(node, file);
      validateChildMutualExclusionConstraints(node, file);
      validateStructure(node.children, file, directiveName ?? parentDirectiveName);
    }
  }
};
