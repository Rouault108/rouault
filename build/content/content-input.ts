import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { JSON_SCHEMA, load } from 'js-yaml';
import { contentCollections, getAdoptedContentRoots } from './content-collections.js';
import type { ContentIdentity } from './content-record.js';
import { stripYamlFrontmatter } from './validate-note-source-links.js';
import { validateContentMetadata, type NoteMetadata, type MemoMetadata } from './content-schema.js';

export interface ContentInput {
  readonly identity: ContentIdentity;
  readonly sourceRoot: string;
  readonly sourceFilePath: string;
  readonly sourceLabel: string;
  readonly body: string;
  readonly bodyStartLine: number;
  readonly metadata: NoteMetadata | MemoMetadata;
}

export const readContentInputs = (): ContentInput[] => {
  const inputs: ContentInput[] = [];
  for (const collection of contentCollections) {
    for (const sourceRoot of getAdoptedContentRoots(collection.id)) {
      const root = path.resolve(sourceRoot);
      const walk = (directory: string): void => {
        let entries;
        try {
          entries = readdirSync(directory, { withFileTypes: true });
        } catch (error) {
          if (directory === root && (error as NodeJS.ErrnoException).code === 'ENOENT') return;
          throw error;
        }
        if (lstatSync(directory).isSymbolicLink())
          throw new Error('[content] symlink is forbidden');
        for (const entry of entries) {
          const sourceFilePath = path.join(directory, entry.name);
          if (entry.isSymbolicLink()) throw new Error('[content] symlink is forbidden');
          if (entry.isDirectory()) walk(sourceFilePath);
          else if (entry.isFile() && entry.name.endsWith('.md')) {
            const sourceRelativePath = path
              .relative(root, sourceFilePath)
              .split(path.sep)
              .join('/');
            const sourceLabel = `${sourceRoot}/${sourceRelativePath}`;
            const stripped = stripYamlFrontmatter(readFileSync(sourceFilePath, 'utf8'));
            const metadata = validateContentMetadata(
              stripped.frontmatter === null
                ? {}
                : load(stripped.frontmatter, { schema: JSON_SCHEMA }),
              collection.id,
              sourceLabel,
            );
            if (stripped.body.length === 0) throw new Error(`[content] empty body: ${sourceLabel}`);
            inputs.push({
              identity: { collectionId: collection.id, sourceRelativePath },
              sourceRoot,
              sourceFilePath,
              sourceLabel,
              body: stripped.body,
              bodyStartLine: stripped.bodyStartLine,
              metadata,
            });
          }
        }
      };
      walk(root);
    }
  }
  return inputs.sort((a, b) => a.sourceLabel.localeCompare(b.sourceLabel, 'en'));
};
