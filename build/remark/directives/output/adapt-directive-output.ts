import type { RemarkOutputBinding } from './output-binding-types.js';
import type {
  CalloutPayload,
  CodeGroupPayload,
  CodePreviewPayload,
  DetailsPayload,
  DirectivePayload,
  InfoBoxPayload,
  LinkCardPayload,
  PreviewSandboxPayload,
  ScorePayload,
  TabPayload,
  TabsPayload,
  TranslationOverlayPayload,
  TranslationPayload,
} from '../payload/payload-types.js';
import type { MdastNode } from '../types.js';

const toOptionalProps = (entries: [string, unknown][]): Record<string, unknown> =>
  Object.fromEntries(entries.filter(([, value]) => value !== undefined));

const createTranslationParagraph = (
  text: string,
  className: string,
  lang: string | undefined,
): MdastNode => ({
  type: 'paragraph',
  data: {
    hProperties: {
      className: [className],
      ...(lang ? { lang } : {}),
    },
  },
  children: [{ type: 'text', value: text }],
});

const adaptCalloutOutput = (payload: CalloutPayload): RemarkOutputBinding => ({
  hName: 'ui-callout',
  hProperties: toOptionalProps([
    ['kind', payload.calloutKind],
    ['heading', payload.heading],
    ['label', payload.label],
    ['icon', payload.icon],
    ['heading-level', typeof payload.headingLevel === 'number' ? String(payload.headingLevel) : undefined],
  ]),
});

const adaptCodeGroupOutput = (payload: CodeGroupPayload): RemarkOutputBinding => ({
  hName: 'ui-code-group',
  hProperties: toOptionalProps([['aria-label', payload.ariaLabel]]),
});

const adaptCodePreviewOutput = (payload: CodePreviewPayload): RemarkOutputBinding => ({
  hName: 'ui-code-preview',
  hProperties: toOptionalProps([
    ['heading', payload.heading],
    ['controls', payload.controls?.join(' ')],
    ['preview-padding', payload.previewPadding],
    ['preview-align', payload.previewAlign],
    ['preview-theme', payload.previewTheme],
    ['preview-surface', payload.previewSurface],
    ['preview-viewport', payload.previewViewport],
  ]),
});

const adaptPreviewSandboxOutput = (payload: PreviewSandboxPayload): RemarkOutputBinding => ({
  hName: 'ui-preview-sandbox',
  hProperties: toOptionalProps([
    ['slot', 'preview'],
    ['iframe-title', payload.iframeTitle],
    ['base-url', payload.baseUrl],
    ['allow-js', payload.allowJs ? true : undefined],
    ['activation-policy', payload.activationPolicy],
    ['height-mode', payload.heightMode],
    ['allow-forms', payload.allowForms ? true : undefined],
    ['allow-downloads', payload.allowDownloads ? true : undefined],
    ['allow-pointer-lock', payload.allowPointerLock ? true : undefined],
    ['allow-popups', payload.allowPopups ? true : undefined],
    ['height', typeof payload.height === 'number' ? String(payload.height) : undefined],
    ['max-height', typeof payload.maxHeight === 'number' ? String(payload.maxHeight) : undefined],
  ]),
});

const adaptSlotOutput = (slotName: 'preview' | 'toolbar' | 'tab' | 'panel', extraValue?: string): RemarkOutputBinding => ({
  hName: 'div',
  hProperties: toOptionalProps([
    ['slot', slotName],
    ['value', extraValue],
  ]),
});

const adaptDetailsOutput = (payload: DetailsPayload): RemarkOutputBinding => ({
  hName: 'ui-details',
  hProperties: toOptionalProps([
    ['summary', payload.summary],
    ['aria-label', payload.ariaLabel],
    ['open', payload.open ? true : undefined],
    ['variant', payload.variant],
    ['region', payload.region ? true : undefined],
  ]),
});

const adaptInfoBoxOutput = (payload: InfoBoxPayload): RemarkOutputBinding => ({
  hName: 'ui-info-box',
  hProperties: toOptionalProps([
    ['heading', payload.heading],
    ['icon', payload.icon],
    ['heading-level', typeof payload.headingLevel === 'number' ? String(payload.headingLevel) : undefined],
    ['landmark', payload.landmark ? true : undefined],
    ['variant', payload.variant],
    ['density', payload.density],
  ]),
});

const adaptLinkCardOutput = (payload: LinkCardPayload): RemarkOutputBinding => ({
  hName: 'ui-card',
  hProperties: toOptionalProps([
    ['url', payload.url],
    ['title', payload.title],
    ['description', payload.description],
    ['image', payload.image],
    ['site-name', payload.siteName],
  ]),
});

const adaptScoreOutput = (payload: ScorePayload): RemarkOutputBinding => ({
  hName: 'ui-score',
  hProperties: toOptionalProps([
    ['src', payload.src],
    ['caption', payload.caption],
    ['label', payload.label],
    ['description', payload.description],
    ['aspect-ratio', payload.aspectRatio],
    ['loading', payload.loading],
    ['primary', payload.primary ? true : undefined],
  ]),
});

const adaptTabsOutput = (payload: TabsPayload): RemarkOutputBinding => ({
  hName: 'ui-tabs',
  hProperties: toOptionalProps([
    ['selected-value', payload.selectedValue],
    ['default-selected-value', payload.defaultSelectedValue],
    ['orientation', payload.orientation],
    ['automatic-activation', payload.automaticActivation ? true : undefined],
    ['url-sync', payload.urlSync ? true : undefined],
  ]),
});

const adaptTranslationOutput = (payload: TranslationPayload): RemarkOutputBinding => ({
  hName: 'div',
  hProperties: {
    className: ['translation-static'],
    'data-translation-kind': 'static',
  },
  children: [
    createTranslationParagraph(payload.original, 'translation-original', payload.lang),
    createTranslationParagraph(payload.translated, 'translation-translated', payload.targetLang),
  ],
});

const adaptTranslationOverlayOutput = (payload: TranslationOverlayPayload): RemarkOutputBinding => ({
  hName: 'ui-translation',
  hProperties: toOptionalProps([
    ['lang', payload.lang],
    ['target-lang', payload.targetLang],
    ['original', payload.original],
    ['translated', payload.translated],
    ['surface', payload.surface],
  ]),
  children: [],
});

export const adaptDirectiveOutput = (payload: DirectivePayload): RemarkOutputBinding => {
  switch (payload.kind) {
    case 'callout':
      return adaptCalloutOutput(payload);
    case 'code-group':
      return adaptCodeGroupOutput(payload);
    case 'code-preview':
      return adaptCodePreviewOutput(payload);
    case 'preview-sandbox':
      return adaptPreviewSandboxOutput(payload);
    case 'preview':
      return adaptSlotOutput('preview');
    case 'toolbar':
      return adaptSlotOutput('toolbar');
    case 'details':
      return adaptDetailsOutput(payload);
    case 'info-box':
      return adaptInfoBoxOutput(payload);
    case 'link-card':
      return adaptLinkCardOutput(payload);
    case 'score':
      return adaptScoreOutput(payload);
    case 'tabs':
      return adaptTabsOutput(payload);
    case 'tab':
      return adaptSlotOutput('tab', (payload as TabPayload).value);
    case 'panel':
      return adaptSlotOutput('panel');
    case 'translation':
      return adaptTranslationOutput(payload);
    case 'translation-overlay':
      return adaptTranslationOverlayOutput(payload);
    default:
      return { hName: 'div' };
  }
};
