import path from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import { isLocalContentAssetPath, resolveLinkCardImage } from '../media/image-resolver.js';

interface MdastNodeData {
  hName?: string;
  hProperties?: Record<string, unknown>;
}

interface MdastNodePosition {
  start?: {
    line?: number;
    column?: number;
  };
}

interface MdastNode {
  type?: string;
  url?: string;
  value?: string;
  children?: MdastNode[];
  data?: MdastNodeData;
  position?: MdastNodePosition;
}

interface VFileMessageLike {
  reason?: string;
  message?: string;
  fatal?: boolean | null;
}

interface VFileLike {
  path?: string;
  value?: unknown;
  messages?: VFileMessageLike[];
  message?: (reason: string) => void;
}

interface LinkCardSource {
  readonly url: string;
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
  readonly siteName?: string;
}

interface LinkCardMetadata {
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
  readonly siteName?: string;
}

interface LinkCardMetadataCacheFile {
  readonly version?: number;
  readonly generatedAt?: string;
  readonly entries?: Record<string, unknown>;
}

interface RemarkLinkCardsOptions {
  metadataFile?: string;
}

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const DEFAULT_METADATA_FILE = 'content/_generated/link-card-metadata.json';

let cachedMetadataFilePath: string | null = null;
let cachedMetadataMtimeMs = -1;
let cachedMetadataMap = new Map<string, LinkCardMetadata>();

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getNodeLocation = (node: MdastNode): string => {
  const line = node.position?.start?.line;
  const column = node.position?.start?.column;
  if (typeof line === 'number' && typeof column === 'number') {
    return `:${String(line)}:${String(column)}`;
  }
  return '';
};

const toError = (file: VFileLike | undefined, node: MdastNode, message: string): Error => {
  const sourcePath = file?.path ?? 'unknown file';
  return new Error(`[markdown] ${message}: ${sourcePath}${getNodeLocation(node)}`);
};

const isWhitespaceText = (node: MdastNode): boolean =>
  node.type === 'text' && (typeof node.value !== 'string' || node.value.trim().length === 0);

const getMeaningfulChildren = (node: MdastNode): MdastNode[] =>
  Array.isArray(node.children) ? node.children.filter((child) => !isWhitespaceText(child)) : [];

const normalizeHttpUrl = (value: string, node: MdastNode, file?: VFileLike): string => {
  try {
    const url = new URL(value);
    if (!HTTP_PROTOCOLS.has(url.protocol)) {
      throw new Error('unsupported protocol');
    }
    return url.toString();
  } catch {
    throw toError(file, node, 'link-card の url は http/https の絶対 URL のみ指定可能です');
  }
};

const normalizeLookupKey = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    if (!HTTP_PROTOCOLS.has(url.protocol)) {
      return undefined;
    }
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
};

const buildLookupCandidates = (href: string): string[] => {
  const normalized = normalizeLookupKey(href);
  if (!normalized) {
    return [];
  }

  const candidates = new Set<string>([normalized]);
  const url = new URL(normalized);

  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    const alt = new URL(normalized);
    alt.pathname = alt.pathname.slice(0, -1);
    candidates.add(alt.toString());
  } else if (!url.pathname.endsWith('/')) {
    const alt = new URL(normalized);
    alt.pathname = `${alt.pathname}/`;
    candidates.add(alt.toString());
  }

  return [...candidates];
};

const isExternalHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return HTTP_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
};

const buildFallbackTitle = (href: string): string => {
  try {
    const url = new URL(href);
    return url.hostname || href;
  } catch {
    return href;
  }
};

const normalizeCardImage = (value: string | undefined): string | undefined => {
  const trimmed = pickOptionalString(value);
  if (!trimmed) {
    return undefined;
  }

  if (isLocalContentAssetPath(trimmed)) {
    return trimmed;
  }

  try {
    const resolved = new URL(trimmed);
    return HTTP_PROTOCOLS.has(resolved.protocol) ? resolved.toString() : undefined;
  } catch {
    return undefined;
  }
};

const normalizeMetadataEntry = (value: unknown): LinkCardMetadata => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const raw = value as Record<string, unknown>;
  const title = pickOptionalString(raw['title']);
  const description = pickOptionalString(raw['description']);
  const image = normalizeCardImage(pickOptionalString(raw['image']));
  const siteName = pickOptionalString(raw['siteName']);

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(siteName ? { siteName } : {}),
  };
};

const loadMetadataMap = (metadataFile: string): Map<string, LinkCardMetadata> => {
  const resolvedPath = path.resolve(process.cwd(), metadataFile);

  let stat;
  try {
    stat = statSync(resolvedPath);
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === 'ENOENT') {
      return new Map();
    }
    throw error;
  }

  if (
    cachedMetadataFilePath === resolvedPath &&
    cachedMetadataMtimeMs === stat.mtimeMs
  ) {
    return cachedMetadataMap;
  }

  const raw = readFileSync(resolvedPath, 'utf8');
  let parsed: LinkCardMetadataCacheFile;
  try {
    parsed = JSON.parse(raw) as LinkCardMetadataCacheFile;
  } catch {
    throw new Error(`[markdown] link-card metadata cache JSON が不正です: ${resolvedPath}`);
  }

  const entries =
    parsed && typeof parsed === 'object' && parsed.entries && typeof parsed.entries === 'object'
      ? parsed.entries
      : {};

  const map = new Map<string, LinkCardMetadata>();

  for (const [key, value] of Object.entries(entries)) {
    const normalizedKey = normalizeLookupKey(key);
    if (!normalizedKey) {
      continue;
    }

    const metadata = normalizeMetadataEntry(value);
    if (metadata.title || metadata.description || metadata.image || metadata.siteName) {
      map.set(normalizedKey, metadata);
    }
  }

  cachedMetadataFilePath = resolvedPath;
  cachedMetadataMtimeMs = stat.mtimeMs;
  cachedMetadataMap = map;

  return map;
};

const findCachedMetadata = (
  href: string,
  metadataMap: Map<string, LinkCardMetadata>,
): LinkCardMetadata => {
  for (const candidate of buildLookupCandidates(href)) {
    const metadata = metadataMap.get(candidate);
    if (metadata) {
      return metadata;
    }
  }
  return {};
};

const isAutoLinkCardParagraph = (
  node: MdastNode,
): node is MdastNode & { children: MdastNode[] } => {
  if (node.type !== 'paragraph' || !Array.isArray(node.children)) {
    return false;
  }

  const meaningfulChildren = getMeaningfulChildren(node);
  if (meaningfulChildren.length !== 1) {
    return false;
  }

  const onlyChild = meaningfulChildren[0];
  return (
    onlyChild?.type === 'link' &&
    typeof onlyChild.url === 'string' &&
    isExternalHttpUrl(onlyChild.url)
  );
};

const getDirectiveLinkCardSource = (node: MdastNode): LinkCardSource | null => {
  if (node.type !== 'rouaultDirectiveLinkCard') {
    return null;
  }

  const props = node.data?.hProperties ?? {};
  const url = pickOptionalString(props['url']);
  if (!url) {
    return null;
  }

  const title = pickOptionalString(props['title']);
  const description = pickOptionalString(props['description']);
  const image = pickOptionalString(props['image']);
  const siteName = pickOptionalString(props['site-name']);

  return {
    url,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(siteName ? { siteName } : {}),
  };
};

const buildResolvedLinkCardProps = (
  href: string,
  metadata: LinkCardMetadata,
  source: LinkCardSource,
): Record<string, unknown> => {
  const title = source.title ?? metadata.title ?? buildFallbackTitle(href);
  const description = source.description ?? metadata.description;
  const imageSrc = resolveLinkCardImage(normalizeCardImage(source.image) ?? metadata.image);
  const siteName = source.siteName ?? metadata.siteName ?? buildFallbackTitle(href);

  return {
    'card-kind': 'link',
    href,
    'card-title': title,
    ...(description ? { description } : {}),
    ...(imageSrc ? { 'image-src': imageSrc } : {}),
    ...(siteName ? { 'site-name': siteName } : {}),
  };
};

const toResolvedLinkCardNode = (
  sourceNode: MdastNode,
  properties: Record<string, unknown>,
  nodeType: string,
): MdastNode => ({
  type: nodeType,
  data: {
    hName: 'ui-card',
    hProperties: properties,
  },
  children: [],
  ...(sourceNode.position ? { position: sourceNode.position } : {}),
});

const transformNodes = (
  nodes: MdastNode[],
  metadataMap: Map<string, LinkCardMetadata>,
  file?: VFileLike,
): void => {
  for (let index = 0; index < nodes.length; index += 1) {
    const current = nodes[index];
    if (!current) {
      continue;
    }

    const directiveSource = getDirectiveLinkCardSource(current);
    if (directiveSource) {
      const href = normalizeHttpUrl(directiveSource.url, current, file);
      const metadata = findCachedMetadata(href, metadataMap);

      nodes[index] = toResolvedLinkCardNode(
        current,
        buildResolvedLinkCardProps(href, metadata, directiveSource),
        'rouaultResolvedLinkCard',
      );
      continue;
    }

    if (isAutoLinkCardParagraph(current)) {
      const linkNode = getMeaningfulChildren(current)[0];
      const href = normalizeHttpUrl(linkNode?.url ?? '', current, file);
      const metadata = findCachedMetadata(href, metadataMap);

      nodes[index] = toResolvedLinkCardNode(
        current,
        buildResolvedLinkCardProps(href, metadata, { url: href }),
        'rouaultAutoLinkCard',
      );
      continue;
    }

    if (Array.isArray(current.children) && current.children.length > 0) {
      transformNodes(current.children, metadataMap, file);
    }
  }
};

export function remarkLinkCards(options: RemarkLinkCardsOptions = {}) {
  return (tree: unknown, file?: VFileLike) => {
    if (!tree || typeof tree !== 'object') {
      return;
    }

    const root = tree as MdastNode;
    if (!Array.isArray(root.children)) {
      return;
    }

    const metadataMap = loadMetadataMap(options.metadataFile ?? DEFAULT_METADATA_FILE);
    transformNodes(root.children, metadataMap, file);
  };
}
