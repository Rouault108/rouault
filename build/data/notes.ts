import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  normalizeNotePath,
  type SidebarScope,
  type SidebarScopeRule,
} from '../../build/navigation/index.js';
import type { NavigationDirectoryPresentationMap } from '../../shared/navigation/navigation-types.js';
import { resolveSidebarRoot } from '../../build/navigation/resolve-sidebar-root.js';
import { prepareTocHtml, type TocHeading } from '../../build/content/extract-toc-from-html.js';
import { validateNoteContentContracts } from '../../build/content/note-content-contracts.js';
import { resolveCoverAsset, type ResolvedImageAsset } from '../../build/media/image-resolver.js';
import { isIconName, type IconName } from '../../shared/icons/icons-catalog.js';
import type { NoteStatus } from '../../src/types/article-status.js';
import {
  type NoteContentKind,
  isReaderFacingNoteContentKind,
  normalizeNoteContentKind,
} from '../../shared/note/note-kind.js';
import {
  resolveEffectiveNoteChromeProfile,
  type NoteChromeProfile,
} from '../../shared/note/note-chrome-profile.js';
import {
  type NoteChromePolicy,
  resolveNoteChromePolicy,
} from '../../shared/note/note-chrome-policy.js';
import {
  type NotePublicationPolicy,
  resolveEffectiveNotePublicationPolicy,
} from '../../shared/note/note-publication-policy.js';
import { type TestingArea, normalizeTestingArea } from '../../shared/note/testing-area.js';
import type { NoteHydrationBudgetProfileName } from '../../src/types/note-hydration-budget-profile.js';
import {
  normalizeNoteSourceRoot,
  type NoteSourceRoot,
} from '../../shared/note/note-source-root.js';
import { hasDynamicTocScopeSelections } from '../../src/toc/toc-headings.js';

type SidebarIconSetting = IconName | 'none';

interface NoteSidebarConfig {
  scope?: SidebarScope;
  icon?: SidebarIconSetting;
}

interface NoteDirectoryConfig {
  label?: string;
  order?: string[];
  sidebar?: NoteSidebarConfig;
}

interface BuildNotesCollectionOptions {
  sourceRoots?: Partial<Record<NoteSourceRoot, string>>;
}

export interface SourceNote {
  slug?: string;
  title?: string;
  content?: string;
  description?: string;
  date?: string;
  created?: string;
  updated?: string;
  source?: string;
  license?: string;
  status?: NoteStatus;
  kind?: NoteContentKind;
  chromeProfile?: NoteChromeProfile;
  testingArea?: TestingArea;
  hydrationBudgetProfile?: NoteHydrationBudgetProfileName;
  sourceRoot?: NoteSourceRoot;
  e2eFixtureId?: string;
  excludeFromPublicationSurfaces?: boolean;
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
    mobilePanel: boolean;
  };
  sidebarRoot?: string;
  sidebarResolvedIcon?: IconName;
  navigationDirectoryPresentation?: NavigationDirectoryPresentationMap;
  resolvedCover?: ResolvedImageAsset;
  kind: NoteContentKind;
  chromeProfile?: NoteChromeProfile;
  testingArea?: TestingArea;
  hydrationBudgetProfile?: NoteHydrationBudgetProfileName;
  sourceRoot?: NoteSourceRoot;
  e2eFixtureId?: string;
}

export type IntrinsicNotesCollection = IntrinsicNote[];

const inferTocCapabilities = (
  headings: readonly TocHeading[],
  chromePolicy: NoteChromePolicy,
): IntrinsicNote['tocCapabilities'] => ({
  activeTracking: headings.length > 0,
  dynamicScopes: hasDynamicTocScopeSelections(headings),
  mobilePanel: chromePolicy.tocMobilePanel && headings.length > 0,
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

const toOptionalLabel = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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
  const label = toOptionalLabel(value['label']);
  const sidebarValue = value['sidebar'];
  const sidebarScope = isRecord(sidebarValue)
    ? toOptionalSidebarScope(sidebarValue['scope'])
    : undefined;
  const sidebarIcon = isRecord(sidebarValue)
    ? toOptionalSidebarIconSetting(sidebarValue['icon'])
    : undefined;

  return {
    ...(label !== undefined ? { label } : {}),
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
  options: BuildNotesCollectionOptions = {},
): IntrinsicNotesCollection => {
  const configCache = new Map<string, NoteDirectoryConfig | null>();
  const fileExistenceCache = new Map<string, boolean>();
  const sourceRoots = options.sourceRoots ?? {};

  const resolveSourceRootPath = (note: SourceNote): string => {
    const normalizedSourceRoot = normalizeNoteSourceRoot(note.sourceRoot);

    if (normalizedSourceRoot === undefined || normalizedSourceRoot === 'content') {
      return sourceRoots['content'] ?? contentRoot;
    }

    return sourceRoots[normalizedSourceRoot] ?? join(process.cwd(), normalizedSourceRoot);
  };

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

  const calculateCachedSortIndex = (slug: string, sourceRootPath: string): number => {
    const parts = slug.split('/');
    const fileName = `${parts[parts.length - 1] ?? ''}.md`;
    const dirParts = parts.slice(0, -1);
    let sortIndex = 0;

    for (let depth = 0; depth <= dirParts.length; depth += 1) {
      const currentDirParts = dirParts.slice(0, depth);
      const currentDir = join(sourceRootPath, ...currentDirParts);
      const config = readCachedConfig(currentDir);
      const targetName = depth < dirParts.length ? dirParts[depth] : fileName;
      const order = config?.order ?? [];
      const orderIndex = typeof targetName === 'string' ? order.indexOf(targetName) : -1;

      sortIndex = orderIndex >= 0 ? sortIndex * 1000 + orderIndex : sortIndex * 1000 + 500;
    }

    return sortIndex;
  };

  const collectCachedSidebarScopeRules = (
    slug: string,
    sourceRootPath: string,
  ): SidebarScopeRule[] => {
    const parts = slug.split('/');
    const dirParts = parts.slice(0, -1);
    const rules: SidebarScopeRule[] = [];

    for (let depth = 0; depth <= dirParts.length; depth += 1) {
      const currentDirParts = dirParts.slice(0, depth);
      const currentDir = join(sourceRootPath, ...currentDirParts);
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

  const resolveCachedDirectoryPresentationContext = (
    slug: string,
    sourceRootPath: string,
  ): { presentation: NavigationDirectoryPresentationMap } => {
    const parts = slug.split('/');
    const dirParts = parts.slice(0, -1);
    const presentation: NavigationDirectoryPresentationMap = {};
    let inheritedSetting: SidebarIconSetting | undefined =
      readCachedConfig(sourceRootPath)?.sidebar?.icon;

    for (let depth = 0; depth < dirParts.length; depth += 1) {
      const currentDirParts = dirParts.slice(0, depth + 1);
      const currentDir = join(sourceRootPath, ...currentDirParts);
      const currentPath = currentDirParts.join('/');
      const config = readCachedConfig(currentDir);
      const configuredSetting = config?.sidebar?.icon;

      if (configuredSetting !== undefined) {
        inheritedSetting = configuredSetting;
      }

      const resolvedIcon = resolveDirectorySidebarIcon(inheritedSetting);
      if (config?.label !== undefined || resolvedIcon !== undefined) {
        presentation[currentPath] = {
          ...(config?.label !== undefined ? { label: config.label } : {}),
          ...(resolvedIcon !== undefined ? { icon: resolvedIcon } : {}),
        };
      }
    }

    return { presentation };
  };

  const enriched = notes
    .filter((note): note is SourceNote & { slug: string } => {
      return typeof note.slug === 'string' && note.slug.trim().length > 0;
    })
    .map((note): IntrinsicNote => {
      const inputSlug = note.slug.trim();
      const normalizedSlug = inputSlug.replace(/^\/+|\/+$/gu, '');
      const sourceRootPath = resolveSourceRootPath(note);
      const pathInfo = normalizeNotePath({
        requestedSlug: inputSlug,
        hasLeaf: hasFile(join(sourceRootPath, `${normalizedSlug}.md`)),
        hasDirectoryIndex: hasFile(join(sourceRootPath, normalizedSlug, 'index.md')),
      });
      const sourceSlug = pathInfo.rawSlug;
      const kind = normalizeNoteContentKind(note.kind);
      const chromeProfile = resolveEffectiveNoteChromeProfile(kind, note.chromeProfile);
      const testingArea = normalizeTestingArea(note.testingArea);
      const noteWithoutVeliteToc: SourceNote = { ...note };
      delete noteWithoutVeliteToc['toc'];

      const preparedToc = prepareTocHtml(typeof note.content === 'string' ? note.content : '');
      validateNoteContentContracts(
        kind,
        preparedToc.html,
        `${sourceSlug}:post-prepare-toc`,
        testingArea,
      );
      const e2eFixtureId =
        typeof note.e2eFixtureId === 'string' && note.e2eFixtureId.trim().length > 0
          ? note.e2eFixtureId.trim()
          : undefined;

      const sidebarRoot = resolveSidebarRoot(
        collectCachedSidebarScopeRules(sourceSlug, sourceRootPath),
      );
      const sidebarIconSetting = note.sidebarIcon;
      const directoryPresentation = resolveCachedDirectoryPresentationContext(
        sourceSlug,
        sourceRootPath,
      );

      const inheritedDirectoryIcon = (() => {
        const entries = Object.values(directoryPresentation.presentation);
        for (let index = entries.length - 1; index >= 0; index -= 1) {
          const icon = entries[index]?.icon;
          if (icon !== undefined) {
            return icon;
          }
        }
        return undefined;
      })();

      const sidebarResolvedIcon = resolveNoteSidebarIcon(
        sidebarIconSetting,
        inheritedDirectoryIcon,
      );

      const chromePolicy = resolveNoteChromePolicy(chromeProfile);

      return {
        ...noteWithoutVeliteToc,
        ...(typeof note.content === 'string' ? { content: preparedToc.html } : {}),
        kind,
        chromeProfile,
        ...(testingArea !== undefined ? { testingArea } : {}),
        ...(e2eFixtureId !== undefined ? { e2eFixtureId } : {}),
        rawSlug: sourceSlug,
        slug: pathInfo.slug,
        permalink: pathInfo.permalink,
        noteKind: pathInfo.kind,
        ...(pathInfo.directoryPath !== undefined ? { directoryPath: pathInfo.directoryPath } : {}),
        sortIndex: calculateCachedSortIndex(sourceSlug, sourceRootPath),
        tocHeadings: preparedToc.headings,
        tocCapabilities: inferTocCapabilities(preparedToc.headings, chromePolicy),
        ...(sidebarRoot !== undefined ? { sidebarRoot } : {}),
        ...(sidebarResolvedIcon !== undefined ? { sidebarResolvedIcon } : {}),
        ...(Object.keys(directoryPresentation.presentation).length > 0
          ? { navigationDirectoryPresentation: directoryPresentation.presentation }
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
  surface: keyof NotePublicationPolicy,
): boolean => isPublicNote(note) && resolveEffectiveNotePublicationPolicy(note)[surface];

export const filterNotesBySurface = <T extends SourceNote>(
  notes: readonly T[],
  surface: keyof NotePublicationPolicy,
): T[] => notes.filter((note) => isNoteVisibleInSurface(note, surface));

export const loadNotesData = (): IntrinsicNotesCollection => {
  const velitePath = join(process.cwd(), '.velite', 'notes.json');
  if (!existsSync(velitePath)) {
    return [];
  }

  const notes = readNotesFile(velitePath);
  const contentRoot = join(process.cwd(), 'content');
  const enriched = buildNotesCollection(notes, contentRoot, {
    sourceRoots: {
      content: contentRoot,
      'test/fixtures/content': join(process.cwd(), 'test/fixtures/content'),
    },
  });

  return filterPublicNotes(enriched);
};
