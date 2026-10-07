import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkStringify from 'remark-stringify';
import type { Root, Nodes, RootContent, PhrasingContent, Heading, Link, Definition } from 'mdast';
import { createUniqueHeadingId } from '../../build/content/heading-anchor-planner.js';
import { resolveContentRoute } from '../../build/content/content-route-registry.js';
import { parseRawHref } from '../../build/markdown/note-source-link-resolver.js';
import { hashBytes, isNotePath, resolveVaultReference, type VaultNote } from './source-snapshot.js';
import type { PublicationLedger, PublicationOperation } from './model.js';
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm, { singleTilde: false })
  .use(remarkMath)
  .use(remarkStringify);
const childrenOf = (node: Nodes): Nodes[] => ('children' in node ? node.children : []);
const textOf = (node: Nodes): string =>
  'value' in node ? node.value : childrenOf(node).map(textOf).join('');
const wikiPattern = /(!?)\[\[([^\]\n]+)\]\]/gu;
const escapedWikiTokens = (
  node: Extract<PhrasingContent, { type: 'text' }>,
  body: string,
): boolean[] => {
  const raw = node.position
    ? body.slice(node.position.start.offset, node.position.end.offset)
    : node.value;
  let decoded = '';
  const escaped: boolean[] = [];
  for (let i = 0; i < raw.length; i++) {
    const current = raw[i] ?? '';
    const next = raw[i + 1] ?? '';
    if (current === '\\' && /[!-/:-@[-`{-~]/u.test(next)) {
      decoded += next;
      escaped.push(true);
      i++;
    } else {
      decoded += current;
      escaped.push(false);
    }
  }
  const tokens = [...decoded.matchAll(wikiPattern)].map(
    (match) => escaped[match.index] === true || escaped[match.index + (match[1] ? 1 : 0)] === true,
  );
  if (tokens.length !== [...node.value.matchAll(wikiPattern)].length)
    throw new Error('[import] ambiguous escaped wiki syntax');
  return tokens;
};
interface HeadingRef {
  node: Heading;
  index: number;
  text: string;
  id: string;
}
const headingsOf = (tree: Root): HeadingRef[] => {
  const result: HeadingRef[] = [];
  const counters = new Map<string, number>();
  const walk = (node: Nodes): void => {
    if (node.type === 'heading') {
      const text = textOf(node);
      result.push({ node, index: result.length, text, id: createUniqueHeadingId(text, counters) });
    }
    childrenOf(node).forEach(walk);
  };
  walk(tree);
  return result;
};
const selectHeading = (headings: readonly HeadingRef[], fragment: string): HeadingRef => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(fragment);
  } catch {
    throw new Error('[import] malformed fragment');
  }
  const titleMatches = headings.filter((heading) => heading.text === decoded);
  const matches = titleMatches.length
    ? titleMatches
    : headings.filter((heading) => heading.id === decoded);
  if (matches.length !== 1 || !matches[0]) throw new Error('[import] missing or ambiguous heading');
  return matches[0];
};
export interface TransformedMemo {
  markdown: string;
  headingMap: Record<string, string>;
  dependencies: Record<string, string>;
}
interface PendingLink {
  node: Link;
  target: string;
  fragment: string;
  occurrence: string;
  origin: string;
  search: string;
}
interface HeadingOrigin {
  source: string;
  index: number;
  occurrence: string;
}
export const transformRequestedMemos = async (input: {
  operation: PublicationOperation;
  ledger: PublicationLedger;
  notes: ReadonlyMap<string, VaultNote>;
  image: (
    reference: string,
    origin: string,
    dependencies: Record<string, string>,
  ) => Promise<string>;
}): Promise<Map<string, TransformedMemo>> => {
  const trees = new Map<string, Root>();
  const sourceHeadings = new Map<string, HeadingRef[]>();
  const parse = (name: string): Root => {
    const cached = trees.get(name);
    if (cached) return cached;
    const note = input.notes.get(name);
    if (!note) throw new Error('[import] note missing');
    const tree = processor.parse(note.body);
    const inspect = (node: Nodes): void => {
      if (node.type === 'html') throw new Error('[import] raw HTML is forbidden');
      if (node.type === 'code' && ['dataview', 'dataviewjs'].includes(node.lang ?? ''))
        throw new Error('[import] unsupported query syntax');
      if (node.type === 'text' && /%%|\[![a-zA-Z]+\]|^\s*:::/mu.test(node.value))
        throw new Error('[import] unsupported Obsidian syntax');
      childrenOf(node).forEach(inspect);
    };
    inspect(tree);
    trees.set(name, tree);
    sourceHeadings.set(name, headingsOf(tree));
    return tree;
  };
  const approved = (name: string, embed: boolean): boolean => {
    const note = input.notes.get(name);
    if (!note || !isNotePath(name)) return false;
    const requested =
      input.operation.targets.includes(name) && input.operation.action !== 'withdraw';
    const entry = input.ledger.entries[name];
    if (requested) return note.metadata['publish'] === true;
    if (entry?.status !== 'published' || note.metadata['publish'] !== true) return false;
    if (embed && entry.approvedContentHash !== note.versionHash)
      throw new Error('[import] embed content version requires approval');
    return true;
  };
  const route = (name: string): string =>
    resolveContentRoute({
      collectionId: 'memos',
      sourceRelativePath: name.slice('02_notes/'.length),
    }).canonicalPathname;
  const result = new Map<string, TransformedMemo>();
  const pendingByMemo = new Map<string, PendingLink[]>();
  const finalTrees = new Map<string, Root>();
  const originsByMemo = new Map<string, WeakMap<Nodes, HeadingOrigin>>();
  for (const target of input.operation.targets) {
    if (input.operation.action === 'withdraw') continue;
    if (!approved(target, false)) throw new Error('[import] target not authorized');
    const pending: PendingLink[] = [];
    const headingOrigins = new WeakMap<Nodes, HeadingOrigin>();
    const dependencies: Record<string, string> = {};
    let occurrences = 0;
    let bodyBytes = 0;
    const expand = async (
      name: string,
      occurrence: string,
      stack: readonly string[],
      fragment = '',
      parentLevel = 0,
    ): Promise<RootContent[]> => {
      if (stack.includes(name) || stack.length >= 16 || occurrences > 256)
        throw new Error('[import] embed cycle or expansion limit');
      const original = parse(name);
      const note = input.notes.get(name);
      if (!note) throw new Error('[import] note missing');
      bodyBytes += Buffer.byteLength(note.body);
      if (bodyBytes > 10 * 1024 * 1024) throw new Error('[import] body size limit');
      if (name !== target) dependencies[name] = note.versionHash;
      const originalHeadings = sourceHeadings.get(name) ?? [];
      const definitions = new Map<string, Definition>();
      const footnotes = new Map<string, Extract<RootContent, { type: 'footnoteDefinition' }>>();
      for (const node of original.children) {
        if (node.type === 'definition') definitions.set(node.identifier.toLowerCase(), node);
        if (node.type === 'footnoteDefinition') footnotes.set(node.identifier.toLowerCase(), node);
      }
      let selected = original.children;
      let levelOffset = 0;
      if (fragment) {
        const heading = selectHeading(originalHeadings, fragment);
        const start = original.children.indexOf(heading.node);
        if (start < 0) throw new Error('[import] embedded heading must be a section boundary');
        let end = start + 1;
        while (end < original.children.length) {
          const next = original.children[end];
          if (next?.type === 'heading' && next.depth <= heading.node.depth) break;
          end += 1;
        }
        selected = original.children.slice(start, end);
        levelOffset = parentLevel + 1 - heading.node.depth;
      } else if (occurrence !== 'root' && originalHeadings.length) {
        levelOffset =
          parentLevel + 1 - Math.min(...originalHeadings.map((heading) => heading.node.depth));
      }
      const neededFootnotes = new Set<string>();
      const escapedByNode = new WeakMap<Nodes, boolean[]>();
      const escapesFor = (node: Extract<PhrasingContent, { type: 'text' }>) =>
        escapedByNode.get(node) ?? escapedWikiTokens(node, note.body);
      const textSlice = (
        node: Extract<PhrasingContent, { type: 'text' }>,
        begin: number,
        end = node.value.length,
      ): PhrasingContent => {
        const sliced: Extract<PhrasingContent, { type: 'text' }> = {
          type: 'text',
          value: node.value.slice(begin, end),
        };
        const flags = escapesFor(node);
        escapedByNode.set(
          sliced,
          [...node.value.matchAll(wikiPattern)].flatMap((match, index) =>
            match.index >= begin && match.index < end ? [flags[index] ?? false] : [],
          ),
        );
        return sliced;
      };
      let currentLevel = parentLevel;
      const convertLink = (
        node: Link,
        raw: string,
        wiki: boolean,
        explicit: boolean,
      ): PhrasingContent => {
        const href = parseRawHref(raw);
        if (
          href.kind === 'unsafe-scheme-url' ||
          href.kind === 'scheme-url' ||
          href.kind === 'protocol-relative-url' ||
          href.kind === 'absolute-path'
        )
          throw new Error('[import] unsafe or unsupported URL');
        if (href.kind === 'external-web-url' || href.kind === 'external-action-url') return node;
        if (href.kind !== 'hash-only' && !wiki && !href.pathname.endsWith('.md'))
          throw new Error('[import] unsupported local link');
        const linked =
          href.kind === 'hash-only'
            ? name
            : resolveVaultReference(href.pathname, name, input.notes, wiki);
        if (!approved(linked, false))
          return {
            type: 'text',
            value: explicit ? textOf(node) : path.posix.basename(linked, '.md'),
          };
        node.url = route(linked) + href.search;
        node.title = null;
        pending.push({
          node,
          target: linked,
          fragment: href.hash.slice(1),
          occurrence,
          origin: name,
          search: href.search,
        });
        return node;
      };
      const convertInline = async (node: PhrasingContent): Promise<PhrasingContent[]> => {
        if (node.type === 'text') {
          const parts: PhrasingContent[] = [];
          const flags = escapesFor(node);
          let tokenIndex = 0;
          let previous = 0;
          for (const match of node.value.matchAll(wikiPattern)) {
            const index = match.index;
            if (flags[tokenIndex++]) continue;
            parts.push({ type: 'text', value: node.value.slice(previous, index) });
            const payload = match[2] ?? '';
            const separator = payload.indexOf('|');
            const reference = separator < 0 ? payload : payload.slice(0, separator);
            const label =
              separator < 0
                ? path.posix.basename(reference.split('#')[0] ?? '', '.md')
                : payload.slice(separator + 1);
            if (match[1]) {
              if (reference.includes('|') || reference.includes('#'))
                throw new Error('[import] unsupported image embed syntax');
              const extension = path.posix.extname(reference).slice(1).toLowerCase();
              if (!extension || extension === 'md')
                throw new Error('[import] note embed requires a block context');
              parts.push({
                type: 'image',
                url: await input.image(reference, name, dependencies),
                alt: '',
                title: null,
              });
              previous = index + match[0].length;
              continue;
            }
            parts.push(
              convertLink(
                { type: 'link', url: reference, children: [{ type: 'text', value: label }] },
                reference,
                true,
                separator >= 0,
              ),
            );
            previous = index + match[0].length;
          }
          if (!previous) return [structuredClone(node)];
          parts.push({ type: 'text', value: node.value.slice(previous) });
          return parts;
        }
        if (node.type === 'linkReference' || node.type === 'imageReference') {
          const definition = definitions.get(node.identifier.toLowerCase());
          if (!definition) throw new Error('[import] definition missing');
          return convertInline(
            node.type === 'linkReference'
              ? { type: 'link', url: definition.url, children: structuredClone(node.children) }
              : { type: 'image', url: definition.url, alt: node.alt },
          );
        }
        if (node.type === 'link') {
          const copy = structuredClone(node);
          copy.children = (await Promise.all(node.children.map(convertInline))).flat();
          return [convertLink(copy, node.url, false, true)];
        }
        if (node.type === 'image') {
          if (node.url.endsWith('.md'))
            throw new Error('[import] Markdown image cannot embed a note');
          return [
            {
              ...structuredClone(node),
              url: await input.image(node.url, name, dependencies),
              title: null,
            },
          ];
        }
        if (node.type === 'footnoteReference') {
          neededFootnotes.add(node.identifier.toLowerCase());
          return [
            {
              ...structuredClone(node),
              identifier: `${occurrence}-${node.identifier}`,
              label: `${occurrence}-${node.identifier}`,
            },
          ];
        }
        const copy = structuredClone(node);
        if ('children' in copy && 'children' in node)
          copy.children = (await Promise.all(node.children.map(convertInline))).flat();
        return [copy];
      };
      const convertBlock = async (node: RootContent): Promise<RootContent[]> => {
        if (node.type === 'definition' || node.type === 'footnoteDefinition') return [];
        if (node.type === 'paragraph') {
          const output: RootContent[] = [];
          let inline: PhrasingContent[] = [];
          let embedded = false;
          const flush = async (): Promise<void> => {
            if (!inline.length) return;
            const children = (await Promise.all(inline.map(convertInline))).flat();
            if (children.some((child) => child.type !== 'text' || child.value.trim()))
              output.push({ type: 'paragraph', children });
            inline = [];
          };
          for (const child of node.children) {
            if (child.type !== 'text') {
              inline.push(child);
              continue;
            }
            let previous = 0;
            const flags = escapesFor(child);
            let tokenIndex = 0;
            for (const match of child.value.matchAll(wikiPattern)) {
              const escaped = flags[tokenIndex++];
              if (escaped || !match[1]) continue;
              const reference = match[2] ?? '';
              const parsed = parseRawHref(reference);
              const extension = path.posix.extname(parsed.pathname).slice(1).toLowerCase();
              if (extension && extension !== 'md') continue;
              if (reference.includes('|') || reference.includes('#^'))
                throw new Error('[import] unsupported embed syntax');
              inline.push(textSlice(child, previous, match.index));
              await flush();
              const linked = resolveVaultReference(parsed.pathname, name, input.notes, true);
              if (!approved(linked, true))
                throw new Error('[import] private embed requires approval');
              occurrences += 1;
              output.push(
                ...(await expand(
                  linked,
                  `embed-${occurrences.toString()}`,
                  [...stack, name],
                  parsed.hash.slice(1),
                  currentLevel,
                )),
              );
              previous = match.index + match[0].length;
              embedded = true;
            }
            inline.push(previous ? textSlice(child, previous) : child);
          }
          if (embedded) {
            await flush();
            return output;
          }
        }
        const copy = structuredClone(node);
        if (copy.type === 'heading') {
          const originalHeading = originalHeadings.find((heading) => heading.node === node);
          if (!originalHeading) throw new Error('[import] heading identity missing');
          const depth = copy.depth + levelOffset;
          if (depth < 1 || depth > 6) throw new Error('[import] heading level overflow');
          copy.depth = depth as Heading['depth'];
          currentLevel = depth;
          headingOrigins.set(copy, { source: name, index: originalHeading.index, occurrence });
        }
        if (copy.type === 'paragraph' || copy.type === 'heading' || copy.type === 'tableCell') {
          copy.children = (await Promise.all(copy.children.map(convertInline))).flat();
        } else if ('children' in copy) {
          const converted: RootContent[] = [];
          for (const child of copy.children) converted.push(...(await convertBlock(child)));
          copy.children = converted as typeof copy.children;
        }
        return [copy];
      };
      const output: RootContent[] = [];
      for (const node of selected) output.push(...(await convertBlock(node)));
      const seenFootnotes = new Set<string>();
      for (const id of neededFootnotes) {
        if (seenFootnotes.has(id)) continue;
        seenFootnotes.add(id);
        const definition = footnotes.get(id);
        if (!definition) throw new Error('[import] footnote missing');
        const content: RootContent[] = [];
        for (const child of definition.children) content.push(...(await convertBlock(child)));
        output.push({
          ...structuredClone(definition),
          identifier: `${occurrence}-${id}`,
          label: `${occurrence}-${id}`,
          children: content as typeof definition.children,
        });
      }
      return output;
    };
    const tree: Root = { type: 'root', children: await expand(target, 'root', []) };
    const headingMap: Record<string, string> = {};
    for (const heading of headingsOf(tree)) headingMap[heading.id] = heading.text;
    result.set(target, { markdown: '', headingMap, dependencies });
    pendingByMemo.set(target, pending);
    finalTrees.set(target, tree);
    originsByMemo.set(target, headingOrigins);
  }
  for (const [target, output] of result) {
    const tree = finalTrees.get(target);
    const origins = originsByMemo.get(target);
    if (!tree || !origins) throw new Error('[import] final tree missing');
    const finalHeadings = headingsOf(tree);
    for (const link of pendingByMemo.get(target) ?? []) {
      if (!link.fragment) continue;
      const candidate = result.get(link.target);
      const publishedMap = candidate?.headingMap ?? input.ledger.entries[link.target]?.headingMap;
      if (!publishedMap) throw new Error('[import] published heading map missing');
      const map = Object.entries(publishedMap).map(([id, text], index) => ({ id, text, index }));
      const decoded = decodeURIComponent(link.fragment);
      const matches = map.filter((heading) => heading.text === decoded);
      const valid = matches.length ? matches : map.filter((heading) => heading.id === decoded);
      if (valid.length !== 1 || !valid[0])
        throw new Error('[import] public anchor missing or ambiguous');
      const sourceHeading =
        link.origin === link.target
          ? selectHeading(sourceHeadings.get(link.target) ?? [], link.fragment)
          : undefined;
      const local = sourceHeading
        ? finalHeadings.find((heading) => {
            const origin = origins.get(heading.node);
            return (
              origin?.source === link.target &&
              origin.index === sourceHeading.index &&
              origin.occurrence === link.occurrence
            );
          })
        : undefined;
      link.node.url = local
        ? `${link.search}#${local.id}`
        : `${route(link.target)}${link.search}#${valid[0].id}`;
    }
    output.markdown = processor.stringify(tree);
    output.dependencies['transform-config'] = hashBytes('memos-import-v1');
  }
  return result;
};
