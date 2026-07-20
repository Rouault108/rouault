import { createStaticCodeCopySourceHast } from './static-code-copy-source.js';
import { createStaticCopyButtonHast } from './static-copy-button-hast.js';
import { createStaticCodeBlockRoot } from './static-code-block-root.js';
import { type HastNode } from './hast-utils.js';
import {
  createStaticRenderIdContext,
  type StaticRenderIdContext,
} from '../../shared/static-render-id-context.js';

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

const hasSourceProperty = (node: HastNode, kebabName: string, camelName: string): boolean =>
  node.properties?.[kebabName] !== undefined || node.properties?.[camelName] !== undefined;

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
  readonly source: string;
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

  const source = pickOptionalString(node.properties?.['data-code-copy-source']) ?? '';

  return { block: node, key, source, tabLabel };
};

const createTabButton = (key: string, label: string): HastNode => ({
  type: 'element',
  tagName: 'button',
  properties: {
    type: 'button',
    'data-code-group-tab': 'true',
    'data-code-group-key': key,
  },
  children: [{ type: 'text', value: label }],
});

interface CodeGroupItemIds {
  readonly tabId: string;
  readonly panelId: string;
  readonly copySourceId: string;
}

const createGroupCopyButton = (targetId: string, statusId: string): HastNode => ({
  type: 'element',
  tagName: 'div',
  properties: {
    className: ['code-group-header-tools'],
  },
  children:
    createStaticCopyButtonHast({
      targetId,
      statusId,
      label: 'コードをコピー',
      buttonClassName: 'code-group-copy-button',
      extraButtonAttributes: [{ name: 'data-code-group-copy', value: 'true' }],
    }).children ?? [],
});

const cloneStaticCodeBlock = (item: StaticCodeBlockMeta): HastNode => {
  const block = cloneNode(item.block);
  if (block.properties) {
    delete block.properties['data-code-copy-source'];
  }
  return block;
};

const createGroupOwnedCodeBlock = (
  item: StaticCodeBlockMeta,
  idContext: StaticRenderIdContext,
): HastNode => {
  const block = cloneStaticCodeBlock(item);
  const filename = pickOptionalString(block.properties?.['data-code-filename']);
  return createStaticCodeBlockRoot({
    idContext,
    preNode: block,
    source: item.source,
    language: pickOptionalString(block.properties?.['data-code-language']) ?? 'text',
    groupOwned: true,
    assignHydrationRoot: false,
    renderStandaloneCopyButton: false,
    ...(filename ? { filename } : {}),
  });
};

const createPanel = (
  item: StaticCodeBlockMeta,
  copySourceId: string,
  panelId: string,
  active: boolean,
  idContext: StaticRenderIdContext,
): HastNode => ({
  type: 'element',
  tagName: 'section',
  properties: {
    id: panelId,
    'data-code-group-panel': item.key,
    'data-code-group-panel-active': active ? 'true' : 'false',
    'data-code-group-panel-label': item.tabLabel,
    'data-code-copy-source-id': copySourceId,
  },
  children: [
    createStaticCodeCopySourceHast(copySourceId, item.source),
    {
      type: 'element',
      tagName: 'p',
      properties: {
        className: ['code-group-stack-label'],
      },
      children: [{ type: 'text', value: item.tabLabel }],
    },
    createGroupOwnedCodeBlock(item, idContext),
  ],
});

const createStandaloneFallback = (
  item: StaticCodeBlockMeta,
  idContext: StaticRenderIdContext,
): HastNode => {
  const block = cloneStaticCodeBlock(item);
  const filename = pickOptionalString(block.properties?.['data-code-filename']);
  return createStaticCodeBlockRoot({
    idContext,
    preNode: block,
    source: item.source,
    language: pickOptionalString(block.properties?.['data-code-language']) ?? 'text',
    groupOwned: false,
    assignHydrationRoot: true,
    renderStandaloneCopyButton: true,
    ...(filename ? { filename } : {}),
  });
};

export function rehypeStaticCodeGroups(
  options: { readonly idContext?: StaticRenderIdContext } = {},
): (tree: unknown, file?: { path?: string }) => void {
  return (tree: unknown, file?: { path?: string }) => {
    const idContext =
      options.idContext ??
      createStaticRenderIdContext(
        file?.path ? `note:${file.path}:code-groups` : 'note:code-groups',
      );
    const visit = (node: HastNode): void => {
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          visit(child);
        }
      }

      if (
        !(
          isElement(node, 'section') &&
          hasSourceProperty(node, 'data-code-group-source', 'dataCodeGroupSource')
        )
      ) {
        return;
      }

      const items = getChildren(node)
        .map((child) => readStaticCodeBlockMeta(child))
        .filter((item): item is StaticCodeBlockMeta => item !== null);

      if (items.length <= 1) {
        const fallback = items[0] ? createStandaloneFallback(items[0], idContext) : undefined;
        if (fallback) {
          if (fallback.tagName !== undefined) {
            node.tagName = fallback.tagName;
          }
          node.properties = fallback.properties ?? {};
          node.children = fallback.children ?? [];
        }
        return;
      }

      const groupId = idContext.nextId('code-group');
      const selectedKey = items[0]?.key ?? '';
      const itemIds = items.map(
        (item, index): CodeGroupItemIds => ({
          tabId: idContext.reserveId('code-group-tab', `${groupId}-tab-${item.key}`),
          panelId: idContext.reserveId('code-group-panel', `${groupId}-panel-${item.key}`),
          copySourceId: idContext.reserveId(
            'copy-source',
            `${groupId}-copy-source-${String(index)}`,
          ),
        }),
      );
      const selectedCopySourceId = itemIds[0]?.copySourceId ?? `${groupId}-copy-source-0`;
      const selectedCopyStatusId = idContext.reserveId(
        'copy-status',
        `${selectedCopySourceId}-copy-status`,
      );
      const originalProperties = { ...(node.properties ?? {}) };
      delete originalProperties['data-code-group-source'];
      delete originalProperties['dataCodeGroupSource'];

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
            'data-code-group-controls': 'true',
          },
          children: [
            {
              type: 'element',
              tagName: 'div',
              properties: {
                className: ['code-group-tablist'],
              },
              children: items.map((item, index) => {
                const tab = createTabButton(item.key, item.tabLabel);
                const ids = itemIds[index];
                return {
                  ...tab,
                  properties: {
                    ...tab.properties,
                    id: ids?.tabId,
                    'data-code-group-panel-id': ids?.panelId,
                  },
                };
              }),
            },
            createGroupCopyButton(selectedCopySourceId, selectedCopyStatusId),
          ],
        },
        ...items.map((item, index) => {
          const ids = itemIds[index];
          return createPanel(
            item,
            ids?.copySourceId ?? `${groupId}-copy-source-${String(index)}`,
            ids?.panelId ?? `${groupId}-panel-${item.key}`,
            item.key === selectedKey,
            idContext,
          );
        }),
      ];
    };

    if (tree && typeof tree === 'object') {
      visit(tree as HastNode);
    }
  };
}
