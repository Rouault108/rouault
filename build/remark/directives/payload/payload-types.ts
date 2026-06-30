import type { MdastNode } from '../types.js';

export type CalloutKind = 'note' | 'tip' | 'success' | 'warning' | 'danger';
export type InfoBoxVariant = 'default' | 'filled';
export type InfoBoxDensity = 'comfortable' | 'compact';
export type TabsOrientation = 'horizontal' | 'vertical';
export type PreviewPadding = 'normal' | 'compact' | 'none';
export type PreviewAlign = 'center' | 'start' | 'stretch';
export type PreviewTheme = 'page' | 'light' | 'dark';
export type PreviewSurface = 'surface' | 'canvas' | 'muted';
export type PreviewViewport = 'full' | 'tablet' | 'mobile';
export type PreviewControl = 'theme' | 'surface' | 'viewport';
export type PreviewSandboxActivationPolicy = 'eager' | 'visible' | 'manual';
export type PreviewSandboxHeightMode = 'fixed' | 'auto' | 'bounded-auto';
export type TranslationOverlaySurface = 'popover' | 'drawer';
export type CodeBlockIntent = 'neutral' | 'valid' | 'invalid';
export type CodeBlockCopyMode = 'auto' | 'always' | 'hidden';
export type CodeBlockLayout = 'standalone' | 'inline';
export type TableColumnWidth = 'auto' | 'fit' | 'narrow' | 'medium' | 'wide' | 'numeric';

export interface CalloutPayload {
  readonly kind: 'callout';
  readonly calloutKind: CalloutKind;
  readonly heading?: string | undefined;
  readonly label?: string | undefined;
  readonly icon?: string | undefined;
  readonly headingLevel?: number | undefined;
}

export interface CodeGroupPayload {
  readonly kind: 'code-group';
  readonly ariaLabel?: string | undefined;
  readonly syncScope?: string | undefined;
}

export interface CodePreviewPayload {
  readonly kind: 'code-preview';
  readonly heading?: string | undefined;
  readonly controls?: readonly PreviewControl[] | undefined;
  readonly previewPadding?: PreviewPadding | undefined;
  readonly previewAlign?: PreviewAlign | undefined;
  readonly previewTheme?: PreviewTheme | undefined;
  readonly previewSurface?: PreviewSurface | undefined;
  readonly previewViewport?: PreviewViewport | undefined;
}

export interface PreviewSlotPayload {
  readonly kind: 'preview';
}

export interface ToolbarSlotPayload {
  readonly kind: 'toolbar';
}

export interface PreviewSandboxPayload {
  readonly kind: 'preview-sandbox';
  readonly iframeTitle?: string | undefined;
  readonly baseUrl?: string | undefined;
  readonly allowJs: boolean;
  readonly activationPolicy?: PreviewSandboxActivationPolicy | undefined;
  readonly heightMode?: PreviewSandboxHeightMode | undefined;
  readonly allowForms: boolean;
  readonly allowDownloads: boolean;
  readonly allowPointerLock: boolean;
  readonly allowPopups: boolean;
  readonly height?: number | undefined;
  readonly maxHeight?: number | undefined;
}

export interface DetailsPayload {
  readonly kind: 'details';
  readonly summary: string;
  readonly open: boolean;
}

export interface InfoBoxPayload {
  readonly kind: 'info-box';
  readonly heading?: string | undefined;
  readonly icon?: string | undefined;
  readonly headingLevel?: number | undefined;
  readonly landmark: boolean;
  readonly variant?: InfoBoxVariant | undefined;
  readonly density?: InfoBoxDensity | undefined;
}

export interface LinkCardPayload {
  readonly kind: 'link-card';
  readonly url?: string | undefined;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly image?: string | undefined;
  readonly siteName?: string | undefined;
}

export interface ScorePayload {
  readonly kind: 'score';
  readonly src: string;
  readonly captionChildren?: readonly MdastNode[] | undefined;
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly aspectRatio?: string | undefined;
  readonly primary: boolean;
}

export interface TablePayload {
  readonly kind: 'table';
  readonly columnWidths?: readonly TableColumnWidth[] | undefined;
}

export interface TabsPayload {
  readonly kind: 'tabs';
  readonly selectedValue?: string | undefined;
  readonly defaultSelectedValue?: string | undefined;
  readonly orientation?: TabsOrientation | undefined;
  readonly automaticActivation: boolean;
  readonly urlSync: boolean;
}

export interface TabPayload {
  readonly kind: 'tab';
  readonly value?: string | undefined;
}

export interface PanelPayload {
  readonly kind: 'panel';
}

export interface TranslationPayload {
  readonly kind: 'translation';
  readonly lang?: string | undefined;
  readonly targetLang?: string | undefined;
  readonly original: string;
  readonly translated: string;
}

export interface TranslationOverlayPayload {
  readonly kind: 'translation-overlay';
  readonly lang?: string | undefined;
  readonly targetLang?: string | undefined;
  readonly original: string;
  readonly translated: string;
  readonly surface: TranslationOverlaySurface;
}

export interface SyntaxCardPayload {
  readonly kind: 'syntax-card';
  readonly cardKind?: string | undefined;
  readonly name: string;
  readonly lang?: string | undefined;
  readonly headingLevel?: number | undefined;
}

export interface SyntaxSectionPayload {
  readonly kind: 'syntax-section';
  readonly label: string;
}

export interface SyntaxFieldsPayload {
  readonly kind: 'syntax-fields';
}

export interface SyntaxFieldPayload {
  readonly kind: 'syntax-field';
  readonly name: string;
  readonly type?: string | undefined;
  readonly required: boolean;
  readonly defaultValue?: string | undefined;
}

export type DirectivePayload =
  | CalloutPayload
  | CodeGroupPayload
  | CodePreviewPayload
  | PreviewSlotPayload
  | ToolbarSlotPayload
  | PreviewSandboxPayload
  | DetailsPayload
  | InfoBoxPayload
  | LinkCardPayload
  | ScorePayload
  | TablePayload
  | TabsPayload
  | TabPayload
  | PanelPayload
  | TranslationPayload
  | TranslationOverlayPayload
  | SyntaxCardPayload
  | SyntaxSectionPayload
  | SyntaxFieldsPayload
  | SyntaxFieldPayload;

export interface CodeBlockPayload {
  readonly filename?: string | undefined;
  readonly label?: string | undefined;
  readonly intent?: CodeBlockIntent | undefined;
  readonly showLineNumbers: boolean;
  readonly copyMode?: CodeBlockCopyMode | undefined;
  readonly groupKey?: string | undefined;
  readonly tabLabel?: string | undefined;
  readonly copyLabel?: string | undefined;
  readonly copyable: boolean | undefined;
  readonly wrap: boolean;
  readonly highlightLines?: string | undefined;
  readonly layout?: CodeBlockLayout | undefined;
  readonly rawMeta?: string | undefined;
}

export interface ImagePayload {
  readonly loading?: 'lazy' | 'eager' | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly zoomable?: boolean | undefined;
}
