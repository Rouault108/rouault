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
}

interface LinkCardMetadata {
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
  readonly siteName?: string;
}

interface OEmbedPayload {
  readonly title?: string;
  readonly thumbnail_url?: string;
  readonly provider_name?: string;
  readonly author_name?: string;
}

interface HtmlMetadataPayload {
  readonly finalUrl: string;
  readonly ogTitle?: string;
  readonly ogDescription?: string;
  readonly ogImage?: string;
  readonly ogSiteName?: string;
  readonly twitterTitle?: string;
  readonly twitterDescription?: string;
  readonly twitterImage?: string;
  readonly oembedUrl?: string;
}

interface RemarkLinkCardsOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"',
};

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

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

const toWarningMessage = (
  file: VFileLike | undefined,
  node: MdastNode,
  message: string,
): string => {
  const sourcePath = file?.path ?? 'unknown file';
  return `[markdown] ${message}: ${sourcePath}${getNodeLocation(node)}`;
};

const addWarning = (file: VFileLike | undefined, node: MdastNode, message: string): void => {
  const formatted = toWarningMessage(file, node, message);
  if (typeof file?.message === 'function') {
    file.message(formatted);
    return;
  }

  if (Array.isArray(file?.messages)) {
    file.messages.push({
      reason: formatted,
      message: formatted,
      fatal: false,
    });
  }
};

const isWhitespaceText = (node: MdastNode): boolean =>
  node.type === 'text' && (typeof node.value !== 'string' || node.value.trim().length === 0);

const getMeaningfulChildren = (node: MdastNode): MdastNode[] =>
  Array.isArray(node.children) ? node.children.filter((child) => !isWhitespaceText(child)) : [];

const isExternalHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return HTTP_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
};

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

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized.startsWith('#x')) {
      const parsed = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : full;
    }

    if (normalized.startsWith('#')) {
      const parsed = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : full;
    }

    return HTML_ENTITY_MAP[normalized] ?? full;
  });

const parseTagAttributes = (source: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const matched of source.matchAll(pattern)) {
    const key = (matched[1] ?? '').toLowerCase();
    if (key.length === 0) {
      continue;
    }

    const rawValue = matched[2] ?? matched[3] ?? matched[4] ?? '';
    attrs[key] = decodeHtmlEntities(rawValue);
  }

  return attrs;
};

const parseHtmlMetadata = (html: string, pageUrl: string): HtmlMetadataPayload => {
  const metaMap = new Map<string, string>();
  const linkTags: Record<string, string>[] = [];

  for (const matched of html.matchAll(/<(meta|link)\b([^>]*?)>/gi)) {
    const tagName = (matched[1] ?? '').toLowerCase();
    const attrsSource = matched[2] ?? '';
    const attrs = parseTagAttributes(attrsSource);

    if (tagName === 'meta') {
      const key =
        pickOptionalString(attrs['property'])?.toLowerCase() ??
        pickOptionalString(attrs['name'])?.toLowerCase();
      const content = pickOptionalString(attrs['content']);
      if (key && content && !metaMap.has(key)) {
        metaMap.set(key, normalizeWhitespace(content));
      }
      continue;
    }

    linkTags.push(attrs);
  }

  let oembedUrl: string | undefined;
  for (const attrs of linkTags) {
    const rel = pickOptionalString(attrs['rel'])?.toLowerCase() ?? '';
    const type = pickOptionalString(attrs['type'])?.toLowerCase() ?? '';
    const href = pickOptionalString(attrs['href']);
    if (!href) {
      continue;
    }

    if (rel.split(/\s+/).includes('alternate') && type === 'application/json+oembed') {
      oembedUrl = resolveSafeHttpUrl(href, pageUrl);
      if (oembedUrl) {
        break;
      }
    }
  }

  return {
    finalUrl: pageUrl,
    ...(metaMap.get('og:title') ? { ogTitle: metaMap.get('og:title') } : {}),
    ...(metaMap.get('og:description') ? { ogDescription: metaMap.get('og:description') } : {}),
    ...(resolveSafeHttpUrl(metaMap.get('og:image'), pageUrl)
      ? { ogImage: resolveSafeHttpUrl(metaMap.get('og:image'), pageUrl) }
      : {}),
    ...(metaMap.get('og:site_name') ? { ogSiteName: metaMap.get('og:site_name') } : {}),
    ...(metaMap.get('twitter:title') ? { twitterTitle: metaMap.get('twitter:title') } : {}),
    ...(metaMap.get('twitter:description')
      ? { twitterDescription: metaMap.get('twitter:description') }
      : {}),
    ...(resolveSafeHttpUrl(metaMap.get('twitter:image'), pageUrl)
      ? { twitterImage: resolveSafeHttpUrl(metaMap.get('twitter:image'), pageUrl) }
      : {}),
    ...(oembedUrl ? { oembedUrl } : {}),
  };
};

const resolveSafeHttpUrl = (value: string | undefined, baseUrl: string): string | undefined => {
  const trimmed = pickOptionalString(value);
  if (!trimmed) {
    return undefined;
  }

  try {
    const resolved = new URL(trimmed, baseUrl);
    return HTTP_PROTOCOLS.has(resolved.protocol) ? resolved.toString() : undefined;
  } catch {
    return undefined;
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

  return {
    url,
    ...(pickOptionalString(props['title']) ? { title: pickOptionalString(props['title']) } : {}),
    ...(pickOptionalString(props['description'])
      ? { description: pickOptionalString(props['description']) }
      : {}),
    ...(pickOptionalString(props['image']) ? { image: pickOptionalString(props['image']) } : {}),
  };
};

const fetchTextWithTimeout = async (
  fetcher: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<{ text: string; finalUrl: string }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(url, {
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)}`);
    }

    return {
      text: await response.text(),
      finalUrl: response.url || url,
    };
  } finally {
    clearTimeout(timer);
  }
};

const fetchJsonWithTimeout = async (
  fetcher: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(url, {
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

class LinkCardMetadataResolver {
  private readonly cache = new Map<string, Promise<LinkCardMetadata>>();

  constructor(
    private readonly fetcher: typeof fetch,
    private readonly timeoutMs: number,
  ) {}

  async resolve(url: string, node: MdastNode, file?: VFileLike): Promise<LinkCardMetadata> {
    const cached = this.cache.get(url);
    if (cached) {
      return cached;
    }

    const promise = this.fetchMetadata(url, node, file);
    this.cache.set(url, promise);
    return promise;
  }

  private async fetchMetadata(
    url: string,
    node: MdastNode,
    file?: VFileLike,
  ): Promise<LinkCardMetadata> {
    let htmlPayload: HtmlMetadataPayload;

    try {
      const { text, finalUrl } = await fetchTextWithTimeout(this.fetcher, url, this.timeoutMs);
      htmlPayload = parseHtmlMetadata(text, finalUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      addWarning(file, node, `link-card のメタデータ取得に失敗しました (${url}): ${message}`);
      return {};
    }

    let oembed: OEmbedPayload | null = null;
    if (htmlPayload.oembedUrl) {
      try {
        const payload = await fetchJsonWithTimeout(
          this.fetcher,
          htmlPayload.oembedUrl,
          this.timeoutMs,
        );
        if (payload && typeof payload === 'object') {
          const candidate = payload as Record<string, unknown>;
          oembed = {
            ...(pickOptionalString(candidate['title'])
              ? { title: pickOptionalString(candidate['title']) }
              : {}),
            ...(pickOptionalString(candidate['thumbnail_url'])
              ? { thumbnail_url: pickOptionalString(candidate['thumbnail_url']) }
              : {}),
            ...(pickOptionalString(candidate['provider_name'])
              ? { provider_name: pickOptionalString(candidate['provider_name']) }
              : {}),
            ...(pickOptionalString(candidate['author_name'])
              ? { author_name: pickOptionalString(candidate['author_name']) }
              : {}),
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        addWarning(
          file,
          node,
          `link-card の oEmbed 取得に失敗しました (${htmlPayload.oembedUrl}): ${message}`,
        );
      }
    }

    const title = htmlPayload.ogTitle ?? htmlPayload.twitterTitle ?? oembed?.title;
    const description = htmlPayload.ogDescription ?? htmlPayload.twitterDescription;
    const image =
      htmlPayload.ogImage ??
      htmlPayload.twitterImage ??
      resolveSafeHttpUrl(oembed?.thumbnail_url, htmlPayload.finalUrl);
    const siteName = htmlPayload.ogSiteName ?? oembed?.provider_name;

    return {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(image ? { image } : {}),
      ...(siteName ? { siteName } : {}),
    };
  }
}

const buildResolvedLinkCardProps = (
  href: string,
  metadata: LinkCardMetadata,
  source: LinkCardSource,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const title = source.title ?? metadata.title ?? buildFallbackTitle(href);
  const description = source.description ?? metadata.description;
  const explicitImage = source.image ? resolveSafeHttpUrl(source.image, href) : undefined;
  if (source.image && !explicitImage) {
    addWarning(
      file,
      node,
      `link-card の image を解決できなかったため無視しました (${source.image})`,
    );
  }
  const imageSrc = explicitImage ?? metadata.image;
  const siteName = metadata.siteName ?? buildFallbackTitle(href);

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

const transformNodes = async (
  nodes: MdastNode[],
  resolver: LinkCardMetadataResolver,
  file?: VFileLike,
): Promise<void> => {
  for (let index = 0; index < nodes.length; index += 1) {
    const current = nodes[index];
    if (!current) {
      continue;
    }

    const directiveSource = getDirectiveLinkCardSource(current);
    if (directiveSource) {
      const href = normalizeHttpUrl(directiveSource.url, current, file);
      const metadata = await resolver.resolve(href, current, file);
      nodes[index] = toResolvedLinkCardNode(
        current,
        buildResolvedLinkCardProps(href, metadata, directiveSource, current, file),
        'rouaultResolvedLinkCard',
      );
      continue;
    }

    if (isAutoLinkCardParagraph(current)) {
      const linkNode = getMeaningfulChildren(current)[0];
      const href = normalizeHttpUrl(linkNode?.url ?? '', current, file);
      const metadata = await resolver.resolve(href, current, file);
      nodes[index] = toResolvedLinkCardNode(
        current,
        buildResolvedLinkCardProps(href, metadata, { url: href }, current, file),
        'rouaultAutoLinkCard',
      );
      continue;
    }

    if (Array.isArray(current.children) && current.children.length > 0) {
      await transformNodes(current.children, resolver, file);
    }
  }
};

export function remarkLinkCards(options: RemarkLinkCardsOptions = {}) {
  return async (tree: unknown, file?: VFileLike) => {
    if (!tree || typeof tree !== 'object') {
      return;
    }

    const root = tree as MdastNode;
    if (!Array.isArray(root.children)) {
      return;
    }

    const fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!fetcher) {
      throw new Error('[markdown] link-card の fetch 実装が見つかりません');
    }

    const resolver = new LinkCardMetadataResolver(fetcher, options.timeoutMs ?? 5000);
    await transformNodes(root.children, resolver, file);
  };
}
