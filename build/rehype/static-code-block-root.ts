import { createStaticCodeCopySourceHast } from './static-code-copy-source.js';
import { createStaticCopyButtonHast } from './static-copy-button-hast.js';
import { createStaticIconHast } from './static-icon-hast.js';
import { type HastNode } from './hast-utils.js';
import { type StaticRenderIdContext } from '../../shared/static-render-id-context.js';
import { type IconName } from '../../shared/icons/icon-paths.js';

const createTextNode = (value: string): HastNode => ({
  type: 'text',
  value,
});

const createElement = (
  tagName: string,
  properties: Record<string, unknown>,
  children: HastNode[] = [],
): HastNode => ({
  type: 'element',
  tagName,
  properties,
  children,
});

const getClassList = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value.split(/\s+/u).filter((item) => item.length > 0);
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  return [];
};

const resolveLanguageLabel = (language: string): string => {
  const labels: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript',
    js: 'JavaScript',
    jsx: 'JavaScript',
    css: 'CSS',
    html: 'HTML',
    json: 'JSON',
    md: 'Markdown',
    markdown: 'Markdown',
    sh: 'Shell',
    bash: 'Bash',
    yml: 'YAML',
    yaml: 'YAML',
  };
  return labels[language] ?? language.slice(0, 1).toUpperCase() + language.slice(1);
};

const resolveStandaloneCopyButtonLabel = (
  filename: string | undefined,
  language: string,
): string => {
  const contextName = filename ?? resolveLanguageLabel(language) ?? 'コード';
  return contextName === 'コード' ? 'コードをコピー' : `${contextName} のコードをコピー`;
};

const shouldRenderCopyButton = (source: string, copyMode: string | undefined): boolean => {
  if (copyMode === 'hidden') {
    return false;
  }
  if (copyMode === 'always') {
    return true;
  }
  return source.trim().length > 0;
};

const isCopyDisabled = (source: string, copyable: string | undefined): boolean =>
  copyable === 'false' || source.trim().length === 0;

const createCodeCopySource = (
  source: string,
  idContext: StaticRenderIdContext,
): { readonly id: string; readonly statusId: string; readonly template: HastNode } => {
  const id = idContext.nextId('copy-source');
  return {
    id,
    statusId: idContext.reserveId('copy-status', `${id}-copy-status`),
    template: createStaticCodeCopySourceHast(id, source),
  };
};

const deleteIntermediateCopySource = (preNode: HastNode): void => {
  if (!preNode.properties) {
    return;
  }
  delete preNode.properties['data-code-copy-source'];
};

export interface StaticCodeBlockRootOptions {
  readonly idContext: StaticRenderIdContext;
  readonly preNode: HastNode;
  readonly source: string;
  readonly language: string;
  readonly groupOwned: boolean;
  readonly assignHydrationRoot: boolean;
  readonly renderStandaloneCopyButton: boolean;
  readonly filename?: string;
  readonly intentLabel?: string;
  readonly intentIconName?: IconName;
  readonly copyMode?: string;
  readonly copyable?: string;
}

export const createStaticCodeBlockRoot = (options: StaticCodeBlockRootOptions): HastNode => {
  const captionChildren: HastNode[] = [];
  const captionMainChildren: HastNode[] = [];
  const copySource = createCodeCopySource(options.source, options.idContext);
  const codeBlockId = options.idContext.nextId('code-block');
  deleteIntermediateCopySource(options.preNode);

  if (options.filename) {
    captionMainChildren.push(
      createElement(
        'span',
        {
          className: ['code-surface-filename'],
          title: options.filename,
        },
        [createTextNode(options.filename)],
      ),
    );
  }

  if (options.intentLabel) {
    const intentChildren: HastNode[] = [];
    if (options.intentIconName) {
      intentChildren.push(
        createStaticIconHast(options.intentIconName, {
          className: ['code-surface-intent-icon'],
        }),
      );
    }
    intentChildren.push(createTextNode(options.intentLabel));

    captionMainChildren.push(
      createElement(
        'span',
        {
          className: ['code-surface-intent'],
        },
        intentChildren,
      ),
    );
  }

  if (captionMainChildren.length > 0) {
    captionChildren.push(
      createElement(
        'div',
        {
          className: ['code-surface-caption-main'],
        },
        captionMainChildren,
      ),
    );
  }

  if (
    !options.groupOwned &&
    options.renderStandaloneCopyButton &&
    shouldRenderCopyButton(options.source, options.copyMode)
  ) {
    captionChildren.push(
      createElement(
        'div',
        {
          className: ['code-surface-copy-button-shell'],
        },
        [
          createStaticCopyButtonHast({
            targetId: copySource.id,
            statusId: copySource.statusId,
            label: resolveStandaloneCopyButtonLabel(options.filename, options.language),
            disabled: isCopyDisabled(options.source, options.copyable),
            buttonClassName: 'code-surface-copy-button',
          }),
        ],
      ),
    );
  }

  return createElement(
    'figure',
    {
      className: [
        'code-surface-root',
        ...(captionMainChildren.length === 0 ? ['code-surface-root--overlay'] : []),
      ],
      'data-code-block-root': 'true',
      'data-code-block-id': codeBlockId,
      'data-code-language': options.language,
      ...(options.filename ? { 'data-code-filename': options.filename } : {}),
      ...(options.groupOwned ? { 'data-code-group-owned': 'true' } : {}),
      ...(!options.groupOwned && options.assignHydrationRoot
        ? {
            'data-hydration-key': 'code-block-enhancer',
            'data-hydration-capability': 'progressive',
            'data-hydration-trigger': 'post-commit',
          }
        : {}),
    },
    [
      ...(captionChildren.length > 0
        ? [
            createElement(
              'div',
              {
                className: ['code-surface-caption'],
              },
              captionChildren,
            ),
          ]
        : []),
      copySource.template,
      {
        ...options.preNode,
        properties: {
          ...(options.preNode.properties ?? {}),
          className: getClassList(options.preNode.properties?.['className']),
        },
      },
    ],
  );
};
