export const TOC_MOBILE_PANEL_SELECTOR = '[data-layout-toc-mobile-panel]';
export const TOC_MOBILE_PANEL_CSS_ARTIFACT_PATH = 'src/assets/css/layout-toc.css';

export const TOC_TRIGGER_RESERVED_ATTRIBUTE = 'toc-trigger-reserved';
export const TOC_TRIGGER_RESERVED_DATA_ATTRIBUTE = 'data-toc-trigger-reserved';
export const TOC_TRIGGER_INTERACTIVE_DATA_ATTRIBUTE = 'data-toc-trigger-interactive';

export const TOC_MOBILE_PANEL_DOM_CSS_CONTRACT = {
  panelSelector: TOC_MOBILE_PANEL_SELECTOR,
  cssArtifactPath: TOC_MOBILE_PANEL_CSS_ARTIFACT_PATH,
} as const;
