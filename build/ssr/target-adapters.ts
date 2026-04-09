import { renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { TemplateResult } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';

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
import '../../src/components/ui/checkbox/checkbox.js';
import '../../src/components/ui/code-preview/code-preview.js';
import '../../src/components/ui/preview-sandbox/preview-sandbox.js';
import '../../src/components/ui/details/details.js';
import '../../src/components/ui/highlight/highlight.js';
import '../../src/components/ui/score/score.js';
import '../../src/components/ui/tabs/tabs.js';
import '../../src/components/ui/translation/translation.js';
import '../../src/components/not-found/not-found-page.js';

import {
  ARTICLE_HEADER_TAGS_DATA_ATTRIBUTE,
  parseArticleHeaderTagsAdapterValue,
} from '../../src/components/ui/article-header/article-header-tags-adapter.js';

import { getAttributeValue, serializeAttributes, type SsrAttribute } from './attributes.js';
import {
  getSsrComponentDefinition,
  SSR_COMPONENT_DEFINITIONS,
  type SsrComponentDefinition,
  type SsrDocumentStyleDefinition,
} from './target-definitions.js';
import { type SsrShadowTargetTag, type SsrTargetTag } from './targets.js';

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
  readonly render: (attributes: readonly SsrAttribute[], innerHtml: string) => Promise<string>;
}

const renderTemplateResult = async (template: TemplateResult): Promise<string> =>
  collectResult(renderThunked(template));

const assignDefined = <T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void => {
  if (value !== undefined) {
    target[key] = value;
  }
};

const createSsrTargetAdapterResult = (
  tag: SsrTargetTag,
  render: SsrTargetAdapter['render'],
  documentStyle: SsrDocumentStyleDefinition | undefined,
): SsrTargetAdapter =>
  documentStyle === undefined ? { tag, render } : { tag, render, documentStyle };

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
  const mainContent = extractMainContent(innerHtml);

  return `<app-router${serializeAttributes(attributes)}>
    <div data-app-router-announcement="" aria-live="polite" aria-atomic="true" class="sr-only"></div>
    <main id="main-content" tabindex="-1">${mainContent}</main>
  </app-router>`;
};

const renderLayoutFooterLightElement = async (
  attributes: readonly SsrAttribute[],
): Promise<string> => {
  const footer = new LayoutFooter();

  assignDefined(footer, 'footerId', getAttributeValue(attributes, 'footer-id'));
  assignDefined(footer, 'siteEyebrow', getAttributeValue(attributes, 'site-eyebrow'));
  assignDefined(footer, 'siteName', getAttributeValue(attributes, 'site-name'));
  assignDefined(footer, 'siteUrl', getAttributeValue(attributes, 'site-url'));
  assignDefined(footer, 'siteDescription', getAttributeValue(attributes, 'site-description'));
  assignDefined(footer, 'copyrightText', getAttributeValue(attributes, 'copyright-text'));
  assignDefined(footer, 'buildLabel', getAttributeValue(attributes, 'build-label'));
  assignDefined(footer, 'navLabel', getAttributeValue(attributes, 'nav-label'));
  assignDefined(footer, 'linksJson', getAttributeValue(attributes, 'links-json'));

  const rendered = await collectResult(renderThunked(footer.render()));
  return `<layout-footer${serializeAttributes(attributes)}>${rendered}</layout-footer>`;
};

const createSsrTargetAdapter = (definition: SsrComponentDefinition): SsrTargetAdapter | null => {
  const tag = definition.tag as SsrTargetTag;

  switch (definition.adapterKind) {
    case 'none':
      return null;

    case 'shadow-default': {
      const shadowTag = definition.tag as SsrShadowTargetTag;
      return createSsrTargetAdapterResult(
        tag,
        (attributes, innerHtml) =>
          renderTemplateResult(buildShadowTemplate(shadowTag, attributes, innerHtml)),
        definition.documentStyle,
      );
    }

    case 'shadow-article-header':
      return createSsrTargetAdapterResult(
        tag,
        renderArticleHeaderShadowElement,
        definition.documentStyle,
      );

    case 'light-app-router':
      return createSsrTargetAdapterResult(
        tag,
        renderAppRouterLightElement,
        definition.documentStyle,
      );

    case 'light-layout-footer':
      return createSsrTargetAdapterResult(
        tag,
        renderLayoutFooterLightElement,
        definition.documentStyle,
      );
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
