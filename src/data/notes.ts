import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { extractTocFromHtml, type TocHeading } from '../../lib/content/extract-toc-from-html.js';
import type { NoteStatus } from '../types/article-status.js';

type SidebarScope = 'global' | 'self';
type SidebarIconSetting = string;

type NoteKind = 'leaf' | 'directory-index';

interface NormalizedNotePath {
  rawSlug: string;         // 例: "music/index"
  slug: string;            // 例: "music"
  permalink: string;       // 例: "/notes/music"
  kind: NoteKind;
  directoryPath?: string;  // directory-index のとき "music"
}

interface NoteSidebarConfig {
  scope?: SidebarScope;
  icon?: SidebarIconSetting;
}

interface NoteDirectoryConfig {
  order?: string[];
  sidebar?: NoteSidebarConfig;
}

export interface SourceNote {
  slug?: string;
  content?: string;
  status?: NoteStatus;
  genre?: string[];
  sidebarIcon?: string;
  [key: string]: unknown;
}

export interface NoteCollectionItem extends SourceNote {
  rawSlug: string;
  slug: string; // 正規化済み slug
  permalink: string;
  noteKind: 'leaf' | 'directory-index';
  directoryPath?: string;
  sortIndex: number;
  tocHeadings: TocHeading[];
  sidebarRoot?: string;
  sidebarResolvedIcon?: string;
  sidebarDirectoryIcons?: Record<string, string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSourceNote = (value: unknown): value is SourceNote => isRecord(value);

const toOptionalStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalized;
};

const toOptionalSidebarScope = (value: unknown): SidebarScope | undefined => {
  if (value === 'global' || value === 'self') {
    return value;
  }
  return undefined;
};

const toOptionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const toDirectoryConfig = (value: unknown): NoteDirectoryConfig | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const order = toOptionalStringArray(value['order']);
  const sidebarValue = value['sidebar'];
  const sidebarScope = isRecord(sidebarValue)
    ? toOptionalSidebarScope(sidebarValue['scope'])
    : undefined;
  const sidebarIcon = isRecord(sidebarValue)
    ? toOptionalTrimmedString(sidebarValue['icon'])
    : undefined;

  return {
    ...(order !== undefined ? { order } : {}),
    ...(sidebarScope !== undefined || sidebarIcon !== undefined
      ? {
        sidebar: {
          ...(sidebarScope !== undefined ? { scope: sidebarScope } : {}),
          ...(sidebarIcon !== undefined ? { icon: sidebarIcon } : {}),
        },
      }
      : {}),
  };
};

const readJsonFile = (filePath: string): unknown =>
  JSON.parse(readFileSync(filePath, 'utf-8')) as unknown;

const readConfig = (dirPath: string): NoteDirectoryConfig | undefined => {
  const configPath = join(dirPath, '_config.json');
  if (!existsSync(configPath)) {
    return undefined;
  }

  const config = readJsonFile(configPath);
  return toDirectoryConfig(config);
};

const readNotesFile = (filePath: string): SourceNote[] => {
  const parsed = readJsonFile(filePath);
  return Array.isArray(parsed) ? parsed.filter(isSourceNote) : [];
};

const normalizeNotePath = (
  inputSlug: string,
  contentRoot: string,
): NormalizedNotePath => {
  const normalized = inputSlug.trim().replace(/^\/+|\/+$/g, '');

  if (normalized.length === 0) {
    throw new Error('Empty slug is not allowed.');
  }

  if (normalized === 'index') {
    throw new Error(
      'content/index.md は未対応です。必要ならルートノート用の別仕様を定義してください。',
    );
  }

  const leafPath = join(contentRoot, `${normalized}.md`);
  const directoryIndexPath = join(contentRoot, normalized, 'index.md');

  const hasLeaf = existsSync(leafPath);
  const hasDirectoryIndex = existsSync(directoryIndexPath);

  if (hasLeaf && hasDirectoryIndex) {
    throw new Error(
      `Ambiguous note source for "${normalized}". ` +
        `Both "${normalized}.md" and "${normalized}/index.md" exist.`,
    );
  }

  if (hasDirectoryIndex) {
    return {
      rawSlug: `${normalized}/index`,
      slug: normalized,
      permalink: `/notes/${normalized}`,
      kind: 'directory-index',
      directoryPath: normalized,
    };
  }

  return {
    rawSlug: normalized,
    slug: normalized,
    permalink: `/notes/${normalized}`,
    kind: 'leaf',
  };
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

const resolveSidebarRoot = (slug: string, contentRoot: string): string | undefined => {
  const parts = slug.split('/');
  const dirParts = parts.slice(0, -1);
  let sidebarRoot: string | undefined;

  for (let depth = 0; depth <= dirParts.length; depth += 1) {
    const currentDirParts = dirParts.slice(0, depth);
    const currentDir = join(contentRoot, ...currentDirParts);
    const scope = readConfig(currentDir)?.sidebar?.scope;

    if (scope === 'global') {
      sidebarRoot = undefined;
      continue;
    }

    if (scope === 'self') {
      sidebarRoot = currentDirParts.length > 0 ? currentDirParts.join('/') : undefined;
    }
  }

  return sidebarRoot;
};

const resolveDirectorySidebarIcon = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'none') {
    return undefined;
  }

  if (value === 'folder') {
    return 'lucide:folder';
  }

  return value;
};

const resolveNoteSidebarIcon = (
  value: string | undefined,
  fallback: string | undefined,
): string | undefined => {
  if (value === undefined) {
    return fallback;
  }

  if (value === 'none') {
    return undefined;
  }

  if (value === 'file') {
    return 'lucide:file-text';
  }

  return value;
};

const resolveSidebarIconContext = (
  slug: string,
  contentRoot: string,
): { directoryIcons: Record<string, string> } => {
  const parts = slug.split('/');
  const dirParts = parts.slice(0, -1);
  const directoryIcons: Record<string, string> = {};
  let inheritedSetting = readConfig(contentRoot)?.sidebar?.icon;

  for (let depth = 0; depth < dirParts.length; depth += 1) {
    const currentDirParts = dirParts.slice(0, depth + 1);
    const currentDir = join(contentRoot, ...currentDirParts);
    const currentPath = currentDirParts.join('/');
    const configuredSetting = readConfig(currentDir)?.sidebar?.icon;

    if (configuredSetting !== undefined) {
      inheritedSetting = configuredSetting;
    }

    const resolvedIcon = resolveDirectorySidebarIcon(inheritedSetting);
    if (resolvedIcon !== undefined) {
      directoryIcons[currentPath] = resolvedIcon;
    }
  }

  return {
    directoryIcons,
  };
};

export const buildNotesCollection = (
  notes: readonly SourceNote[],
  contentRoot: string,
): NoteCollectionItem[] => {
  const enriched = notes
    .filter((note): note is SourceNote & { slug: string } => {
      return typeof note.slug === 'string' && note.slug.trim().length > 0;
    })
    .map((note) => {
      const inputSlug = note.slug.trim();
      const pathInfo = normalizeNotePath(inputSlug, contentRoot);
      const sourceSlug = pathInfo.rawSlug;

      const sidebarRoot = resolveSidebarRoot(sourceSlug, contentRoot);
      const sidebarIconSetting = toOptionalTrimmedString(note.sidebarIcon);
      const sidebarIconContext = resolveSidebarIconContext(sourceSlug, contentRoot);
      const sidebarResolvedIcon = resolveNoteSidebarIcon(sidebarIconSetting, undefined);

      return {
        ...note,
        rawSlug: sourceSlug,
        slug: pathInfo.slug,
        permalink: pathInfo.permalink,
        noteKind: pathInfo.kind,
        ...(pathInfo.directoryPath !== undefined
          ? { directoryPath: pathInfo.directoryPath }
          : {}),
        sortIndex: calculateSortIndex(sourceSlug, contentRoot),
        tocHeadings: extractTocFromHtml(typeof note.content === 'string' ? note.content : ''),
        ...(sidebarRoot !== undefined ? { sidebarRoot } : {}),
        ...(sidebarResolvedIcon !== undefined ? { sidebarResolvedIcon } : {}),
        ...(Object.keys(sidebarIconContext.directoryIcons).length > 0
          ? { sidebarDirectoryIcons: sidebarIconContext.directoryIcons }
          : {}),
      };
    });

  const routeOwners = new Map<string, string>();

  for (const note of enriched) {
    const existingOwner = routeOwners.get(note.slug);
    if (existingOwner !== undefined) {
      throw new Error(
        `Route collision detected for "${note.slug}". ` +
          `Both "${existingOwner}" and "${note.rawSlug}" resolve to "${note.permalink}".`,
      );
    }

    routeOwners.set(note.slug, note.rawSlug);
  }

  return enriched.sort((left, right) => left.sortIndex - right.sortIndex);
};

export const isPublicNote = (note: SourceNote): boolean => note.status !== 'draft';

export const filterPublicNotes = <T extends SourceNote>(notes: readonly T[]): T[] =>
  notes.filter((note) => isPublicNote(note));

export const loadNotesData = (): NoteCollectionItem[] => {
  const velitePath = join(process.cwd(), '.velite', 'notes.json');
  if (!existsSync(velitePath)) {
    return [];
  }

  const notes = readNotesFile(velitePath);
  const contentRoot = join(process.cwd(), 'content');
  const enriched = buildNotesCollection(notes, contentRoot);

  return filterPublicNotes(enriched);
};
