import { renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { TemplateResult } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';

import {
  parseMediaSourcesAttribute,
  type MediaSourceDescriptor,
} from '../media/image-resolver.js';

import { AppRouter } from '../../src/components/app/app-router.js';
import { AboutPage } from '../../src/components/about/about-page.js';
import { LayoutFooter } from '../../src/components/layout/layout-footer.js';

import '../../src/components/ui/icon/icon.js';
import '../../src/components/ui/tag/tag.js';
import '../../src/components/ui/skip-link/skip-link.js';
import '../../src/components/layout/layout-header.js';
import '../../src/components/ui/search-dialog/search-dialog.js';
import '../../src/components/ui/card/card.js';
import '../../src/components/search/search-page.js';
import '../../src/components/tag/tag-page.js';
import '../../src/components/corpus/corpus-page.js';
import '../../src/components/corpus/corpora-overview-page.js';
import '../../src/components/ui/article-header/article-header.js';
import '../../src/components/layout/layout-sidebar.js';
import '../../src/components/layout/layout-toc.js';
import '../../src/components/ui/callout/callout.js';
import '../../src/components/ui/checkbox/checkbox.js';
import '../../src/components/ui/code-preview/code-preview.js';
import '../../src/components/ui/preview-sandbox/preview-sandbox.js';
import '../../src/components/ui/table/table.js';
import '../../src/components/ui/blockquote/blockquote.js';
import '../../src/components/ui/details/details.js';
import '../../src/components/ui/divider/divider.js';
import '../../src/components/ui/highlight/highlight.js';
import '../../src/components/ui/image/image.js';
import '../../src/components/ui/info-box/info-box.js';
import '../../src/components/ui/score/score.js';
import '../../src/components/ui/tabs/tabs.js';
import '../../src/components/ui/translation/translation.js';
import '../../src/components/not-found/not-found-page.js';

import {
  ARTICLE_HEADER_TAGS_DATA_ATTRIBUTE,
  parseArticleHeaderTagsAdapterValue,
} from '../../src/components/ui/article-header/article-header-tags-adapter.js';
import { type ImageLoading } from '../../src/components/ui/image/image.js';
import { createRouterContentHtml } from '../../src/router/router-content-html.js';

import {
  getAttributeValue,
  parseBooleanLikeAttribute,
  parsePositiveIntegerAttribute,
  serializeAttributes,
  type SsrAttribute,
} from './attributes.js';
import {
  getSsrComponentDefinition,
  SSR_COMPONENT_DEFINITIONS,
  type SsrComponentDefinition,
  type SsrDocumentStyleDefinition,
} from './target-definitions.js';
import {
  type SsrShadowTargetTag,
  type SsrTargetTag,
} from './targets.js';

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

interface SsrTargetAdapter {
  readonly tag: SsrTargetTag;
  readonly documentStyle?: SsrDocumentStyleDefinition;
  readonly render: (
    attributes: readonly SsrAttribute[],
    innerHtml: string,
  ) => Promise<string>;
}

const renderTemplateResult = async (template: TemplateResult): Promise<string> =>
  collectResult(renderThunked(template));

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

  return renderTemplateResult(html`
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
  `);
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

  return renderTemplateResult(html`
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
  `);
  /* eslint-enable lit/binding-positions, lit/no-invalid-html */
};

const renderAppRouterLightElement = async (
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): Promise<string> => {
  const router = new AppRouter();
  router.serverContent = createRouterContentHtml(extractMainContent(innerHtml));

  const rendered = await collectResult(renderThunked(router.render()));
  return `<app-router${serializeAttributes(attributes)}>${rendered}</app-router>`;
};

const renderAboutPageLightElement = async (
  attributes: readonly SsrAttribute[],
): Promise<string> => {
  const aboutPage = new AboutPage();
  const rendered = await collectResult(renderThunked(aboutPage.render()));
  return `<about-page${serializeAttributes(attributes)}>${rendered}</about-page>`;
};

const renderLayoutFooterLightElement = async (
  attributes: readonly SsrAttribute[],
): Promise<string> => {
  const footer = new LayoutFooter();

  footer.footerId = getAttributeValue(attributes, 'footer-id');
  footer.siteEyebrow = getAttributeValue(attributes, 'site-eyebrow');
  footer.siteName = getAttributeValue(attributes, 'site-name');
  footer.siteUrl = getAttributeValue(attributes, 'site-url');
  footer.siteDescription = getAttributeValue(attributes, 'site-description');
  footer.copyrightText = getAttributeValue(attributes, 'copyright-text');
  footer.buildLabel = getAttributeValue(attributes, 'build-label');
  footer.navLabel = getAttributeValue(attributes, 'nav-label');
  footer.linksJson = getAttributeValue(attributes, 'links-json');

  const rendered = await collectResult(renderThunked(footer.render()));
  return `<layout-footer${serializeAttributes(attributes)}>${rendered}</layout-footer>`;
};

const createSsrTargetAdapter = (definition: SsrComponentDefinition): SsrTargetAdapter | null => {
  switch (definition.adapterKind) {
    case 'none':
      return null;

    case 'shadow-default':
      return {
        tag: definition.tag as SsrTargetTag,
        documentStyle: definition.documentStyle,
        render: (attributes, innerHtml) =>
          renderTemplateResult(
            buildShadowTemplate(definition.tag as SsrShadowTargetTag, attributes, innerHtml),
          ),
      };

    case 'shadow-article-header':
      return {
        tag: definition.tag as SsrTargetTag,
        documentStyle: definition.documentStyle,
        render: renderArticleHeaderShadowElement,
      };

    case 'shadow-image':
      return {
        tag: definition.tag as SsrTargetTag,
        documentStyle: definition.documentStyle,
        render: renderImageShadowElement,
      };

    case 'light-app-router':
      return {
        tag: definition.tag as SsrTargetTag,
        documentStyle: definition.documentStyle,
        render: renderAppRouterLightElement,
      };

    case 'light-about-page':
      return {
        tag: definition.tag as SsrTargetTag,
        documentStyle: definition.documentStyle,
        render: renderAboutPageLightElement,
      };

    case 'light-layout-footer':
      return {
        tag: definition.tag as SsrTargetTag,
        documentStyle: definition.documentStyle,
        render: renderLayoutFooterLightElement,
      };
  }
};

const SSR_TARGET_ADAPTERS = Object.fromEntries(
  SSR_COMPONENT_DEFINITIONS.flatMap((definition) => {
    const adapter = createSsrTargetAdapter(definition);
    return adapter ? [[definition.tag, adapter]] : [];
  }),
) as Record<SsrTargetTag, SsrTargetAdapter>;

export const renderSsrTarget = async (
  tagName: SsrTargetTag,
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): Promise<string> => SSR_TARGET_ADAPTERS[tagName].render(attributes, innerHtml);

export const collectSsrDocumentStyles = (
  tagNames: Iterable<string>,
): SsrDocumentStyleDefinition[] => {
  const uniqueDefinitions = new Map<string, SsrDocumentStyleDefinition>();

  for (const tagName of tagNames) {
    const definition = getSsrComponentDefinition(tagName);
    if (!definition?.documentStyle) {
      continue;
    }

    uniqueDefinitions.set(definition.documentStyle.id, definition.documentStyle);
  }

  return [...uniqueDefinitions.values()];
};