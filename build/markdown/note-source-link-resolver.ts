import { existsSync, lstatSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

import { normalizeNotePath } from '../../shared/navigation/normalize-note-path.js';
import { NOTE_SOURCE_ROOTS, type NoteSourceRoot } from '../../shared/note/note-source-root.js';

export interface ResolveNoteSourceLinkInput {
  href: string;
  sourceFilePath: string;
}

export interface ResolveNoteSourceLinkOptions {
  sourceRootPaths?: Partial<Record<NoteSourceRoot, string>>;
}

export type RawHrefKind =
  | 'hash-only'
  | 'absolute-path'
  | 'protocol-relative-url'
  | 'external-web-url'
  | 'external-action-url'
  | 'unsafe-scheme-url'
  | 'scheme-url'
  | 'relative-path';

export interface ParsedRawHref {
  originalHref: string;
  pathname: string;
  search: string;
  hash: string;
  kind: RawHrefKind;
}

export type ResolveNoteSourceLinkResult =
  | {
      kind: 'unchanged';
      href: string;
      reason:
        | 'hash-only'
        | 'absolute-path'
        | 'protocol-relative-url'
        | 'external-web-url'
        | 'external-action-url'
        | 'scheme-url'
        | 'unsafe-scheme-url'
        | 'non-markdown-path';
    }
  | {
      kind: 'resolved';
      originalHref: string;
      href: string;
      sourceFilePath: string;
      sourceFileDisplayPath: string;
      sourceRootName: NoteSourceRoot;
      sourceRootPath: string;
      targetSourceFilePath: string;
      targetSourceFileDisplayPath: string;
      requestedSlug: string;
      permalink: string;
    };

type ResolvedSourceRootPaths = Record<NoteSourceRoot, string>;

const WEB_SCHEMES = new Set(['http:', 'https:']);
const ACTION_SCHEMES = new Set(['mailto:', 'tel:']);
const UNSAFE_SCHEMES = new Set(['javascript:', 'data:', 'vbscript:']);
const SCHEME_PATTERN = /^[A-Za-z][A-Za-z\d+.-]*:/u;
const SAFE_MARKDOWN_PATH_PATTERN = /^[A-Za-z0-9._/~/-]+$/u;
const C0_CONTROL_CHARACTER_MAX = 0x1f;
const C1_CONTROL_CHARACTER_MIN = 0x7f;
const C1_CONTROL_CHARACTER_MAX = 0x9f;

const hasControlCharacter = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);

    if (
      codeUnit <= C0_CONTROL_CHARACTER_MAX ||
      (codeUnit >= C1_CONTROL_CHARACTER_MIN && codeUnit <= C1_CONTROL_CHARACTER_MAX)
    ) {
      return true;
    }
  }

  return false;
};

const toPosixPath = (value: string): string => value.replace(/\\/gu, '/');

const isInsidePath = (parent: string, child: string): boolean => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const defaultSourceRootPaths = Object.fromEntries(
  NOTE_SOURCE_ROOTS.map((sourceRoot) => [sourceRoot, path.resolve(process.cwd(), sourceRoot)]),
) as ResolvedSourceRootPaths;

const buildConfigurationError = (message: string): Error =>
  new Error(`[note-source-link] ${message}`);

const createLinkError = (
  reason: string,
  details: {
    originalHref: string;
    sourceFilePath: string;
    sourceFileDisplayPath?: string | undefined;
    sourceRootName?: NoteSourceRoot | undefined;
    sourceRootPath?: string | undefined;
    targetSourceFilePath?: string | undefined;
    targetSourceFileDisplayPath?: string | undefined;
    suggestion?: string | undefined;
  },
): Error => {
  const lines = [
    `Invalid note source link in ${details.sourceFileDisplayPath ?? details.sourceFilePath}:`,
    `  href: ${details.originalHref}`,
    `  source file path: ${details.sourceFilePath}`,
  ];

  if (details.targetSourceFileDisplayPath || details.targetSourceFilePath) {
    lines.push(
      `  resolved target: ${details.targetSourceFileDisplayPath ?? details.targetSourceFilePath}`,
    );
  }
  if (details.targetSourceFilePath) {
    lines.push(`  target file path: ${details.targetSourceFilePath}`);
  }
  if (details.sourceRootName) {
    lines.push(`  source root name: ${details.sourceRootName}`);
  }
  if (details.sourceRootPath) {
    lines.push(`  source root path: ${details.sourceRootPath}`);
  }

  lines.push('', reason);
  if (details.suggestion) {
    lines.push(details.suggestion);
  }

  return new Error(lines.join('\n'));
};

export const parseRawHref = (href: string): ParsedRawHref => {
  if (hasControlCharacter(href)) {
    throw new Error(`[markdown] href に制御文字は使用できません: ${JSON.stringify(href)}`);
  }

  const hashIndex = href.indexOf('#');
  const beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  const searchIndex = beforeHash.indexOf('?');
  const pathname = searchIndex >= 0 ? beforeHash.slice(0, searchIndex) : beforeHash;
  const search = searchIndex >= 0 ? beforeHash.slice(searchIndex) : '';

  if (pathname.length === 0 && hash.length > 0) {
    return { originalHref: href, pathname, search, hash, kind: 'hash-only' };
  }

  if (pathname.startsWith('//')) {
    return { originalHref: href, pathname, search, hash, kind: 'protocol-relative-url' };
  }

  const schemeMatch = SCHEME_PATTERN.exec(pathname);
  if (schemeMatch?.[0]) {
    const scheme = schemeMatch[0].toLowerCase();
    const kind: RawHrefKind = WEB_SCHEMES.has(scheme)
      ? 'external-web-url'
      : ACTION_SCHEMES.has(scheme)
        ? 'external-action-url'
        : UNSAFE_SCHEMES.has(scheme)
          ? 'unsafe-scheme-url'
          : 'scheme-url';
    return { originalHref: href, pathname, search, hash, kind };
  }

  if (pathname.startsWith('/')) {
    return { originalHref: href, pathname, search, hash, kind: 'absolute-path' };
  }

  return { originalHref: href, pathname, search, hash, kind: 'relative-path' };
};

export const isRawNotesAbsoluteHref = (href: string): boolean => {
  const parsed = parseRawHref(href);
  return (
    parsed.kind === 'absolute-path' &&
    (parsed.pathname === '/notes' || parsed.pathname.startsWith('/notes/'))
  );
};

const isMarkdownSourceLinkCandidate = (pathname: string): boolean =>
  pathname.endsWith('.md') ||
  pathname.endsWith('.md/') ||
  /\.(?:MD|Md|mD)$/u.test(pathname) ||
  pathname.endsWith('.markdown') ||
  pathname.includes('.md.');

const validateMarkdownSourcePathname = (parsed: ParsedRawHref, sourceFilePath: string): void => {
  const pathname = parsed.pathname;

  if (pathname.endsWith('.md/')) {
    throw createLinkError('Markdown source link must not end with ".md/".', {
      originalHref: parsed.originalHref,
      sourceFilePath,
      suggestion: 'Use a relative .md source path without trailing slash.',
    });
  }
  if (!pathname.endsWith('.md')) {
    throw createLinkError('Markdown source links must use the lowercase ".md" extension exactly.', {
      originalHref: parsed.originalHref,
      sourceFilePath,
      suggestion: 'Use a lowercase .md source file path, for example ./target.md.',
    });
  }
  if (pathname.includes('%')) {
    throw createLinkError('Percent-encoded pathname is not supported for note source links.', {
      originalHref: parsed.originalHref,
      sourceFilePath,
      suggestion: 'Use only ASCII source file path characters in the pathname.',
    });
  }
  if (pathname.includes('\\')) {
    throw createLinkError('Backslash is not allowed in note source link pathname.', {
      originalHref: parsed.originalHref,
      sourceFilePath,
      suggestion: 'Use / as the path separator.',
    });
  }
  if (!SAFE_MARKDOWN_PATH_PATTERN.test(pathname)) {
    throw createLinkError(
      'Note source link pathname may contain only ASCII letters, digits, "-", "_", ".", "/", and "~".',
      {
        originalHref: parsed.originalHref,
        sourceFilePath,
        suggestion: 'Rename the source file or link using a safe ASCII pathname.',
      },
    );
  }
};

const normalizeSourceRootPaths = (
  sourceRootPaths?: Partial<Record<NoteSourceRoot, string>>,
): ResolvedSourceRootPaths => {
  const source = sourceRootPaths === undefined ? defaultSourceRootPaths : sourceRootPaths;
  const entries = NOTE_SOURCE_ROOTS.map((sourceRoot): [NoteSourceRoot, string] => {
    const configured = source[sourceRoot];
    if (typeof configured !== 'string' || configured.trim().length === 0) {
      throw buildConfigurationError(`Missing sourceRootPaths entry for "${sourceRoot}".`);
    }
    const resolved = path.resolve(configured);
    const rootStat = lstatSync(resolved);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      throw buildConfigurationError(
        `Source root "${sourceRoot}" must be a non-symlink directory: ${resolved}`,
      );
    }
    return [sourceRoot, resolved];
  });

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const [leftName, leftPath] = entries[leftIndex] as [NoteSourceRoot, string];
      const [rightName, rightPath] = entries[rightIndex] as [NoteSourceRoot, string];
      const leftReal = realpathSync.native(leftPath);
      const rightReal = realpathSync.native(rightPath);
      if (
        leftPath === rightPath ||
        leftReal === rightReal ||
        isInsidePath(leftPath, rightPath) ||
        isInsidePath(rightPath, leftPath) ||
        isInsidePath(leftReal, rightReal) ||
        isInsidePath(rightReal, leftReal)
      ) {
        throw buildConfigurationError(
          `Source roots must be distinct non-nested directories: "${leftName}"=${leftPath}, "${rightName}"=${rightPath}`,
        );
      }
    }
  }

  return Object.fromEntries(entries) as ResolvedSourceRootPaths;
};

const assertCaseExactNonSymlinkPath = (
  filePath: string,
  rootPath: string,
  originalHref: string,
  sourceFilePath: string,
  sourceRootName: NoteSourceRoot,
  targetDisplayPath?: string,
): void => {
  const relative = path.relative(rootPath, filePath);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw createLinkError('Resolved path is outside the source root.', {
      originalHref,
      sourceFilePath,
      sourceRootName,
      sourceRootPath: rootPath,
      targetSourceFilePath: filePath,
      targetSourceFileDisplayPath: targetDisplayPath,
      suggestion: 'Keep note source links inside the same source root.',
    });
  }

  let current = rootPath;
  for (const segment of relative.split(path.sep)) {
    const names = readdirSync(current, { withFileTypes: true }).map((entry) => entry.name);
    if (!names.includes(segment)) {
      throw createLinkError('Filesystem path segment case does not match the href exactly.', {
        originalHref,
        sourceFilePath,
        sourceRootName,
        sourceRootPath: rootPath,
        targetSourceFilePath: filePath,
        targetSourceFileDisplayPath: targetDisplayPath,
        suggestion: 'Match the target file and directory names exactly, including case.',
      });
    }
    current = path.join(current, segment);
    const segmentStat = lstatSync(current);
    if (segmentStat.isSymbolicLink()) {
      throw createLinkError('Symlinks are not allowed in note source link paths.', {
        originalHref,
        sourceFilePath,
        sourceRootName,
        sourceRootPath: rootPath,
        targetSourceFilePath: filePath,
        targetSourceFileDisplayPath: targetDisplayPath,
        suggestion: 'Link to a real Markdown file inside the source root.',
      });
    }
  }
};

const assertRegularMarkdownFile = (
  filePath: string,
  rootPath: string,
  originalHref: string,
  sourceFilePath: string,
  sourceRootName: NoteSourceRoot,
  targetDisplayPath?: string,
): void => {
  if (!existsSync(filePath)) {
    throw createLinkError('The target Markdown file does not exist.', {
      originalHref,
      sourceFilePath,
      sourceRootName,
      sourceRootPath: rootPath,
      targetSourceFilePath: filePath,
      targetSourceFileDisplayPath: targetDisplayPath,
      suggestion: 'Use a source-file-relative .md link that points to an existing note source.',
    });
  }

  assertCaseExactNonSymlinkPath(
    filePath,
    rootPath,
    originalHref,
    sourceFilePath,
    sourceRootName,
    targetDisplayPath,
  );

  const targetStat = statSync(filePath);
  if (!targetStat.isFile()) {
    throw createLinkError('The target Markdown path must be a regular file.', {
      originalHref,
      sourceFilePath,
      sourceRootName,
      sourceRootPath: rootPath,
      targetSourceFilePath: filePath,
      targetSourceFileDisplayPath: targetDisplayPath,
      suggestion: 'Use a link to a real Markdown file, not a directory or special file.',
    });
  }
};

const findSourceRoot = (
  sourceFilePath: string,
  roots: ResolvedSourceRootPaths,
): { sourceRootName: NoteSourceRoot; sourceRootPath: string } => {
  const matches = NOTE_SOURCE_ROOTS.filter((sourceRoot) =>
    isInsidePath(roots[sourceRoot], sourceFilePath),
  );
  if (matches.length !== 1) {
    throw buildConfigurationError(
      `sourceFilePath must belong to exactly one source root: ${sourceFilePath}`,
    );
  }

  const sourceRootName = matches[0] as NoteSourceRoot;
  return { sourceRootName, sourceRootPath: roots[sourceRootName] };
};

const toDisplayPath = (
  sourceRootName: NoteSourceRoot,
  sourceRootPath: string,
  filePath: string,
): string => {
  const relative = toPosixPath(path.relative(sourceRootPath, filePath));
  return relative.length > 0 ? `${sourceRootName}/${relative}` : sourceRootName;
};

const toRequestedSlug = (sourceRootPath: string, targetSourceFilePath: string): string => {
  const relative = toPosixPath(path.relative(sourceRootPath, targetSourceFilePath));
  const withoutExtension = relative.replace(/\.md$/u, '');
  return withoutExtension.endsWith('/index')
    ? withoutExtension.slice(0, -'/index'.length)
    : withoutExtension;
};

export function resolveNoteSourceLink(
  input: ResolveNoteSourceLinkInput,
  options: ResolveNoteSourceLinkOptions = {},
): ResolveNoteSourceLinkResult {
  const parsed = parseRawHref(input.href);

  if (parsed.kind !== 'relative-path') {
    return { kind: 'unchanged', href: input.href, reason: parsed.kind };
  }
  if (!isMarkdownSourceLinkCandidate(parsed.pathname)) {
    return { kind: 'unchanged', href: input.href, reason: 'non-markdown-path' };
  }

  validateMarkdownSourcePathname(parsed, input.sourceFilePath);

  const sourceFilePath = path.resolve(input.sourceFilePath);
  const sourceRootPaths = normalizeSourceRootPaths(options.sourceRootPaths);
  const { sourceRootName, sourceRootPath } = findSourceRoot(sourceFilePath, sourceRootPaths);
  const sourceFileDisplayPath = toDisplayPath(sourceRootName, sourceRootPath, sourceFilePath);
  assertRegularMarkdownFile(
    sourceFilePath,
    sourceRootPath,
    input.href,
    sourceFilePath,
    sourceRootName,
    sourceFileDisplayPath,
  );

  const targetSourceFilePath = path.resolve(path.dirname(sourceFilePath), parsed.pathname);
  const targetSourceFileDisplayPath = toDisplayPath(
    sourceRootName,
    sourceRootPath,
    targetSourceFilePath,
  );
  assertRegularMarkdownFile(
    targetSourceFilePath,
    sourceRootPath,
    input.href,
    sourceFilePath,
    sourceRootName,
    targetSourceFileDisplayPath,
  );

  const requestedSlug = toRequestedSlug(sourceRootPath, targetSourceFilePath);
  const targetWithoutIndex = requestedSlug;
  const leafPath = path.join(sourceRootPath, `${targetWithoutIndex}.md`);
  const directoryIndexPath = path.join(sourceRootPath, targetWithoutIndex, 'index.md');
  const pathInfo = normalizeNotePath({
    requestedSlug,
    hasLeaf: existsSync(leafPath) && statSync(leafPath).isFile(),
    hasDirectoryIndex: existsSync(directoryIndexPath) && statSync(directoryIndexPath).isFile(),
  });
  const href = `${pathInfo.permalink}${parsed.search}${parsed.hash}`;

  return {
    kind: 'resolved',
    originalHref: input.href,
    href,
    sourceFilePath,
    sourceFileDisplayPath,
    sourceRootName,
    sourceRootPath,
    targetSourceFilePath,
    targetSourceFileDisplayPath,
    requestedSlug,
    permalink: pathInfo.permalink,
  };
}
