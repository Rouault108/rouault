import { type HastNode } from './hast-utils.js';

const isElement = (node: HastNode, tagName?: string): boolean => {
  if (node.type !== 'element' || typeof node.tagName !== 'string') {
    return false;
  }

  return typeof tagName === 'string' ? node.tagName === tagName : true;
};

const cloneNode = (node: HastNode): HastNode => {
  const clonedNode: HastNode = {};
  if (node.type !== undefined) {
    clonedNode.type = node.type;
  }
  if (node.tagName !== undefined) {
    clonedNode.tagName = node.tagName;
  }
  if (node.value !== undefined) {
    clonedNode.value = node.value;
  }
  if (node.properties !== undefined) {
    clonedNode.properties = { ...node.properties };
  }
  if (Array.isArray(node.children)) {
    clonedNode.children = node.children.map((child) => cloneNode(child));
  }
  if (node.content) {
    clonedNode.content = {
      type: 'root',
      children: node.content.children.map((child) => cloneNode(child)),
    };
  }
  return clonedNode;
};

const isWhitespaceText = (node: HastNode): boolean =>
  node.type === 'text' && (typeof node.value !== 'string' || node.value.trim().length === 0);

const getStringProperty = (node: HastNode, name: string): string => {
  const value = node.properties?.[name];
  return typeof value === 'string' ? value.trim() : '';
};

const getLabel = (block: HastNode, index: number): string => {
  const explicit = getStringProperty(block, 'data-code-tab-label');
  if (explicit.length > 0) {
    return explicit;
  }

  const filename = getStringProperty(block, 'data-code-filename');
  if (filename.length > 0) {
    return filename;
  }

  const language = getStringProperty(block, 'data-code-language');
  if (language.length > 0) {
    return language;
  }

  return `Code ${String(index + 1)}`;
};

const getKey = (block: HastNode, index: number): string => {
  const explicit = getStringProperty(block, 'data-code-group-key');
  if (explicit.length > 0) {
    return explicit;
  }

  const label = getLabel(block, index)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (label.length > 0) {
    return label;
  }

  return `code-${String(index + 1)}`;
};

const createTextNode = (value: string): HastNode => ({
  type: 'text',
  value,
});

const createButton = (
  groupId: string,
  key: string,
  label: string,
  selected: boolean,
): HastNode => ({
  type: 'element',
  tagName: 'button',
  properties: {
    type: 'button',
    role: 'tab',
    id: `${groupId}-tab-${key}`,
    'aria-controls': `${groupId}-panel-${key}`,
    'aria-selected': selected ? 'true' : 'false',
    tabindex: selected ? '0' : '-1',
    'data-code-group-tab': key,
  },
  children: [createTextNode(label)],
});

const createPanel = (groupId: string, key: string, label: string, block: HastNode): HastNode => ({
  type: 'element',
  tagName: 'section',
  properties: {
    role: 'tabpanel',
    id: `${groupId}-panel-${key}`,
    'aria-labelledby': `${groupId}-tab-${key}`,
    'data-code-group-panel': key,
    'data-code-group-panel-label': label,
  },
  children: [block],
});

let codeGroupCounter = 0;

const transformCodeGroup = (node: HastNode): void => {
  const rawChildren = Array.isArray(node.children) ? node.children : [];
  const blocks = rawChildren.filter((child) => isElement(child, 'pre'));
  const foreignChildren = rawChildren.filter(
    (child) => !isWhitespaceText(child) && !isElement(child, 'pre'),
  );

  if (foreignChildren.length > 0 || blocks.length === 0) {
    return;
  }

  if (blocks.length === 1) {
    const first = blocks[0];
    if (first) {
      node.tagName = 'pre';
      node.properties = { ...(first.properties ?? {}) };
      node.children = Array.isArray(first.children) ? first.children.map((child) => cloneNode(child)) : [];
    }
    return;
  }

  codeGroupCounter += 1;
  const groupId = `code-group-${String(codeGroupCounter)}`;
  const items = blocks.map((block, index) => {
    const key = getKey(block, index);
    const label = getLabel(block, index);
    return {
      key,
      label,
      block: cloneNode(block),
    };
  });

  const ariaLabel =
    typeof node.properties?.['aria-label'] === 'string' && node.properties['aria-label'].trim().length > 0
      ? node.properties['aria-label'].trim()
      : 'コード比較';

  node.tagName = 'section';
  node.properties = {
    'data-code-group': true,
    'data-code-group-id': groupId,
    'data-hydration-key': 'code-group-enhancer',
    'data-hydration-capability': 'interactive',
    'data-hydration-trigger': 'visible',
    'aria-label': ariaLabel,
  };
  node.children = [
    {
      type: 'element',
      tagName: 'div',
      properties: {
        role: 'tablist',
        'aria-label': ariaLabel,
      },
      children: items.map((item, index) => createButton(groupId, item.key, item.label, index === 0)),
    },
    ...items.map((item) => createPanel(groupId, item.key, item.label, item.block)),
  ];
};

export function rehypeStaticCodeGroups() {
  return (tree: unknown) => {
    const visit = (node: HastNode): void => {
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          visit(child);
        }
      }

      if (isElement(node, 'ui-code-group')) {
        transformCodeGroup(node);
      }
    };

    if (tree && typeof tree === 'object') {
      visit(tree as HastNode);
    }
  };
}
