import { renderThunked } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { TemplateResult } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';

import '../../src/components/ui/skip-link/skip-link.js';
import '../../src/components/layout/layout-header.js';
import '../../src/components/layout/layout-sidebar.js';
import '../../src/components/layout/layout-toc.js';
import '../../src/components/ui/code-preview/code-preview.js';
import '../../src/components/ui/preview-sandbox/preview-sandbox.js';
import '../../src/components/ui/tabs/tabs.js';
import '../../src/components/ui/translation/translation.js';

import { serializeAttributes, type SsrAttribute } from './attributes.js';
import {
  getSsrComponentDefinition,
  SSR_COMPONENT_DEFINITIONS,
  type SsrComponentDefinition,
  type SsrDocumentStyleDefinition,
} from './target-definitions.js';
import { normalizeAppRouterLightDom } from './app-router-light-dom-normalizer.js';
import { type SsrShadowTargetTag, type SsrTargetTag } from './targets.js';

interface SsrTargetAdapter {
  readonly tag: SsrTargetTag;
  readonly documentStyle?: SsrDocumentStyleDefinition;
  readonly render: (attributes: readonly SsrAttribute[], innerHtml: string) => Promise<string>;
}

const renderTemplateResult = async (template: TemplateResult): Promise<string> =>
  collectResult(renderThunked(template));

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

const renderAppRouterLightElement = async (
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): Promise<string> => {
  const renderedInnerHtml = normalizeAppRouterLightDom(innerHtml);

  return `<app-router${serializeAttributes(attributes)}>
    ${renderedInnerHtml}
  </app-router>`;
};

const renderLightHostPassthroughElement = async (
  tagName: string,
  attributes: readonly SsrAttribute[],
  innerHtml: string,
): Promise<string> => {
  return `<${tagName}${serializeAttributes(attributes)}>${innerHtml}</${tagName}>`;
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

    case 'light-host-passthrough':
      return createSsrTargetAdapterResult(
        tag,
        (attributes, innerHtml) => renderLightHostPassthroughElement(tag, attributes, innerHtml),
        definition.documentStyle,
      );

    case 'light-app-router':
      return createSsrTargetAdapterResult(
        tag,
        renderAppRouterLightElement,
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
): Promise<string> => {
  const adapter = SSR_TARGET_ADAPTERS[tagName];
  if (!adapter) {
    throw new Error(`Unknown SSR target: ${tagName}`);
  }

  return adapter.render(attributes, innerHtml);
};

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
