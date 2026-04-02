import { type HastNode } from './hast-utils.js';

const isElement = (node: HastNode, tagName?: string): boolean => {
  if (node.type !== 'element' || typeof node.tagName !== 'string') {
    return false;
  }

  if (typeof tagName === 'string') {
    return node.tagName === tagName;
  }

  return true;
};

const getChildren = (node: HastNode): HastNode[] =>
  Array.isArray(node.children) ? node.children : [];

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const cloneNode = (node: HastNode): HastNode => {
  const cloned: HastNode = { ...node };
  if (node.properties) {
    cloned.properties = { ...node.properties };
  }
  if (Array.isArray(node.children)) {
    cloned.children = node.children.map((child) => cloneNode(child));
  }
  return cloned;
};

interface StaticCodeBlockMeta {
  readonly block: HastNode;
  readonly key: string;
  readonly tabLabel: string;
}

const readStaticCodeBlockMeta = (node: HastNode): StaticCodeBlockMeta | null => {
  if (!isElement(node, 'pre') || node.properties?.['data-code-block'] !== true) {
    return null;
  }

  const key = pickOptionalString(node.properties?.['data-code-group-key']);
  if (!key) {
    return null;
  }

  const tabLabel =
    pickOptionalString(node.properties?.['data-code-tab-label']) ??
    pickOptionalString(node.properties?.['data-code-filename']) ??
    pickOptionalString(node.properties?.['data-code-label']) ??
    pickOptionalString(node.properties?.['data-code-language']);

  if (!tabLabel) {
    return null;
  }

  return { block: node, key, tabLabel };
};

let codeGroupCounter = 0;

const createTabButton = (key: string, label: string): HastNode => ({
  type: 'element',
  tagName: 'button',
  properties: {
    type: 'button',
    'data-code-group-tab': key,
  },
  children: [{ type: 'text', value: label }],
});

const createGroupCopyButton = (): HastNode => ({
  type: 'element',
  tagName: 'div',
  properties: {
    className: ['code-group-header-tools'],
  },
  children: [
    {
      type: 'element',
      tagName: 'ui-copy-button',
      properties: {
        size: 'sm',
        label: 'コードをコピー',
        disabled: true,
        'data-code-group-copy': 'true',
      },
      children: [],
    },
  ],
});

const createPanel = (item: StaticCodeBlockMeta, selected: boolean): HastNode => ({
  type: 'element',
  tagName: 'section',
  properties: {
    'data-code-group-panel': item.key,
    'data-code-group-panel-label': item.tabLabel,
    ...(selected ? {} : { 'data-code-group-inactive': 'true' }),
  },
  children: [
    {
      type: 'element',
      tagName: 'p',
      properties: {
        className: ['code-group-stack-label'],
      },
      children: [{ type: 'text', value: item.tabLabel }],
    },
    cloneNode(item.block),
  ],
});

export function rehypeStaticCodeGroups(): (tree: unknown) => void {
  return (tree: unknown) => {
    const visit = (node: HastNode): void => {
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          visit(child);
        }
      }

      if (!isElement(node, 'ui-code-group')) {
        return;
      }

      const items = getChildren(node)
        .map((child) => readStaticCodeBlockMeta(child))
        .filter((item): item is StaticCodeBlockMeta => item !== null);

      if (items.length <= 1) {
        const fallback = items[0]?.block;
        if (fallback) {
          const cloned = cloneNode(fallback);
          if (cloned.tagName !== undefined) {
            node.tagName = cloned.tagName;
          }
          node.properties = cloned.properties ?? {};
          node.children = cloned.children ?? [];
        }
        return;
      }

      codeGroupCounter += 1;
      const groupId = `code-group-${String(codeGroupCounter)}`;
      const selectedKey = items[0]?.key ?? '';
      const originalProperties = { ...(node.properties ?? {}) };

      node.tagName = 'section';
      node.properties = {
        ...originalProperties,
        'data-code-group': true,
        'data-code-group-id': groupId,
        'data-code-group-selected': selectedKey,
        'data-code-group-label':
          pickOptionalString(originalProperties['aria-label']) ?? 'コード比較',
        'data-hydration-key': 'code-group-enhancer',
        'data-hydration-capability': 'interactive',
        'data-hydration-trigger': 'visible',
      };
      node.children = [
        {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['code-group-header'],
          },
          children: [
            {
              type: 'element',
              tagName: 'div',
              properties: {
                className: ['code-group-tablist'],
              },
              children: items.map((item) => createTabButton(item.key, item.tabLabel)),
            },
            createGroupCopyButton(),
          ],
        },
        ...items.map((item, index) => createPanel(item, index === 0)),
      ];
    };

    if (tree && typeof tree === 'object') {
      visit(tree as HastNode);
    }
  };
}
