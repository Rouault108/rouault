import {
  isRawNotesAbsoluteHref,
  resolveNoteSourceLink,
} from '../markdown/note-source-link-resolver.js';
import { type HastNode, type VFileLike } from './hast-utils.js';
import type { NoteSourceRoot } from '../../shared/note/note-source-root.js';

export interface RehypeResolveNoteSourceLinksOptions {
  sourceRootPaths?: Partial<Record<NoteSourceRoot, string>>;
}

const getSourcePath = (file: VFileLike | undefined): string => {
  if (typeof file?.path !== 'string' || file.path.trim().length === 0) {
    throw new Error(
      '[markdown] Markdown source file path is required to resolve note source links.',
    );
  }
  return file.path;
};

const toResolveOptions = (sourceRootPaths: Partial<Record<NoteSourceRoot, string>> | undefined) =>
  sourceRootPaths === undefined ? {} : { sourceRootPaths };

export function rehypeResolveNoteSourceLinks(options: RehypeResolveNoteSourceLinksOptions = {}) {
  return (tree: unknown, file?: VFileLike): void => {
    const sourceFilePath = getSourcePath(file);

    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const current = node as HastNode;
      if (current.type === 'element' && current.tagName === 'a') {
        const href = current.properties?.['href'];
        if (typeof href === 'string') {
          if (isRawNotesAbsoluteHref(href)) {
            throw new Error(
              `[markdown] /notes/... をMarkdown本文へ直書きできません: ${sourceFilePath} href="${href}"。source file relative .md link を使ってください。`,
            );
          }
          const resolved = resolveNoteSourceLink(
            { href, sourceFilePath },
            toResolveOptions(options.sourceRootPaths),
          );
          if (resolved.kind === 'resolved') {
            current.properties ??= {};
            current.properties['href'] = resolved.href;
          }
        }
      }

      if (!Array.isArray(current.children)) {
        return;
      }

      for (const child of current.children) {
        visit(child);
      }
    };

    visit(tree);
  };
}
