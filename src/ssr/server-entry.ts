import { renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { html, unsafeStatic } from 'lit/static-html.js';
import type { TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { AppRouter } from '../components/app/app-router.js';
import { AboutPage } from '../components/about/about-page.js';
import '../components/ui/skip-link/skip-link.js';
import '../components/layout/layout-header.js';
import { LayoutFooter } from '../components/layout/layout-footer.js';
import '../components/ui/search-dialog/search-dialog.js';
import '../components/ui/card/card.js';
import { type ImageLoading } from '../components/ui/image/image.js';
import '../components/search/search-page.js';
import '../components/tag/tag-page.js';
import '../components/ui/article-header/article-header.js';
import '../components/layout/layout-sidebar.js';
import '../components/layout/layout-toc.js';
import '../components/ui/callout/callout.js';
import '../components/ui/checkbox/checkbox.js';
import '../components/ui/code-group/code-group.js';
import '../components/ui/code-preview/code-preview.js';
import '../components/ui/preview-sandbox/preview-sandbox.js';
import {
  DOCUMENT_CSS as TABLE_DOCUMENT_CSS,
  DOCUMENT_STYLE_ID as TABLE_DOCUMENT_STYLE_ID,
} from '../components/ui/table/table.js';
import '../components/ui/table/table.js';
import {
  DOCUMENT_CSS as CODE_BLOCK_DOCUMENT_CSS,
  DOCUMENT_STYLE_ID as CODE_BLOCK_DOCUMENT_STYLE_ID,
} from '../components/ui/codeblock/codeblock.js';
import '../components/ui/codeblock/codeblock.js';
import '../components/ui/blockquote/blockquote.js';
import '../components/ui/details/details.js';
import '../components/ui/divider/divider.js';
import '../components/ui/footnote/footnote.js';
import '../components/ui/image/image.js';
import '../components/ui/info-box/info-box.js';
import '../components/ui/score/score.js';
import {
  DOCUMENT_CSS as HIGHLIGHT_DOCUMENT_CSS,
  DOCUMENT_STYLE_ID as HIGHLIGHT_DOCUMENT_STYLE_ID,
} from '../components/ui/highlight/highlight.js';
import '../components/ui/highlight/highlight.js';
import '../components/ui/tabs/tabs.js';
import '../components/ui/translation/translation.js';
import { FOOTER_DOCUMENT_CSS, FOOTER_DOCUMENT_STYLE_ID } from '../components/ui/footer/footer.js';
import {
  SSR_TARGET_TAGS,
  type SsrLightTargetTag,
  type SsrShadowTargetTag,
  type SsrTargetTag,
} from './targets.js';
import '../components/not-found/not-found-page.js';

export { SSR_TARGET_TAGS };

interface SsrAttribute {
  name: string;
  value: string;
}

export interface SsrDocumentStyleDefinition {
  id: string;
  cssText: string;
}

const LIGHT_TARGET_TAGS = new Set<SsrLightTargetTag>(['app-router', 'about-page', 'layout-footer']);

const DOCUMENT_STYLE_DEFINITIONS: Partial<Record<SsrTargetTag, SsrDocumentStyleDefinition>> = {
  'layout-footer': {
    id: FOOTER_DOCUMENT_STYLE_ID,
    cssText: FOOTER_DOCUMENT_CSS,
  },
  'ui-table': {
    id: TABLE_DOCUMENT_STYLE_ID,
    cssText: TABLE_DOCUMENT_CSS,
  },
  'ui-code-block': {
    id: CODE_BLOCK_DOCUMENT_STYLE_ID,
    cssText: CODE_BLOCK_DOCUMENT_CSS,
  },
  'ui-highlight': {
    id: HIGHLIGHT_DOCUMENT_STYLE_ID,
    cssText: HIGHLIGHT_DOCUMENT_CSS,
  },
  'ui-search-highlight': {
    id: HIGHLIGHT_DOCUMENT_STYLE_ID,
    cssText: HIGHLIGHT_DOCUMENT_CSS,
  },
};

const getAttributeValue = (
  attributes: readonly SsrAttribute[],
  name: string,
): string | undefined => attributes.find((attribute) => attribute.name === name)?.value;

const parseBooleanLikeAttribute = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'on') {
    return true;
  }
  if (
    normalized === 'false' ||
    normalized === '0' ||
    normalized === 'off' ||
    normalized === 'no'
  ) {
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

const renderImageShadowElement = async (
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): Promise<string> => {
  const src = getAttributeValue(attributes, 'src') ?? '';
  const alt = getAttributeValue(attributes, 'alt') ?? '';
  const caption = getAttributeValue(attributes, 'caption');
  const loading = parseImageLoadingAttribute(getAttributeValue(attributes, 'loading'));
  const hasZoomableAttribute = attributes.some((attribute) => attribute.name === 'zoomable');
  const zoomable = parseBooleanLikeAttribute(getAttributeValue(attributes, 'zoomable'), true);
  const width = parsePositiveIntegerAttribute(getAttributeValue(attributes, 'width'));
  const height = parsePositiveIntegerAttribute(getAttributeValue(attributes, 'height'));

  return await collectResult(renderThunked(html`
    <ui-image
      src=${src}
      alt=${alt}
      caption=${ifDefined(caption)}
      loading=${loading}
      zoomable=${ifDefined(hasZoomableAttribute ? String(zoomable) : undefined)}
      .zoomable=${zoomable}
      width=${ifDefined(width !== undefined ? String(width) : undefined)}
      .width=${width}
      height=${ifDefined(height !== undefined ? String(height) : undefined)}
      .height=${height}
    >${unsafeHTML(innerHtml)}</ui-image>
  `));
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
    router.serverContent = extractMainContent(innerHtml);
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
    if (attribute.name === 'revision') {
      footer.revision = attribute.value;
    }
    if (attribute.name === 'year') {
      const parsed = Number.parseInt(attribute.value, 10);
      if (Number.isFinite(parsed)) {
        footer.year = parsed;
      }
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
  if (LIGHT_TARGET_TAGS.has(tagName as SsrLightTargetTag)) {
    return renderLightElement(tagName as SsrLightTargetTag, attributes, innerHtml);
  }

  if (tagName === 'ui-image') {
    return renderImageShadowElement(attributes, innerHtml);
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
