import { toHtml } from 'hast-util-to-html';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { remarkExpandExampleIncludes } from '../remark/expand-example-includes.js';
import { remarkDisallowRawHtml } from '../remark/disallow-raw-html.js';
import { remarkRouaultDirectives } from '../remark/rouault-directives.js';
import { remarkLinkCards } from '../remark/remark-link-cards.js';
import { createNotePolicyContext } from '../remark/directives/policy/note-policy-context.js';
import type { MdastNode } from '../remark/directives/types.js';
import { rehypeAnnotateLinkKinds } from '../rehype/annotate-link-kinds.js';
import { rehypeDisallowDangerousProps } from '../rehype/disallow-dangerous-props.js';
import { rehypeHeadingIds } from '../rehype/rehype-heading-ids.js';
import { rehypeInlineCodeTranslateNo } from '../rehype/inline-code-translate-no.js';
import { rehypeOrderedListContracts } from '../rehype/ordered-list-contracts.js';
import { rehypePreviewSandbox } from '../rehype/preview-sandbox.js';
import { rehypeResolveNoteSourceLinks } from '../rehype/resolve-note-source-links.js';
import {
  normalizeRouaultStaticSurfaceHtml,
  rehypeRouaultComponents,
} from '../rehype/rouault-components.js';
import { rehypeShikiCodeBlocks } from '../rehype/shiki-code-blocks.js';
import { rehypeStaticCodeGroups } from '../rehype/static-code-groups.js';
import {
  resolveNotePreviewProfile,
  validateNoteContentContracts,
} from './note-content-contracts.js';
import { annotateGeneratedPageHtmlLinkContracts } from './page-html-link-contracts.js';
import { resolveEffectiveNoteChromeProfile } from '../../shared/note/note-chrome-profile.js';
import {
  collectNoteSourceLinksFromTree,
  type CollectedMarkdownUrl,
} from './validate-note-source-links.js';
import type { ContentInput } from './content-input.js';
import type { ContentDocumentContext } from './content-build-context.js';
import type { NoteMetadata, CompiledNote } from './content-schema.js';
import type { SourceMemo } from '../data/memos.js';

// コメントだけを除去する。コメントと混在した生HTMLまで消して検査を迂回させない。
export const remarkRemovePureComments =
  () =>
  (tree: unknown): void => {
    const visit = (node: MdastNode): void => {
      if (!node.children) return;
      node.children = node.children.filter(
        (child) =>
          !(
            child.type === 'html' &&
            typeof child.value === 'string' &&
            child.value.replace(/<!--[\s\S]*?-->/gu, '').trim().length === 0
          ),
      );
      node.children.forEach(visit);
    };
    visit(tree as MdastNode);
  };

const rehypeCodeMeta =
  () =>
  (tree: unknown): void => {
    const visit = (node: {
      tagName?: string;
      data?: { meta?: string };
      properties?: Record<string, unknown>;
      children?: unknown[];
    }): void => {
      if (node.tagName === 'code' && node.data?.meta) {
        node.properties ??= {};
        node.properties['metastring'] = node.data.meta;
      }
      node.children?.forEach((child) => visit(child as Parameters<typeof visit>[0]));
    };
    visit(tree as Parameters<typeof visit>[0]);
  };

export const compileContentInput = async (
  input: ContentInput,
  context: ContentDocumentContext,
): Promise<{ note?: CompiledNote; memo?: SourceMemo; links: CollectedMarkdownUrl[] }> => {
  const metadata = input.metadata as NoteMetadata;
  const isNote = input.identity.collectionId === 'notes';
  const kind = isNote ? (metadata.kind ?? 'reader') : 'reader';
  const policy = createNotePolicyContext(kind, isNote ? metadata.testingArea : undefined, context);
  const links: CollectedMarkdownUrl[] = [];
  const remarkCollectSourceLinks =
    () =>
    (tree: unknown): void => {
      links.push(
        ...collectNoteSourceLinksFromTree(tree as MdastNode, {
          sourceFilePath: input.sourceFilePath,
          sourceFileDisplayPath: input.sourceLabel,
          bodyStartLine: input.bodyStartLine,
        }),
      );
    };
  const processor = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkExpandExampleIncludes)
    .use(remarkRemovePureComments)
    .use(remarkDisallowRawHtml)
    .use(remarkRouaultDirectives)
    .use(remarkCollectSourceLinks)
    .use(remarkLinkCards)
    .use(remarkRehype)
    .use(rehypeCodeMeta)
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypeRouaultComponents)
    .use(rehypeHeadingIds)
    .use(rehypePreviewSandbox)
    .use(rehypeShikiCodeBlocks)
    .use(rehypeStaticCodeGroups)
    .use(rehypeResolveNoteSourceLinks)
    .use(rehypeAnnotateLinkKinds, context)
    .use(rehypeInlineCodeTranslateNo)
    .use(rehypeOrderedListContracts)
    .use(rehypeDisallowDangerousProps);
  const file = {
    path: input.sourceFilePath,
    value: input.body,
    data: { rouaultPolicyContext: policy, rouaultContentContext: context },
  };
  const tree = await processor.run(processor.parse(file), file);
  // indexのnamespaceは既存JSONと同様に末尾/indexを除く。
  const namespace = input.sourceLabel.replace(/\.md$/u, '').replace(/\/index$/u, '');
  const staticHtml = normalizeRouaultStaticSurfaceHtml(
    toHtml(tree as Parameters<typeof toHtml>[0]),
    {
      namespace: isNote ? namespace : `${namespace}.md`,
      previewProfile: resolveNotePreviewProfile(kind),
      documentUrl: context.currentUrl,
    },
  );
  const content =
    annotateGeneratedPageHtmlLinkContracts({
      html: staticHtml,
      sourceLabel: namespace,
      sourceFilePath: input.sourceFilePath,
      ...context,
    }) ?? '';
  if (!isNote) {
    return {
      memo: {
        title: metadata.title,
        sourcePath: `${namespace}.md`,
        license: 'CC BY 4.0',
        ...(metadata.date ? { date: metadata.date } : {}),
        ...(metadata.updated ? { updated: metadata.updated } : {}),
        content,
      },
      links,
    };
  }
  validateNoteContentContracts({
    kind,
    html: content,
    sourceLabel: namespace,
    ...(metadata.testingArea !== undefined ? { testingArea: metadata.testingArea } : {}),
    ...context,
  });
  const { excludeFromPublicationSurfaces, e2eFixtureId, ...rest } = metadata;
  return {
    note: {
      ...rest,
      slug: input.identity.sourceRelativePath.replace(/\.md$/u, '').replace(/\/index$/u, ''),
      sourceRoot:
        input.sourceRoot as import('../../shared/note/note-source-root.js').NoteSourceRoot,
      content,
      kind,
      chromeProfile: resolveEffectiveNoteChromeProfile(kind, metadata.chromeProfile),
      ...(excludeFromPublicationSurfaces === true ? { excludeFromPublicationSurfaces: true } : {}),
      ...(e2eFixtureId?.trim() ? { e2eFixtureId: e2eFixtureId.trim() } : {}),
      status: metadata.status ?? '',
    },
    links,
  };
};
