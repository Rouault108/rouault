import { createHash } from 'node:crypto';
import path from 'node:path';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from 'parse5';

interface MetadataEntry {
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
  readonly siteName?: string;
}

interface HtmlNode {
  nodeName?: string;
  tagName?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: HtmlNode[];
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

interface OEmbedPayload {
  readonly title?: string;
  readonly thumbnail_url?: string;
  readonly provider_name?: string;
}

interface ThumbnailCacheEntry {
  readonly sourcePath: string;
}

const CONTENT_ROOT = path.resolve(process.cwd(), 'content');
const OUTPUT_FILE = path.resolve(CONTENT_ROOT, '_generated', 'link-card-metadata.json');
const THUMBNAIL_OUTPUT_FILE = path.resolve(CONTENT_ROOT, '_generated', 'link-card-thumbnails.json');
const THUMBNAIL_ASSET_ROOT = path.resolve(CONTENT_ROOT, '_assets', 'link-card', 'remote');
const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const USER_AGENT = 'RouaultLinkCardSync/1.0';
const REQUEST_TIMEOUT_MS = 8000;
const CONCURRENCY = 4;
const IMAGE_ACCEPT_HEADER = 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5';

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

const parseTagAttributes = (source: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const matched of source.matchAll(pattern)) {
    const key = (matched[1] ?? '').toLowerCase();
    if (!key) {
      continue;
    }
    attrs[key] = matched[2] ?? matched[3] ?? matched[4] ?? '';
  }

  return attrs;
};

const extractUrlsFromMarkdown = (source: string): string[] => {
  const urls = new Set<string>();

  for (const matched of source.matchAll(/^\s*(https?:\/\/\S+)\s*$/gm)) {
    const normalized = normalizeLookupKey(matched[1] ?? '');
    if (normalized) {
      urls.add(normalized);
    }
  }

  for (const matched of source.matchAll(/::link-card\{([\s\S]*?)\}/g)) {
    const attrs = parseTagAttributes(matched[1] ?? '');
    const normalized = normalizeLookupKey(attrs['url'] ?? '');
    if (normalized) {
      urls.add(normalized);
    }
  }

  return [...urls];
};

const collectMarkdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.name === '_generated') {
      continue;
    }

    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectMarkdownFiles(resolved)));
      continue;
    }

    if (entry.isFile() && resolved.endsWith('.md')) {
      results.push(resolved);
    }
  }

  return results;
};

const walkNodes = (node: HtmlNode, visit: (node: HtmlNode) => void): void => {
  visit(node);
  for (const child of node.childNodes ?? []) {
    walkNodes(child, visit);
  }
};

const parseHtmlMetadata = (html: string, pageUrl: string): HtmlMetadataPayload => {
  const document = parse(html) as HtmlNode;
  const metaMap = new Map<string, string>();
  const linkTags: Record<string, string>[] = [];

  walkNodes(document, (node) => {
    const tagName = node.tagName?.toLowerCase();
    if (!tagName) {
      return;
    }

    const attrs = Object.fromEntries((node.attrs ?? []).map((attr) => [attr.name.toLowerCase(), attr.value]));

    if (tagName === 'meta') {
      const key =
        pickOptionalString(attrs['property'])?.toLowerCase() ??
        pickOptionalString(attrs['name'])?.toLowerCase();
      const content = pickOptionalString(attrs['content']);

      if (key && content && !metaMap.has(key)) {
        metaMap.set(key, normalizeWhitespace(content));
      }
      return;
    }

    if (tagName === 'link') {
      linkTags.push(attrs);
    }
  });

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

const fetchTextWithTimeout = async (
  url: string,
  timeoutMs: number,
): Promise<{ text: string; finalUrl: string }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
      },
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

const fetchJsonWithTimeout = async (url: string, timeoutMs: number): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, timeoutMs);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: 'application/json,text/plain,*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const extensionFromContentType = (contentType: string | null): string => {
  const normalized = (contentType ?? '').toLowerCase();
  if (normalized.includes('image/avif')) return 'avif';
  if (normalized.includes('image/webp')) return 'webp';
  if (normalized.includes('image/png')) return 'png';
  if (normalized.includes('image/gif')) return 'gif';
  return 'jpg';
};

const downloadThumbnailSource = async (url: string): Promise<ThumbnailCacheEntry> => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: IMAGE_ACCEPT_HEADER,
      },
    });

    if (!response.ok) {
      throw new Error(`thumbnail HTTP ${String(response.status)}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
    const extension = extensionFromContentType(response.headers.get('content-type'));
    const sourcePath = path.posix.join('content/_assets/link-card/remote', `${hash}.${extension}`);
    const outputPath = path.join(THUMBNAIL_ASSET_ROOT, `${hash}.${extension}`);

    await mkdir(THUMBNAIL_ASSET_ROOT, { recursive: true });
    await writeFile(outputPath, buffer);

    return { sourcePath };
  } finally {
    clearTimeout(timer);
  }
};

const fetchMetadata = async (
  url: string,
): Promise<{ finalUrl: string; metadata: MetadataEntry }> => {
  const { text, finalUrl } = await fetchTextWithTimeout(url, REQUEST_TIMEOUT_MS);
  const htmlPayload = parseHtmlMetadata(text, finalUrl);

  let oembed: OEmbedPayload | null = null;
  if (htmlPayload.oembedUrl) {
    try {
      const payload = await fetchJsonWithTimeout(htmlPayload.oembedUrl, REQUEST_TIMEOUT_MS);
      if (payload && typeof payload === 'object') {
        const raw = payload as Record<string, unknown>;
        oembed = {
          ...(pickOptionalString(raw['title']) ? { title: pickOptionalString(raw['title']) } : {}),
          ...(pickOptionalString(raw['thumbnail_url'])
            ? { thumbnail_url: pickOptionalString(raw['thumbnail_url']) }
            : {}),
          ...(pickOptionalString(raw['provider_name'])
            ? { provider_name: pickOptionalString(raw['provider_name']) }
            : {}),
        };
      }
    } catch {
      // oEmbed は補助情報なので失敗しても継続する。
    }
  }

  const metadata: MetadataEntry = {
    ...(htmlPayload.ogTitle ?? htmlPayload.twitterTitle ?? oembed?.title
      ? { title: htmlPayload.ogTitle ?? htmlPayload.twitterTitle ?? oembed?.title }
      : {}),
    ...(htmlPayload.ogDescription ?? htmlPayload.twitterDescription
      ? { description: htmlPayload.ogDescription ?? htmlPayload.twitterDescription }
      : {}),
    ...(htmlPayload.ogImage ??
      htmlPayload.twitterImage ??
      resolveSafeHttpUrl(oembed?.thumbnail_url, finalUrl)
      ? {
        image:
          htmlPayload.ogImage ??
          htmlPayload.twitterImage ??
          resolveSafeHttpUrl(oembed?.thumbnail_url, finalUrl),
      }
      : {}),
    ...(htmlPayload.ogSiteName ?? oembed?.provider_name
      ? { siteName: htmlPayload.ogSiteName ?? oembed?.provider_name }
      : {}),
  };

  return { finalUrl, metadata };
};

const runPool = async <T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> => {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item === undefined) {
          return;
        }
        await worker(item);
      }
    }),
  );
};

const main = async (): Promise<void> => {
  const markdownFiles = await collectMarkdownFiles(CONTENT_ROOT);
  const urls = new Set<string>();

  for (const filePath of markdownFiles) {
    const source = await readFile(filePath, 'utf8');
    for (const url of extractUrlsFromMarkdown(source)) {
      urls.add(url);
    }
  }

  const entries: Record<string, MetadataEntry> = {};
  const thumbnailEntries: Record<string, ThumbnailCacheEntry> = {};
  const sortedUrls = [...urls].sort((a, b) => a.localeCompare(b));

  await runPool(sortedUrls, CONCURRENCY, async (url) => {
    process.stdout.write(`sync link-card metadata: ${url}\n`);

    try {
      const { finalUrl, metadata } = await fetchMetadata(url);
      if (!metadata.title && !metadata.description && !metadata.image && !metadata.siteName) {
        return;
      }

      entries[url] = metadata;

      const finalKey = normalizeLookupKey(finalUrl);
      if (finalKey && finalKey !== url) {
        entries[finalKey] = metadata;
      }

      if (metadata.image) {
        try {
          thumbnailEntries[metadata.image] = await downloadThumbnailSource(metadata.image);
        } catch (thumbnailError) {
          const thumbnailMessage =
            thumbnailError instanceof Error ? thumbnailError.message : 'unknown error';
          process.stderr.write(`warn: thumbnail ${metadata.image}: ${thumbnailMessage}\n`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      process.stderr.write(`warn: ${url}: ${message}\n`);
    }
  });

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries: Object.fromEntries(
      Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)),
    ),
  };

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await writeFile(
    THUMBNAIL_OUTPUT_FILE,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        entries: Object.fromEntries(
          Object.entries(thumbnailEntries).sort(([left], [right]) => left.localeCompare(right)),
        ),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  process.stdout.write(`wrote ${OUTPUT_FILE}\n`);
  process.stdout.write(`wrote ${THUMBNAIL_OUTPUT_FILE}\n`);
};

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
