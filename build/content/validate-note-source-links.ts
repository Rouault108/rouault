import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { loadNotesData, type IntrinsicNote } from '../data/notes.js';
import {
  isRawNotesAbsoluteHref,
  parseRawHref,
  resolveNoteSourceLink,
} from '../markdown/note-source-link-resolver.js';
import { remarkDisallowRawHtml } from '../remark/disallow-raw-html.js';
import { remarkExpandExampleIncludes } from '../remark/expand-example-includes.js';
import { remarkRouaultDirectives } from '../remark/rouault-directives.js';
import {
  getDirectiveUrlAttributePolicy,
  type DirectiveUrlPolicyName,
} from '../remark/directives/grammar/url-attribute-policies.js';
import type { DirectiveName, MdastNode } from '../remark/directives/types.js';
import { createNotePolicyContext } from '../remark/directives/policy/note-policy-context.js';
import { createNoteDirectiveUrlPolicyContext } from '../remark/directives/policy/directive-url-policy-context.js';
import type { NoteSourceRoot } from '../../shared/note/note-source-root.js';

export interface SourcePosition {
  line: number;
  column: number;
}

export interface StrippedMarkdownBody {
  body: string;
  frontmatter: string | null;
  bodyStartLine: number;
  hadBom: boolean;
}

export type CollectedMarkdownUrlOrigin =
  | 'mdast-link'
  | 'mdast-link-reference'
  | 'mdast-definition'
  | 'directive-url-attribute';

export interface CollectedUrlExpansionSource {
  kind: 'example-include-expanded';
  ref?: string;
}

export interface BaseCollectedMarkdownUrl {
  href: string;
  sourceFilePath: string;
  sourceFileDisplayPath: string;
  position?: SourcePosition | undefined;
  expansionSource?: CollectedUrlExpansionSource | undefined;
}

export interface CollectedMdastLinkUrl extends BaseCollectedMarkdownUrl {
  origin: 'mdast-link';
}

export interface CollectedMdastLinkReferenceUrl extends BaseCollectedMarkdownUrl {
  origin: 'mdast-link-reference';
  definitionPosition?: SourcePosition | undefined;
  definitionIdentifier?: string | undefined;
}

export interface CollectedDirectiveUrlAttribute extends BaseCollectedMarkdownUrl {
  origin: 'directive-url-attribute';
  directiveName: DirectiveName;
  directiveAttributeName: string;
  directiveUrlPolicy: DirectiveUrlPolicyName;
}

export interface CollectedMdastDefinitionUrl extends BaseCollectedMarkdownUrl {
  origin: 'mdast-definition';
  definitionPosition?: SourcePosition | undefined;
  definitionIdentifier?: string | undefined;
}

export type CollectedMarkdownUrl =
  | CollectedMdastLinkUrl
  | CollectedMdastLinkReferenceUrl
  | CollectedDirectiveUrlAttribute
  | CollectedMdastDefinitionUrl;

export interface CollectNoteSourceLinksOptions {
  body: string;
  bodyStartLine: number;
  frontmatter: string | null;
  sourceFilePath: string;
  sourceFileDisplayPath: string;
}

export interface ValidateNoteSourceLinksOptions {
  notes?: readonly IntrinsicNote[];
  sourceRootPaths?: Partial<Record<NoteSourceRoot, string>>;
}

const FRONTMATTER_START_PATTERN = /^\uFEFF?---(?:\r?\n)/u;
const FRONTMATTER_END_PATTERN = /\r?\n---(?:\r?\n|$)/u;

const toPosition = (
  node: MdastNode | undefined,
  bodyStartLine: number,
): SourcePosition | undefined => {
  const line = node?.position?.start?.line;
  const column = node?.position?.start?.column;
  if (typeof line !== 'number' || typeof column !== 'number') {
    return undefined;
  }
  return { line: line + bodyStartLine - 1, column };
};

const normalizeIdentifier = (value: string | undefined): string | undefined =>
  typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ').toLowerCase() : undefined;

const walk = (node: MdastNode, visitor: (node: MdastNode) => void): void => {
  visitor(node);
  if (!Array.isArray(node.children)) {
    return;
  }
  for (const child of node.children) {
    walk(child, visitor);
  }
};

const pickFrontmatterValue = (frontmatter: string | null, key: string): string | undefined => {
  if (!frontmatter) {
    return undefined;
  }
  const pattern = new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, 'mu');
  const matched = pattern.exec(frontmatter);
  return matched?.[1]?.trim().replace(/^['"]|['"]$/gu, '');
};

const buildPolicyContextFromFrontmatter = (
  frontmatter: string | null,
  file: { readonly path?: string; readonly value?: string },
) =>
  createNotePolicyContext(
    pickFrontmatterValue(frontmatter, 'kind'),
    pickFrontmatterValue(frontmatter, 'testingArea'),
    createNoteDirectiveUrlPolicyContext(file),
  );

const toResolveOptions = (
  sourceRootPaths: Partial<Record<NoteSourceRoot, string>> | undefined,
) => (sourceRootPaths === undefined ? {} : { sourceRootPaths });

export const stripYamlFrontmatter = (raw: string): StrippedMarkdownBody => {
  const hadBom = raw.startsWith('\uFEFF');
  const source = hadBom ? raw.slice(1) : raw;
  if (!FRONTMATTER_START_PATTERN.test(raw)) {
    return { body: source, frontmatter: null, bodyStartLine: 1, hadBom };
  }

  const startDelimiter = source.match(/^---(?:\r?\n)/u)?.[0];
  if (!startDelimiter) {
    return { body: source, frontmatter: null, bodyStartLine: 1, hadBom };
  }

  const rest = source.slice(startDelimiter.length);
  const endMatch = FRONTMATTER_END_PATTERN.exec(rest);
  if (!endMatch) {
    return { body: source, frontmatter: null, bodyStartLine: 1, hadBom };
  }

  const frontmatter = rest.slice(0, endMatch.index);
  const consumed = startDelimiter.length + endMatch.index + endMatch[0].length;
  const body = source.slice(consumed);
  const bodyStartLine = source.slice(0, consumed).split(/\r?\n/u).length;
  return { body, frontmatter, bodyStartLine, hadBom };
};

export async function collectNoteSourceLinksFromMarkdown(
  options: CollectNoteSourceLinksOptions,
): Promise<CollectedMarkdownUrl[]> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm, { singleTilde: false });
  const tree = processor.parse(options.body) as MdastNode;
  const file = {
    path: options.sourceFilePath,
    value: options.body,
    data: {},
  };
  file.data = { rouaultPolicyContext: buildPolicyContextFromFrontmatter(options.frontmatter, file) };

  await remarkExpandExampleIncludes()(tree, file);
  remarkDisallowRawHtml()(tree, file);
  remarkRouaultDirectives()(tree, file);

  const definitions = new Map<string, MdastNode>();
  walk(tree, (node) => {
    if (node.type === 'definition') {
      const identifier = normalizeIdentifier((node as MdastNode & { identifier?: string }).identifier);
      if (identifier && !definitions.has(identifier)) {
        definitions.set(identifier, node);
      }
    }
  });

  const collected: CollectedMarkdownUrl[] = [];
  walk(tree, (node) => {
    if (node.type === 'link' && typeof node.url === 'string') {
      collected.push({
        origin: 'mdast-link',
        href: node.url,
        sourceFilePath: options.sourceFilePath,
        sourceFileDisplayPath: options.sourceFileDisplayPath,
        position: toPosition(node, options.bodyStartLine),
      });
      return;
    }

    if (node.type === 'linkReference') {
      const referenceNode = node as MdastNode & { identifier?: string; label?: string };
      const identifier =
        normalizeIdentifier(referenceNode.identifier) ?? normalizeIdentifier(referenceNode.label);
      const definition = identifier ? definitions.get(identifier) : undefined;
      if (definition && typeof definition.url === 'string') {
        collected.push({
          origin: 'mdast-link-reference',
          href: definition.url,
          sourceFilePath: options.sourceFilePath,
          sourceFileDisplayPath: options.sourceFileDisplayPath,
          position: toPosition(node, options.bodyStartLine),
          definitionPosition: toPosition(definition, options.bodyStartLine),
          definitionIdentifier: identifier,
        });
      }
      return;
    }

    const directiveName = node.rouaultDirective?.name;
    const rawAttributes = node.rouaultDirective?.rawAttributes;
    if (!directiveName || !rawAttributes) {
      return;
    }
    for (const [attributeName, href] of Object.entries(rawAttributes)) {
      const directiveUrlPolicy = getDirectiveUrlAttributePolicy(directiveName, attributeName);
      if (!directiveUrlPolicy) {
        continue;
      }
      collected.push({
        origin: 'directive-url-attribute',
        href,
        sourceFilePath: options.sourceFilePath,
        sourceFileDisplayPath: options.sourceFileDisplayPath,
        position: toPosition(node, options.bodyStartLine),
        directiveName,
        directiveAttributeName: attributeName,
        directiveUrlPolicy,
      });
    }
  });

  return collected;
}

const formatLocation = (link: CollectedMarkdownUrl): string =>
  link.position ? `${link.sourceFileDisplayPath}:${link.position.line}:${link.position.column}` : link.sourceFileDisplayPath;

const createHrefDiagnosticRef = (href: string): string =>
  `href:${createHash('sha256').update(href).digest('hex').slice(0, 12)}`;

export function validateCollectedAuthoringLinks(
  links: readonly CollectedMarkdownUrl[],
  options: Pick<ValidateNoteSourceLinksOptions, 'sourceRootPaths'> = {},
): void {
  for (const link of links) {
    if (isRawNotesAbsoluteHref(link.href)) {
      throw new Error(
        `[markdown] /notes/... をMarkdown本文へ直書きできません: ${formatLocation(link)} ${createHrefDiagnosticRef(link.href)}。source file relative .md link を使ってください。`,
      );
    }

    parseRawHref(link.href);

    if (link.origin === 'directive-url-attribute') {
      continue;
    }

    resolveNoteSourceLink(
      { href: link.href, sourceFilePath: link.sourceFilePath },
      toResolveOptions(options.sourceRootPaths),
    );
  }
}

export function validateCollectedRouteReachability(
  links: readonly CollectedMarkdownUrl[],
  routePermalinks: ReadonlySet<string>,
  options: Pick<ValidateNoteSourceLinksOptions, 'sourceRootPaths'> = {},
): void {
  for (const link of links) {
    if (link.origin === 'directive-url-attribute') {
      continue;
    }
    const resolved = resolveNoteSourceLink(
      { href: link.href, sourceFilePath: link.sourceFilePath },
      toResolveOptions(options.sourceRootPaths),
    );
    if (resolved.kind === 'resolved' && !routePermalinks.has(resolved.permalink)) {
      throw new Error(
        `[markdown] note source link resolves to a non-generated route: ${formatLocation(link)} ${createHrefDiagnosticRef(link.href)} resolved="${resolved.permalink}"`,
      );
    }
  }
}

export function validateCollectedNoteSourceLinks(
  links: readonly CollectedMarkdownUrl[],
  routePermalinks: ReadonlySet<string>,
  options: Pick<ValidateNoteSourceLinksOptions, 'sourceRootPaths'> = {},
): void {
  validateCollectedAuthoringLinks(links, options);
  validateCollectedRouteReachability(links, routePermalinks, options);
}

const sourceRootPathsForValidation = (
  sourceRootPaths?: Partial<Record<NoteSourceRoot, string>>,
): Partial<Record<NoteSourceRoot, string>> =>
  sourceRootPaths ?? {
    content: path.resolve(process.cwd(), 'content'),
    'test/fixtures/content': path.resolve(process.cwd(), 'test/fixtures/content'),
  };

const sourcePathForNote = (
  note: IntrinsicNote,
  sourceRootPaths: Partial<Record<NoteSourceRoot, string>>,
): { sourceFilePath: string; sourceFileDisplayPath: string } => {
  if (!note.sourceRoot) {
    throw new Error(`[markdown] note.sourceRoot is required for note source link validation: ${note.rawSlug}`);
  }
  const rootPath = sourceRootPaths[note.sourceRoot];
  if (!rootPath) {
    throw new Error(`[markdown] sourceRootPaths is missing "${note.sourceRoot}" for ${note.rawSlug}`);
  }
  return {
    sourceFilePath: path.join(rootPath, `${note.rawSlug}.md`),
    sourceFileDisplayPath: `${note.sourceRoot}/${note.rawSlug}.md`,
  };
};

export async function validateNoteSourceLinks(
  options: ValidateNoteSourceLinksOptions = {},
): Promise<void> {
  if (!options.notes) {
    const velitePath = path.resolve(process.cwd(), '.velite', 'notes.json');
    if (!existsSync(velitePath)) {
      throw new Error(
        'Missing .velite/notes.json.\nRun `pnpm run codegen:content` before validate:note-links.',
      );
    }
  }

  const notes = options.notes ?? loadNotesData();
  const publicNotes = notes.filter((note) => note.status !== 'draft');
  const routePermalinks = new Set(publicNotes.map((note) => note.permalink));
  const sourceRootPaths = sourceRootPathsForValidation(options.sourceRootPaths);

  for (const note of publicNotes) {
    const { sourceFilePath, sourceFileDisplayPath } = sourcePathForNote(note, sourceRootPaths);
    const raw = readFileSync(sourceFilePath, 'utf8');
    const stripped = stripYamlFrontmatter(raw);
    const links = await collectNoteSourceLinksFromMarkdown({
      body: stripped.body,
      bodyStartLine: stripped.bodyStartLine,
      frontmatter: stripped.frontmatter,
      sourceFilePath,
      sourceFileDisplayPath,
    });
    validateCollectedNoteSourceLinks(links, routePermalinks, { sourceRootPaths });
  }
}
