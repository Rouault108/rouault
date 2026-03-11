import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { extractTocFromHtml, type TocHeading } from '../../lib/content/extract-toc-from-html.js';

interface NoteOrderConfig {
  order?: string[];
}

export interface SourceNote {
  slug?: string;
  content?: string;
  draft?: boolean;
  genre?: string[];
  [key: string]: unknown;
}

export interface NoteCollectionItem extends SourceNote {
  slug: string;
  sortIndex: number;
  tocHeadings: TocHeading[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSourceNote = (value: unknown): value is SourceNote => isRecord(value);

const readJsonFile = (filePath: string): unknown =>
  JSON.parse(readFileSync(filePath, 'utf-8')) as unknown;

const readConfig = (dirPath: string): NoteOrderConfig | undefined => {
  const configPath = join(dirPath, '_config.json');
  if (!existsSync(configPath)) {
    return undefined;
  }

  const config = readJsonFile(configPath);
  return isRecord(config) ? (config as NoteOrderConfig) : undefined;
};

const readNotesFile = (filePath: string): SourceNote[] => {
  const parsed = readJsonFile(filePath);
  return Array.isArray(parsed) ? parsed.filter(isSourceNote) : [];
};

const calculateSortIndex = (slug: string, contentRoot: string): number => {
  const parts = slug.split('/');
  const fileName = `${parts[parts.length - 1] ?? ''}.md`;
  const dirParts = parts.slice(0, -1);
  let sortIndex = 0;

  for (let depth = 0; depth <= dirParts.length; depth += 1) {
    const currentDirParts = dirParts.slice(0, depth);
    const currentDir = join(contentRoot, ...currentDirParts);
    const config = readConfig(currentDir);
    const targetName = depth < dirParts.length ? dirParts[depth] : fileName;
    const order = config?.order ?? [];
    const orderIndex = typeof targetName === 'string' ? order.indexOf(targetName) : -1;

    sortIndex = orderIndex >= 0 ? sortIndex * 1000 + orderIndex : sortIndex * 1000 + 500;
  }

  return sortIndex;
};

export const buildNotesCollection = (
  notes: readonly SourceNote[],
  contentRoot: string,
): NoteCollectionItem[] => {
  return notes
    .filter((note): note is SourceNote & { slug: string } => {
      return typeof note.slug === 'string' && note.slug.trim().length > 0;
    })
    .map((note) => {
      const slug = note.slug.trim();
      return {
        ...note,
        slug,
        sortIndex: calculateSortIndex(slug, contentRoot),
        tocHeadings: extractTocFromHtml(typeof note.content === 'string' ? note.content : ''),
      };
    })
    .sort((left, right) => left.sortIndex - right.sortIndex);
};

export const loadNotesData = (): NoteCollectionItem[] => {
  const velitePath = join(process.cwd(), '.velite', 'notes.json');
  if (!existsSync(velitePath)) {
    return [];
  }

  const notes = readNotesFile(velitePath);
  const contentRoot = join(process.cwd(), 'content');
  const enriched = buildNotesCollection(notes, contentRoot);
  const isProduction = process.env['NODE_ENV'] === 'production';

  return isProduction ? enriched.filter((note) => note.draft !== true) : enriched;
};
