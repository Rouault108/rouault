import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  normalizeNotePath,
  type SidebarScope,
  type SidebarScopeRule,
} from '../../build/navigation/index.js';
import { resolveSidebarRoot } from '../../build/navigation/resolve-sidebar-root.js';
import { prepareTocHtml, type TocHeading } from '../../build/content/extract-toc-from-html.js';
import { resolveCoverAsset, type ResolvedImageAsset } from '../../build/media/image-resolver.js';
import { isIconName, type IconName } from '../../shared/icons/icons-catalog.js';
import type { NoteStatus } from '../../src/types/article-status.js';
import {
  type NoteContentKind,
  isReaderFacingNoteContentKind,
  normalizeNoteContentKind,
} from '../../shared/note/note-kind.js';
import {
  type NoteSurfacePolicy,
  resolveNoteSurfacePolicy,
} from '../../shared/note/note-surface-policy.js';
import { type TestingArea, normalizeTestingArea } from '../../shared/note/testing-area.js';
import type { NoteHydrationBudgetProfileName } from '../../src/types/note-hydration-budget-profile.js';

type SidebarIconSetting = IconName | 'none';

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
  title?: string;
  content?: string;
  description?: string;
  date?: string;
  updated?: string;
  source?: string;
  license?: string;
  status?: NoteStatus;
  kind?: NoteContentKind;
  testingArea?: TestingArea;
  hydrationBudgetProfile?: NoteHydrationBudgetProfileName;
  genre?: string[];
  sidebarIcon?: SidebarIconSetting;
  [key: string]: unknown;
}

export interface IntrinsicNote extends SourceNote {
  rawSlug: string;
  slug: string; // 正規化済み slug
  permalink: string;
  noteKind: 'leaf' | 'directory-index';
  directoryPath?: string;
  sortIndex: number;
  tocHeadings: TocHeading[];
  tocCapabilities: {
    activeTracking: boolean;
    dynamicScopes: boolean;
    mobileSummary: boolean;
  };
  sidebarRoot?: string;
  sidebarResolvedIcon?: IconName;
  sidebarDirectoryIcons?: Record<string, IconName>;
  resolvedCover?: ResolvedImageAsset;
  kind: NoteContentKind;
  testingArea?: TestingArea;
  hydrationBudgetProfile?: NoteHydrationBudgetProfileName;
}

export type IntrinsicNotesCollection = IntrinsicNote[];

const inferTocCapabilities = (
  headings: readonly TocHeading[],
  kind: NoteContentKind,
): IntrinsicNote['tocCapabilities'] => ({
  activeTracking: headings.length > 0,
  dynamicScopes: headings.some(
    (heading) => Array.isArray(heading.scopeSelections) && heading.scopeSelections.length > 0,
  ),
  mobileSummary: kind === 'reader' && headings.length > 0,
});

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

const toOptionalSidebarIconSetting = (value: unknown): SidebarIconSetting | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  if (normalized === 'none') {
    return 'none';
  }

  if (normalized.startsWith('lucide:')) {
    throw new Error(
      `Invalid sidebar icon "${normalized}". Do not use the "lucide:" prefix. Use a bare IconName such as "file-text".`,
    );
  }

  if (isIconName(normalized)) {
    return normalized;
  }

  throw new Error(
    `Invalid sidebar icon "${normalized}". Use a bare IconName from src/icons/catalog.ts or "none".`,
  );
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
    ? toOptionalSidebarIconSetting(sidebarValue['icon'])
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

const resolveDirectorySidebarIcon = (
  value: SidebarIconSetting | undefined,
): IconName | undefined => {
  if (value === undefined || value === 'none') {
    return undefined;
  }

  return value;
};

const resolveNoteSidebarIcon = (
  value: SidebarIconSetting | undefined,
  fallback: IconName | undefined,
): IconName | undefined => {
  if (value === undefined) {
    return fallback;
  }

  if (value === 'none') {
    return undefined;
  }

  return value;
};

export const buildNotesCollection = (
  notes: readonly SourceNote[],
  contentRoot: string,
): IntrinsicNotesCollection => {
  const configCache = new Map<string, NoteDirectoryConfig | null>();
  const fileExistenceCache = new Map<string, boolean>();

  // 同一投影中に同じディレクトリ設定を繰り返し参照するため、同期 I/O を局所的にメモ化する。
  const readCachedConfig = (dirPath: string): NoteDirectoryConfig | undefined => {
    const cached = configCache.get(dirPath);
    if (cached !== undefined) {
      return cached === null ? undefined : cached;
    }

    const loaded = readConfig(dirPath);
    configCache.set(dirPath, loaded ?? null);
    return loaded;
  };

  // slug 正規化や sidebar 解決で同じパスの存在確認を繰り返すため、投影中だけ共有する。
  const hasFile = (filePath: string): boolean => {
    const cached = fileExistenceCache.get(filePath);
    if (cached !== undefined) {
      return cached;
    }

    const exists = existsSync(filePath);
    fileExistenceCache.set(filePath, exists);
    return exists;
  };

  const calculateCachedSortIndex = (slug: string): number => {
    const parts = slug.split('/');
    const fileName = `${parts[parts.length - 1] ?? ''}.md`;
    const dirParts = parts.slice(0, -1);
    let sortIndex = 0;

    for (let depth = 0; depth <= dirParts.length; depth += 1) {
      const currentDirParts = dirParts.slice(0, depth);
      const currentDir = join(contentRoot, ...currentDirParts);
      const config = readCachedConfig(currentDir);
      const targetName = depth < dirParts.length ? dirParts[depth] : fileName;
      const order = config?.order ?? [];
      const orderIndex = typeof targetName === 'string' ? order.indexOf(targetName) : -1;

      sortIndex = orderIndex >= 0 ? sortIndex * 1000 + orderIndex : sortIndex * 1000 + 500;
    }

    return sortIndex;
  };

  const collectCachedSidebarScopeRules = (slug: string): SidebarScopeRule[] => {
    const parts = slug.split('/');
    const dirParts = parts.slice(0, -1);
    const rules: SidebarScopeRule[] = [];

    for (let depth = 0; depth <= dirParts.length; depth += 1) {
      const currentDirParts = dirParts.slice(0, depth);
      const currentDir = join(contentRoot, ...currentDirParts);
      const scope = readCachedConfig(currentDir)?.sidebar?.scope;

      if (scope === 'global' || scope === 'self') {
        rules.push({
          directoryPath: currentDirParts.join('/'),
          scope: scope as SidebarScope,
        });
      }
    }

    return rules;
  };

  const resolveCachedSidebarIconContext = (
    slug: string,
  ): { directoryIcons: Record<string, IconName> } => {
    const parts = slug.split('/');
    const dirParts = parts.slice(0, -1);
    const directoryIcons: Record<string, IconName> = {};
    let inheritedSetting: SidebarIconSetting | undefined =
      readCachedConfig(contentRoot)?.sidebar?.icon;

    for (let depth = 0; depth < dirParts.length; depth += 1) {
      const currentDirParts = dirParts.slice(0, depth + 1);
      const currentDir = join(contentRoot, ...currentDirParts);
      const currentPath = currentDirParts.join('/');
      const configuredSetting = readCachedConfig(currentDir)?.sidebar?.icon;

      if (configuredSetting !== undefined) {
        inheritedSetting = configuredSetting;
      }

      const resolvedIcon = resolveDirectorySidebarIcon(inheritedSetting);
      if (resolvedIcon !== undefined) {
        directoryIcons[currentPath] = resolvedIcon;
      }
    }

    return { directoryIcons };
  };

  const enriched = notes
    .filter((note): note is SourceNote & { slug: string } => {
      return typeof note.slug === 'string' && note.slug.trim().length > 0;
    })
    .map((note): IntrinsicNote => {
      const inputSlug = note.slug.trim();
      const normalizedSlug = inputSlug.replace(/^\/+|\/+$/gu, '');
      const pathInfo = normalizeNotePath({
        requestedSlug: inputSlug,
        hasLeaf: hasFile(join(contentRoot, `${normalizedSlug}.md`)),
        hasDirectoryIndex: hasFile(join(contentRoot, normalizedSlug, 'index.md')),
      });
      const sourceSlug = pathInfo.rawSlug;
      const kind = normalizeNoteContentKind(note.kind);
      const testingArea = normalizeTestingArea(note.testingArea);
      const preparedToc = prepareTocHtml(typeof note.content === 'string' ? note.content : '');

      const sidebarRoot = resolveSidebarRoot(collectCachedSidebarScopeRules(sourceSlug));
      const sidebarIconSetting = note.sidebarIcon;
      const sidebarIconContext = resolveCachedSidebarIconContext(sourceSlug);

      const inheritedDirectoryIcon = (() => {
        const values = Object.values(sidebarIconContext.directoryIcons);
        return values.length > 0 ? values[values.length - 1] : undefined;
      })();

      const sidebarResolvedIcon = resolveNoteSidebarIcon(
        sidebarIconSetting,
        inheritedDirectoryIcon,
      );

      return {
        ...note,
        ...(typeof note.content === 'string' ? { content: preparedToc.html } : {}),
        kind,
        ...(testingArea !== undefined ? { testingArea } : {}),
        rawSlug: sourceSlug,
        slug: pathInfo.slug,
        permalink: pathInfo.permalink,
        noteKind: pathInfo.kind,
        ...(pathInfo.directoryPath !== undefined ? { directoryPath: pathInfo.directoryPath } : {}),
        sortIndex: calculateCachedSortIndex(sourceSlug),
        tocHeadings: preparedToc.headings,
        tocCapabilities: inferTocCapabilities(preparedToc.headings, kind),
        ...(sidebarRoot !== undefined ? { sidebarRoot } : {}),
        ...(sidebarResolvedIcon !== undefined ? { sidebarResolvedIcon } : {}),
        ...(Object.keys(sidebarIconContext.directoryIcons).length > 0
          ? { sidebarDirectoryIcons: sidebarIconContext.directoryIcons }
          : {}),
        ...(typeof note['cover'] === 'string' && note['cover'].trim().length > 0
          ? { resolvedCover: resolveCoverAsset(note['cover']) }
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

export const isReaderFacingNote = (note: SourceNote): boolean =>
  isPublicNote(note) && isReaderFacingNoteContentKind(note.kind);

export const filterReaderFacingNotes = <T extends SourceNote>(notes: readonly T[]): T[] =>
  notes.filter((note) => isReaderFacingNote(note));

export const isNoteVisibleInSurface = (
  note: SourceNote,
  surface: keyof NoteSurfacePolicy,
): boolean => isPublicNote(note) && resolveNoteSurfacePolicy(note.kind)[surface];

export const filterNotesBySurface = <T extends SourceNote>(
  notes: readonly T[],
  surface: keyof NoteSurfacePolicy,
): T[] => notes.filter((note) => isNoteVisibleInSurface(note, surface));

export const loadNotesData = (): IntrinsicNotesCollection => {
  const velitePath = join(process.cwd(), '.velite', 'notes.json');
  if (!existsSync(velitePath)) {
    return [];
  }

  const notes = readNotesFile(velitePath);
  const contentRoot = join(process.cwd(), 'content');
  const enriched = buildNotesCollection(notes, contentRoot);

  return filterPublicNotes(enriched);
};
