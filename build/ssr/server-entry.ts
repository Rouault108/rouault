import { renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import type { TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import {
  parseMediaSourcesAttribute,
  type MediaSourceDescriptor,
} from '../../build/media/image-resolver.js';
import { AppRouter } from '../../src/components/app/app-router.js';
import { AboutPage } from '../../src/components/about/about-page.js';
import '../../src/components/ui/skip-link/skip-link.js';
import '../../src/components/layout/layout-header.js';
import { LayoutFooter } from '../../src/components/layout/layout-footer.js';
import '../../src/components/ui/search-dialog/search-dialog.js';
import '../../src/components/ui/card/card.js';
import { type ImageLoading } from '../../src/components/ui/image/image.js';
import '../../src/components/search/search-page.js';
import '../../src/components/tag/tag-page.js';
import '../../src/components/corpus/corpus-page.js';
import '../../src/components/ui/article-header/article-header.js';
import {
  ARTICLE_HEADER_TAGS_DATA_ATTRIBUTE,
  parseArticleHeaderTagsAdapterValue,
} from '../../src/components/ui/article-header/article-header-tags-adapter.js';
import '../../src/components/layout/layout-sidebar.js';
import '../../src/components/layout/layout-toc.js';
import '../../src/components/ui/callout/callout.js';
import '../../src/components/ui/checkbox/checkbox.js';
import '../../src/components/ui/code-preview/code-preview.js';
import '../../src/components/ui/preview-sandbox/preview-sandbox.js';
import {
  DOCUMENT_CSS as TABLE_DOCUMENT_CSS,
  DOCUMENT_STYLE_ID as TABLE_DOCUMENT_STYLE_ID,
} from '../../src/components/ui/table/table.js';
import '../../src/components/ui/table/table.js';
import '../../src/components/ui/blockquote/blockquote.js';
import '../../src/components/ui/details/details.js';
import '../../src/components/ui/divider/divider.js';
import '../../src/components/ui/footnote/footnote.js';
import '../../src/components/ui/image/image.js';
import '../../src/components/ui/info-box/info-box.js';
import '../../src/components/ui/score/score.js';
import {
  DOCUMENT_CSS as HIGHLIGHT_DOCUMENT_CSS,
  DOCUMENT_STYLE_ID as HIGHLIGHT_DOCUMENT_STYLE_ID,
} from '../../src/components/ui/highlight/highlight.js';
import '../../src/components/ui/highlight/highlight.js';
import '../../src/components/ui/tabs/tabs.js';
import '../../src/components/ui/translation/translation.js';
import { FOOTER_DOCUMENT_CSS, FOOTER_DOCUMENT_STYLE_ID } from '../../src/components/ui/footer/footer.js';
import {
  SSR_TARGET_TAGS,
  type SsrLightTargetTag,
  type SsrShadowTargetTag,
  type SsrTargetTag,
} from './targets.js';
import '../../src/components/not-found/not-found-page.js';
import { createRouterContentHtml } from '../../src/router/router-content-html.js';

export { SSR_TARGET_TAGS };

interface SsrAttribute {
  name: string;
  value: string;
}

const ARTICLE_HEADER_BRIDGED_ATTRIBUTE_NAMES = new Set([
  'heading',
  'published',
  'created',
  'updated',
  'reading-time',
  'status',
  'source',
  'license',
]);

export interface SsrDocumentStyleDefinition {
  id: string;
  cssText: string;
}

const DOCUMENT_STYLE_DEFINITIONS: Partial<Record<SsrTargetTag, SsrDocumentStyleDefinition>> = {
  'layout-footer': {
    id: FOOTER_DOCUMENT_STYLE_ID,
    cssText: FOOTER_DOCUMENT_CSS,
  },
  'ui-table': {
    id: TABLE_DOCUMENT_STYLE_ID,
    cssText: TABLE_DOCUMENT_CSS,
  },
  'ui-highlight': {
    id: HIGHLIGHT_DOCUMENT_STYLE_ID,
    cssText: HIGHLIGHT_DOCUMENT_CSS,
  },
};

const getAttributeValue = (attributes: readonly SsrAttribute[], name: string): string | undefined =>
  attributes.find((attribute) => attribute.name === name)?.value;

const parseBooleanLikeAttribute = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'on') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') {
    return false;
  }

  return defaultValue;
};

const parsePositiveIntegerAttribute = (value: string | undefined): number | undefined => {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const parseImageLoadingAttribute = (value: string | undefined): ImageLoading =>
  value === 'eager' ? 'eager' : 'lazy';

const parseMediaSourcesAttributeValue = (value: string | undefined): MediaSourceDescriptor[] =>
  parseMediaSourcesAttribute(value ?? null);

const renderImageShadowElement = async (
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): Promise<string> => {
  const src = getAttributeValue(attributes, 'src') ?? '';
  const srcset = getAttributeValue(attributes, 'srcset');
  const sizes = getAttributeValue(attributes, 'sizes');
  const placeholder = getAttributeValue(attributes, 'placeholder');
  const sources = parseMediaSourcesAttributeValue(getAttributeValue(attributes, 'sources'));
  const alt = getAttributeValue(attributes, 'alt') ?? '';
  const caption = getAttributeValue(attributes, 'caption');
  const loading = parseImageLoadingAttribute(getAttributeValue(attributes, 'loading'));
  const hasZoomableAttribute = attributes.some((attribute) => attribute.name === 'zoomable');
  const zoomable = parseBooleanLikeAttribute(getAttributeValue(attributes, 'zoomable'), true);
  const width = parsePositiveIntegerAttribute(getAttributeValue(attributes, 'width'));
  const height = parsePositiveIntegerAttribute(getAttributeValue(attributes, 'height'));
  const lightboxSrc = getAttributeValue(attributes, 'lightbox-src');
  const lightboxSrcset = getAttributeValue(attributes, 'lightbox-srcset');
  const lightboxSizes = getAttributeValue(attributes, 'lightbox-sizes');
  const lightboxSources = parseMediaSourcesAttributeValue(
    getAttributeValue(attributes, 'lightbox-sources'),
  );

  return await collectResult(
    renderThunked(html`
      <ui-image
        src=${src}
        srcset=${ifDefined(srcset)}
        sizes=${ifDefined(sizes)}
        placeholder=${ifDefined(placeholder)}
        .sources=${sources}
        alt=${alt}
        caption=${ifDefined(caption)}
        loading=${loading}
        zoomable=${ifDefined(hasZoomableAttribute ? String(zoomable) : undefined)}
        .zoomable=${zoomable}
        width=${ifDefined(width !== undefined ? String(width) : undefined)}
        .width=${width}
        height=${ifDefined(height !== undefined ? String(height) : undefined)}
        .height=${height}
        lightbox-src=${ifDefined(lightboxSrc)}
        lightbox-srcset=${ifDefined(lightboxSrcset)}
        lightbox-sizes=${ifDefined(lightboxSizes)}
        .lightboxSources=${lightboxSources}
        >${unsafeHTML(innerHtml)}</ui-image
      >
    `),
  );
};

const renderArticleHeaderShadowElement = async (
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): Promise<string> => {
  /* eslint-disable lit/binding-positions, lit/no-invalid-html */
  const staticTagName = unsafeStatic('ui-article-header');
  const passthroughAttributes = attributes.filter(
    (attribute) => !ARTICLE_HEADER_BRIDGED_ATTRIBUTE_NAMES.has(attribute.name),
  );
  const staticAttributes = unsafeStatic(serializeAttributes(passthroughAttributes));
  const heading = getAttributeValue(attributes, 'heading') ?? '';
  const published = getAttributeValue(attributes, 'published');
  const created = getAttributeValue(attributes, 'created');
  const updated = getAttributeValue(attributes, 'updated');
  const readingTime = getAttributeValue(attributes, 'reading-time');
  const status = getAttributeValue(attributes, 'status');
  const source = getAttributeValue(attributes, 'source');
  const license = getAttributeValue(attributes, 'license');
  const tags = parseArticleHeaderTagsAdapterValue(
    getAttributeValue(attributes, ARTICLE_HEADER_TAGS_DATA_ATTRIBUTE),
  );

  return await collectResult(
    renderThunked(html`
      <${staticTagName}
        ${staticAttributes}
        heading=${heading}
        published=${ifDefined(published)}
        created=${ifDefined(created)}
        updated=${ifDefined(updated)}
        reading-time=${ifDefined(readingTime)}
        status=${ifDefined(status)}
        source=${ifDefined(source)}
        license=${ifDefined(license)}
        .tags=${tags}
        >${unsafeHTML(innerHtml)}</${staticTagName}
      >
    `),
  );
  /* eslint-enable lit/binding-positions, lit/no-invalid-html */
};

const escapeAttributeValue = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const serializeAttributes = (attributes: readonly SsrAttribute[]): string =>
  attributes
    .map((attribute) => ` ${attribute.name}="${escapeAttributeValue(attribute.value)}"`)
    .join('');

const buildShadowTemplate = (
  tagName: SsrShadowTargetTag,
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): TemplateResult => {
  const staticTagName = unsafeStatic(tagName);
  const staticAttributes = unsafeStatic(serializeAttributes(attributes));

  // eslint-disable-next-line lit/binding-positions, lit/no-invalid-html
  return html`<${staticTagName}${staticAttributes}>${unsafeHTML(innerHtml)}</${staticTagName}>`;
};

const extractMainContent = (innerHtml: string): string => {
  const matched = /<main\b[^>]*>([\s\S]*)<\/main>/i.exec(innerHtml);
  return matched?.[1] ?? innerHtml;
};

const renderLightElement = async (
  tagName: SsrLightTargetTag,
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): Promise<string> => {
  const serializedAttributes = serializeAttributes(attributes);

  if (tagName === 'app-router') {
    const router = new AppRouter();
    router.serverContent = createRouterContentHtml(extractMainContent(innerHtml));
    const rendered = await collectResult(renderThunked(router.render()));
    return `<app-router${serializedAttributes}>${rendered}</app-router>`;
  }

  if (tagName === 'about-page') {
    const aboutPage = new AboutPage();
    const rendered = await collectResult(renderThunked(aboutPage.render()));
    return `<about-page${serializedAttributes}>${rendered}</about-page>`;
  }

  const footer = new LayoutFooter();
  for (const attribute of attributes) {
    if (attribute.name === 'footer-id') {
      footer.footerId = attribute.value;
    }
    if (attribute.name === 'site-name') {
      footer.siteName = attribute.value;
    }
    if (attribute.name === 'site-url') {
      footer.siteUrl = attribute.value;
    }
    if (attribute.name === 'copyright-text') {
      footer.copyrightText = attribute.value;
    }
    if (attribute.name === 'build-label') {
      footer.buildLabel = attribute.value;
    }
    if (attribute.name === 'nav-label') {
      footer.navLabel = attribute.value;
    }
    if (attribute.name === 'links-json') {
      footer.linksJson = attribute.value;
    }
  }

  const rendered = await collectResult(renderThunked(footer.render()));
  return `<layout-footer${serializedAttributes}>${rendered}</layout-footer>`;
};

export const renderCustomElement = async (
  tagName: SsrTargetTag,
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): Promise<string> => {
  if (tagName === 'app-router' || tagName === 'about-page' || tagName === 'layout-footer') {
    return renderLightElement(tagName, attributes, innerHtml);
  }

  if (tagName === 'ui-image') {
    return renderImageShadowElement(attributes, innerHtml);
  }

  if (tagName === 'ui-article-header') {
    return renderArticleHeaderShadowElement(attributes, innerHtml);
  }

  const rendered = await collectResult(
    renderThunked(buildShadowTemplate(tagName as SsrShadowTargetTag, attributes, innerHtml)),
  );
  return rendered;
};

export const collectDocumentStylesForTags = (
  tagNames: Iterable<string>,
): SsrDocumentStyleDefinition[] => {
  const uniqueDefinitions = new Map<string, SsrDocumentStyleDefinition>();

  for (const tagName of tagNames) {
    const definition = DOCUMENT_STYLE_DEFINITIONS[tagName as SsrTargetTag];
    if (!definition) {
      continue;
    }
    uniqueDefinitions.set(definition.id, definition);
  }

  return [...uniqueDefinitions.values()];
};
