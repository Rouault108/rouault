import { type HastNode } from './hast-utils.js';

type PreviewKind = 'html' | 'css' | 'js';

interface PreviewSnippet {
  readonly kind: PreviewKind;
  readonly source: string;
  readonly properties: Record<string, unknown>;
}

const PREVIEW_KIND_ORDER: PreviewKind[] = ['html', 'css', 'js'];
const PREVIEW_KIND_TO_LANGUAGE: Record<PreviewKind, string> = {
  html: 'html',
  css: 'css',
  js: 'js',
};
const PREVIEW_KIND_TO_FILENAME: Record<PreviewKind, string> = {
  html: 'preview.html',
  css: 'preview.css',
  js: 'preview.js',
};

const isElement = (node: HastNode, tagName?: string): boolean => {
  if (node.type !== 'element' || typeof node.tagName !== 'string') {
    return false;
  }
  if (typeof tagName === 'string') {
    return node.tagName === tagName;
  }
  return true;
};

const getClassList = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value.split(/\s+/).filter((item) => item.length > 0);
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  return [];
};

const getTextContent = (node: HastNode): string => {
  if (node.type === 'text') {
    return typeof node.value === 'string' ? node.value : '';
  }
  if (!Array.isArray(node.children)) {
    return '';
  }
  return node.children.map((child) => getTextContent(child)).join('');
};

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const findCodeChild = (node: HastNode): HastNode | null => {
  if (!Array.isArray(node.children)) {
    return null;
  }
  return node.children.find((child) => isElement(child, 'code')) ?? null;
};

const readPreviewKind = (codeNode: HastNode): PreviewKind | null => {
  const classList = getClassList(codeNode.properties?.['className']);
  for (const className of classList) {
    if (className === 'language-preview-html') return 'html';
    if (className === 'language-preview-css') return 'css';
    if (className === 'language-preview-js') return 'js';
  }
  return null;
};

const cloneProperties = (properties: Record<string, unknown>): Record<string, unknown> => ({
  ...properties,
});

const extractSnippet = (node: HastNode): PreviewSnippet | null => {
  if (!isElement(node, 'pre')) {
    return null;
  }

  const codeNode = findCodeChild(node);
  if (!codeNode) {
    return null;
  }

  const kind = readPreviewKind(codeNode);
  if (!kind) {
    return null;
  }

  return {
    kind,
    source: getTextContent(codeNode).replace(/\r\n?/g, '\n'),
    properties: cloneProperties(codeNode.properties ?? {}),
  };
};

const createTemplateNode = (kind: PreviewKind, source: string): HastNode => ({
  type: 'element',
  tagName: 'template',
  properties: {
    'data-preview-kind': kind,
  },
  content: {
    type: 'root',
    children: [{ type: 'text', value: source }],
  },
  children: [],
});

const createGeneratedCodeNode = (snippet: PreviewSnippet): HastNode => {
  const codeProperties = cloneProperties(snippet.properties);
  codeProperties['className'] = [`language-${PREVIEW_KIND_TO_LANGUAGE[snippet.kind]}`];
  codeProperties['filename'] =
    pickOptionalString(codeProperties['filename']) ?? PREVIEW_KIND_TO_FILENAME[snippet.kind];

  return {
    type: 'element',
    tagName: 'pre',
    properties: {},
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: codeProperties,
        children: [{ type: 'text', value: snippet.source }],
      },
    ],
  };
};

const createCodeAreaNode = (snippets: PreviewSnippet[], label: string): HastNode => {
  const generatedChildren = snippets.map((snippet) => createGeneratedCodeNode(snippet));
  if (generatedChildren.length === 1) {
    const [firstChild] = generatedChildren;
    if (firstChild) {
      return firstChild;
    }
  }

  return {
    type: 'element',
    tagName: 'ui-code-group',
    properties: {
      'aria-label': label,
    },
    children: generatedChildren,
  };
};

const resolveCodeGroupLabel = (previewNode: HastNode, sandboxNode: HastNode): string => {
  const previewLabel = pickOptionalString(previewNode.properties?.['label']);
  if (previewLabel) {
    return `${previewLabel} のコード例`;
  }

  const sandboxTitle = pickOptionalString(sandboxNode.properties?.['title']);
  if (sandboxTitle) {
    return `${sandboxTitle} のコード例`;
  }

  return 'プレビューコード例';
};

const transformCodePreview = (node: HastNode): void => {
  if (!Array.isArray(node.children)) {
    return;
  }

  const sandboxNode = node.children.find((child) => isElement(child, 'ui-preview-sandbox'));
  if (!sandboxNode || !Array.isArray(sandboxNode.children)) {
    return;
  }

  const snippets = sandboxNode.children
    .map((child) => extractSnippet(child))
    .filter((snippet): snippet is PreviewSnippet => snippet !== null);
  const orderedSnippets = PREVIEW_KIND_ORDER.flatMap((kind) =>
    snippets.filter((snippet) => snippet.kind === kind),
  );

  sandboxNode.children = orderedSnippets.map((snippet) => createTemplateNode(snippet.kind, snippet.source));
  if (orderedSnippets.length === 0) {
    return;
  }

  node.children = [...node.children, createCodeAreaNode(orderedSnippets, resolveCodeGroupLabel(node, sandboxNode))];
};

/**
 * preview-sandbox の source を inert payload と表示用 code area に展開する。
 */
export function rehypePreviewSandbox() {
  return (tree: unknown) => {
    const visit = (node: HastNode): void => {
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          visit(child);
        }
      }

      if (isElement(node, 'ui-code-preview')) {
        transformCodePreview(node);
      }
    };

    if (tree && typeof tree === 'object') {
      visit(tree as HastNode);
    }
  };
}
