import { type HastNode } from './hast-utils.js';

export type CodeLineState = 'normal' | 'highlight' | 'add' | 'remove';

type StatefulCodeLineState = Exclude<CodeLineState, 'normal'>;

interface CodeLineSemanticDefinition {
  readonly label: string;
  readonly wrapperTagName: 'mark' | 'ins' | 'del';
}

const CODE_LINE_SEMANTICS = {
  highlight: { label: '強調行', wrapperTagName: 'mark' },
  add: { label: '追加行', wrapperTagName: 'ins' },
  remove: { label: '削除行', wrapperTagName: 'del' },
} as const satisfies Record<StatefulCodeLineState, CodeLineSemanticDefinition>;

const CODE_LINE_SEMANTIC_WRAPPER_TAGS = new Set<string>(['mark', 'ins', 'del']);

export type CodeLineStateOrigin =
  | 'highlight-lines'
  | 'highlight notation'
  | 'diff add'
  | 'diff remove';

interface CodeLineStateContext {
  readonly blockIdentifier: `code-block:${number}`;
  readonly filename?: string;
  readonly language: string;
  readonly notePath: string;
}

interface CodeLineStateCandidate {
  readonly origin: CodeLineStateOrigin;
  readonly state: StatefulCodeLineState;
}

const getClassList = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value.split(/\s+/u).filter((item) => item.length > 0);
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  return [];
};

const getNodeClassList = (node: HastNode): string[] => [
  ...getClassList(node.properties?.['className']),
  ...getClassList(node.properties?.['class']),
];

const getLineNodes = (codeNode: HastNode): HastNode[] =>
  (codeNode.children ?? []).filter(
    (child) =>
      child.type === 'element' &&
      child.tagName === 'span' &&
      getNodeClassList(child).includes('line'),
  );

const readStateCandidates = (lineNode: HastNode): CodeLineStateCandidate[] => {
  const classes = new Set(getNodeClassList(lineNode));
  const candidates: CodeLineStateCandidate[] = [];

  if (classes.has('ui-explicit-highlight')) {
    candidates.push({ state: 'highlight', origin: 'highlight-lines' });
  }
  if (classes.has('highlighted')) {
    candidates.push({ state: 'highlight', origin: 'highlight notation' });
  }
  if (classes.has('diff') && classes.has('add')) {
    candidates.push({ state: 'add', origin: 'diff add' });
  }
  if (classes.has('diff') && classes.has('remove')) {
    candidates.push({ state: 'remove', origin: 'diff remove' });
  }

  return candidates;
};

const formatConflictError = (
  context: CodeLineStateContext,
  lineNumber: number,
  candidates: readonly CodeLineStateCandidate[],
): string => {
  const states = [...new Set(candidates.map((candidate) => candidate.state))].sort();
  const origins = [...new Set(candidates.map((candidate) => candidate.origin))].sort();
  const filename = context.filename ? `; filename: ${context.filename}` : '';

  return (
    '[markdown] conflicting code line states; ' +
    `note path: ${context.notePath}; block: ${context.blockIdentifier}${filename}; ` +
    `language: ${context.language}; code line: ${lineNumber.toString()}; ` +
    `states: ${states.join(', ')}; origins: ${origins.join(', ')}`
  );
};

const isOwnedSemanticWrapper = (node: HastNode | undefined): node is HastNode =>
  node?.type === 'element' &&
  typeof node.tagName === 'string' &&
  CODE_LINE_SEMANTIC_WRAPPER_TAGS.has(node.tagName);

const readUnwrappedLineChildren = (lineNode: HastNode): HastNode[] => {
  const children = lineNode.children ?? [];
  const onlyChild = children.length === 1 ? children[0] : undefined;
  return isOwnedSemanticWrapper(onlyChild) ? (onlyChild.children ?? []) : children;
};

const applyCodeLineSemantics = (lineNode: HastNode, state: CodeLineState): void => {
  lineNode.properties ??= {};

  if (state === 'normal') {
    delete lineNode.properties['role'];
    delete lineNode.properties['aria-label'];
    lineNode.children = readUnwrappedLineChildren(lineNode);
    return;
  }

  const semantics = CODE_LINE_SEMANTICS[state];
  lineNode.properties['role'] = 'group';
  lineNode.properties['aria-label'] = semantics.label;

  const children = lineNode.children ?? [];
  const onlyChild = children.length === 1 ? children[0] : undefined;
  if (isOwnedSemanticWrapper(onlyChild) && onlyChild.tagName === semantics.wrapperTagName) {
    return;
  }

  lineNode.children = [
    {
      type: 'element',
      tagName: semantics.wrapperTagName,
      properties: {},
      children: readUnwrappedLineChildren(lineNode),
    },
  ];
};

export const normalizeCodeLineStates = (
  codeNode: HastNode,
  preNode: HastNode,
  context: CodeLineStateContext,
): void => {
  let hasLineState = false;

  getLineNodes(codeNode).forEach((lineNode, index) => {
    const candidates = readStateCandidates(lineNode);
    const states = new Set(candidates.map((candidate) => candidate.state));
    if (states.size > 1) {
      throw new Error(formatConflictError(context, index + 1, candidates));
    }

    const state = candidates[0]?.state ?? 'normal';
    lineNode.properties = {
      ...(lineNode.properties ?? {}),
      'data-code-line-state': state,
    };
    applyCodeLineSemantics(lineNode, state);
    hasLineState ||= state !== 'normal';
  });

  preNode.properties ??= {};
  if (hasLineState) {
    preNode.properties['data-code-has-line-state'] = 'true';
  } else {
    delete preNode.properties['data-code-has-line-state'];
  }
};
