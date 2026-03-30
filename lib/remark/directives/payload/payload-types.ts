export type CalloutKind = 'note' | 'tip' | 'success' | 'warning' | 'danger';
export type DetailsVariant = 'default' | 'bordered';
export type InfoBoxVariant = 'default' | 'filled';
export type InfoBoxDensity = 'comfortable' | 'compact';
export type ScoreLoading = 'lazy' | 'eager';
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

export interface CalloutPayload {
  readonly kind: 'callout';
  readonly calloutKind: CalloutKind;
  readonly heading?: string;
  readonly label?: string;
  readonly icon?: string;
  readonly headingLevel?: number;
}

export interface CodeGroupPayload {
  readonly kind: 'code-group';
  readonly ariaLabel?: string;
}

export interface CodePreviewPayload {
  readonly kind: 'code-preview';
  readonly heading?: string;
  readonly controls?: readonly PreviewControl[];
  readonly previewPadding?: PreviewPadding;
  readonly previewAlign?: PreviewAlign;
  readonly previewTheme?: PreviewTheme;
  readonly previewSurface?: PreviewSurface;
  readonly previewViewport?: PreviewViewport;
}

export interface PreviewSlotPayload {
  readonly kind: 'preview';
}

export interface ToolbarSlotPayload {
  readonly kind: 'toolbar';
}

export interface PreviewSandboxPayload {
  readonly kind: 'preview-sandbox';
  readonly iframeTitle?: string;
  readonly baseUrl?: string;
  readonly allowJs: boolean;
  readonly activationPolicy?: PreviewSandboxActivationPolicy;
  readonly heightMode?: PreviewSandboxHeightMode;
  readonly allowForms: boolean;
  readonly allowDownloads: boolean;
  readonly allowPointerLock: boolean;
  readonly allowPopups: boolean;
  readonly height?: number;
  readonly maxHeight?: number;
}

export interface DetailsPayload {
  readonly kind: 'details';
  readonly summary?: string;
  readonly ariaLabel?: string;
  readonly open: boolean;
  readonly variant?: DetailsVariant;
  readonly region: boolean;
}

export interface InfoBoxPayload {
  readonly kind: 'info-box';
  readonly heading?: string;
  readonly icon?: string;
  readonly headingLevel?: number;
  readonly landmark: boolean;
  readonly variant?: InfoBoxVariant;
  readonly density?: InfoBoxDensity;
}

export interface LinkCardPayload {
  readonly kind: 'link-card';
  readonly url?: string;
  readonly title?: string;
  readonly description?: string;
  readonly image?: string;
  readonly siteName?: string;
}

export interface ScorePayload {
  readonly kind: 'score';
  readonly src?: string;
  readonly caption?: string;
  readonly label?: string;
  readonly description?: string;
  readonly aspectRatio?: string;
  readonly loading?: ScoreLoading;
  readonly primary: boolean;
}

export interface TabsPayload {
  readonly kind: 'tabs';
  readonly selectedValue?: string;
  readonly defaultSelectedValue?: string;
  readonly orientation?: TabsOrientation;
  readonly automaticActivation: boolean;
  readonly urlSync: boolean;
}

export interface TabPayload {
  readonly kind: 'tab';
  readonly value?: string;
}

export interface PanelPayload {
  readonly kind: 'panel';
}

export interface TranslationPayload {
  readonly kind: 'translation';
  readonly lang?: string;
  readonly targetLang?: string;
  readonly original: string;
  readonly translated: string;
}

export interface TranslationOverlayPayload {
  readonly kind: 'translation-overlay';
  readonly lang?: string;
  readonly targetLang?: string;
  readonly original: string;
  readonly translated: string;
  readonly surface: TranslationOverlaySurface;
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
  | TabsPayload
  | TabPayload
  | PanelPayload
  | TranslationPayload
  | TranslationOverlayPayload;

export interface CodeBlockPayload {
  readonly filename?: string;
  readonly label?: string;
  readonly intent?: CodeBlockIntent;
  readonly showLineNumbers: boolean;
  readonly copyMode?: CodeBlockCopyMode;
  readonly groupKey?: string;
  readonly tabLabel?: string;
  readonly copyLabel?: string;
  readonly copyable: boolean | undefined;
  readonly wrap: boolean;
  readonly highlightLines?: string;
  readonly layout?: CodeBlockLayout;
  readonly rawMeta?: string;
}

export interface ImagePayload {
  readonly loading?: 'lazy' | 'eager';
  readonly width?: number;
  readonly height?: number;
  readonly zoomable?: boolean;
}
