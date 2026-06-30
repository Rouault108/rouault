import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

type PreviewPayloadKind = 'html' | 'css' | 'js';
type ActivationPolicy = 'eager' | 'visible' | 'manual';
type HeightMode = 'fixed' | 'auto' | 'bounded-auto';

interface PreviewPayload {
  readonly html: string;
  readonly css: string;
  readonly js: string;
}

interface PreviewSandboxResizeMessage {
  readonly source: 'ui-preview-sandbox';
  readonly token: string;
  readonly height: number;
}

interface PayloadCollectionResult {
  readonly payload: PreviewPayload;
  readonly warnings: string[];
}

const DEFAULT_HEIGHT = 160;
const DEFAULT_IFRAME_TITLE = 'プレビュー sandbox';
const LINK_URL_ATTRIBUTE_NAMES = new Set(['href', 'xlink:href']);
const RESOURCE_URL_ATTRIBUTE_NAMES = new Set(['src', 'poster']);
const FORM_URL_ATTRIBUTE_NAMES = new Set(['action', 'formaction']);
const URL_ATTRIBUTE_NAMES = new Set([
  ...LINK_URL_ATTRIBUTE_NAMES,
  ...RESOURCE_URL_ATTRIBUTE_NAMES,
  ...FORM_URL_ATTRIBUTE_NAMES,
]);
const DANGEROUS_ELEMENT_SELECTORS = 'script, iframe, object, embed, base';
const VALID_PAYLOAD_KINDS = new Set<PreviewPayloadKind>(['html', 'css', 'js']);
const VALID_ACTIVATION_POLICIES = new Set<ActivationPolicy>(['eager', 'visible', 'manual']);
const VALID_HEIGHT_MODES = new Set<HeightMode>(['fixed', 'auto', 'bounded-auto']);

let previewSandboxUid = 0;

const removeControlCharacters = (value: string): string => {
  let result = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    if ((code >= 0x20 && code !== 0x7f) || char === '\t') {
      result += char;
    }
  }
  return result;
};

const normalizeLineBreaks = (value: string): string => value.replace(/\r\n?/g, '\n');

const escapeStyleText = (value: string): string => value.replace(/<\/style/gi, '<\\/style');
const escapeScriptText = (value: string): string => value.replace(/<\/script/gi, '<\\/script');
const escapeHtmlAttribute = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const normalizePositiveNumber = (value: unknown, fallback: number): number => {
  const normalized = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return fallback;
  }
  return Math.ceil(normalized);
};

const normalizeOptionalPositiveNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const normalized = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return undefined;
  }
  return Math.ceil(normalized);
};

const normalizeActivationPolicy = (value: string): ActivationPolicy =>
  VALID_ACTIVATION_POLICIES.has(value as ActivationPolicy)
    ? (value as ActivationPolicy)
    : 'visible';

const normalizeHeightMode = (value: string): HeightMode =>
  VALID_HEIGHT_MODES.has(value as HeightMode) ? (value as HeightMode) : 'auto';

const isAllowedProtocolForAttribute = (attributeName: string, protocol: string): boolean => {
  if (LINK_URL_ATTRIBUTE_NAMES.has(attributeName)) {
    return (
      protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:'
    );
  }

  if (RESOURCE_URL_ATTRIBUTE_NAMES.has(attributeName)) {
    return protocol === 'http:' || protocol === 'https:';
  }

  if (FORM_URL_ATTRIBUTE_NAMES.has(attributeName)) {
    return protocol === 'http:' || protocol === 'https:';
  }

  return false;
};

const isSafeUrlValue = (attributeName: string, value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return true;
  }

  const normalized = removeControlCharacters(trimmed);
  const compact = normalized.replace(/\s+/g, '').toLowerCase();
  if (
    compact.startsWith('javascript:') ||
    compact.startsWith('vbscript:') ||
    compact.startsWith('data:')
  ) {
    return false;
  }

  const schemeMatch = /^[a-zA-Z][a-zA-Z\d+.-]*:/.exec(normalized);
  if (!schemeMatch) {
    return true;
  }

  try {
    const parsed = new URL(normalized);
    return isAllowedProtocolForAttribute(attributeName, parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
};

const createBootstrapScript = (token: string): string => `
(() => {
  const postHeight = () => {
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
      document.documentElement.offsetHeight,
      document.body ? document.body.offsetHeight : 0
    );
    parent.postMessage({ source: 'ui-preview-sandbox', token: ${JSON.stringify(token)}, height }, '*');
  };

  let scheduled = false;
  const requestPost = () => {
    if (scheduled) {
      return;
    }
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      postHeight();
    });
  };

  if (document.fonts && typeof document.fonts.ready?.then === 'function') {
    document.fonts.ready.then(() => {
      requestPost();
    });
  }

  window.addEventListener('load', requestPost);
  window.addEventListener('resize', requestPost);
  document.addEventListener('DOMContentLoaded', requestPost);

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => {
      requestPost();
    });
    observer.observe(document.documentElement);
    if (document.body) {
      observer.observe(document.body);
    }
  } else if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => {
      requestPost();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  requestPost();
})();
`;

const shouldWarnInDevelopment = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

/**
 * author supplied HTML/CSS/JS を iframe srcdoc に隔離描画する。
 */
@customElement('ui-preview-sandbox')
export class PreviewSandbox extends LitElement {
  static override styles = css`
    :host {
      display: block;
      inline-size: 100%;
    }

    .root {
      inline-size: 100%;
    }

    .placeholder {
      display: grid;
      place-items: center;
      inline-size: 100%;
      min-block-size: var(--_ui-preview-sandbox-min-height, 160px);
      block-size: var(--_ui-preview-sandbox-resolved-height, 160px);
      border: var(--border-style-subtle, 1px solid oklch(20% 0 0 / 0.12));
      background: var(--ui-preview-sandbox-bg, rgb(255 255 255));
      color: var(--fg-muted, oklch(48% 0 0));
      font: inherit;
    }

    button.placeholder {
      appearance: none;
      padding: 0;
      text-align: center;
      cursor: pointer;
    }

    iframe {
      display: block;
      inline-size: 100%;
      min-block-size: var(--_ui-preview-sandbox-min-height, 160px);
      block-size: var(--_ui-preview-sandbox-resolved-height, 160px);
      border: 0;
      background: var(--ui-preview-sandbox-bg, rgb(255 255 255));
    }
  `;

  @property({ type: String, attribute: 'iframe-title', reflect: true })
  iframeTitle = '';

  @property({ type: Number, reflect: true })
  height = DEFAULT_HEIGHT;

  @property({ type: Number, attribute: 'max-height', reflect: true })
  maxHeight?: number;

  @property({ attribute: 'base-url', reflect: true })
  baseUrl: string | URL = '';

  @property({ type: Boolean, attribute: 'allow-js', reflect: true })
  allowJs = false;

  @property({ type: String, attribute: 'activation-policy', reflect: true })
  activationPolicy = 'visible';

  @property({ type: String, attribute: 'height-mode', reflect: true })
  heightMode = 'auto';

  @property({ type: Boolean, attribute: 'allow-forms', reflect: true })
  allowForms = false;

  @property({ type: Boolean, attribute: 'allow-downloads', reflect: true })
  allowDownloads = false;

  @property({ type: Boolean, attribute: 'allow-pointer-lock', reflect: true })
  allowPointerLock = false;

  @property({ type: Boolean, attribute: 'allow-popups', reflect: true })
  allowPopups = false;

  @state()
  private _srcdoc = '';

  @state()
  private _isActivated = false;

  @state()
  private _measuredHeight = DEFAULT_HEIGHT;

  @query('iframe')
  private _iframe?: HTMLIFrameElement;

  private readonly _messageToken = `ui-preview-sandbox-${String(++previewSandboxUid)}`;
  private _payloadObserver: MutationObserver | null = null;
  private _intersectionObserver: IntersectionObserver | null = null;
  private readonly _templateObservers = new Map<HTMLTemplateElement, MutationObserver>();
  private _lastWarningSignature = '';
  private _lastBuildSignature = '';
  private _hydrationActivated = false;

  activateHydration(): void {
    if (this._hydrationActivated) {
      return;
    }

    this._hydrationActivated = true;

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this._handleWindowMessage);
    }

    if (typeof MutationObserver !== 'undefined') {
      this._payloadObserver = new MutationObserver(() => {
        this._syncTemplateObservers();
        this._reportContractWarnings();
        this._refreshSandboxDocument();
      });
      this._payloadObserver.observe(this, {
        childList: true,
      });
    }

    this._syncTemplateObservers();
    this._reportContractWarnings();

    const hydrationTrigger = this.getAttribute('data-hydration-trigger');
    if (
      (hydrationTrigger === 'visible' || hydrationTrigger === 'initial') &&
      this._normalizedActivationPolicy !== 'manual'
    ) {
      this._activatePreview();
      return;
    }
    if (hydrationTrigger === 'visible' || hydrationTrigger === 'initial') {
      this._refreshSandboxDocument();
      return;
    }
    if (hydrationTrigger === 'interaction') {
      this._activatePreview();
      return;
    }

    this._syncActivationPolicy();
    this._refreshSandboxDocument();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.hasAttribute('data-hydration-trigger')) {
      this.activateHydration();
    }
  }

  override disconnectedCallback(): void {
    this._payloadObserver?.disconnect();
    this._payloadObserver = null;

    this._intersectionObserver?.disconnect();
    this._intersectionObserver = null;

    for (const observer of this._templateObservers.values()) {
      observer.disconnect();
    }
    this._templateObservers.clear();

    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this._handleWindowMessage);
    }

    super.disconnectedCallback();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (
      changedProperties.has('activationPolicy') ||
      changedProperties.has('height') ||
      changedProperties.has('heightMode') ||
      changedProperties.has('maxHeight')
    ) {
      this._measuredHeight = this._normalizedHeight;
    }

    if (changedProperties.has('activationPolicy') && this._hydrationActivated) {
      this._syncActivationPolicy();
    }

    if (
      this._hydrationActivated &&
      (changedProperties.has('baseUrl') ||
        changedProperties.has('allowJs') ||
        changedProperties.has('allowForms') ||
        changedProperties.has('allowDownloads') ||
        changedProperties.has('allowPointerLock') ||
        changedProperties.has('allowPopups'))
    ) {
      this._refreshSandboxDocument();
    }
  }

  private _handleWindowMessage = (event: MessageEvent<unknown>): void => {
    if (event.source !== this._iframe?.contentWindow) {
      return;
    }

    const data = event.data;
    if (!data || typeof data !== 'object') {
      return;
    }

    const message = data as Partial<PreviewSandboxResizeMessage>;
    if (message.source !== 'ui-preview-sandbox' || message.token !== this._messageToken) {
      return;
    }

    const height = typeof message.height === 'number' ? Math.ceil(message.height) : NaN;
    if (!Number.isFinite(height) || height <= 0) {
      return;
    }

    this._measuredHeight = height;
  };

  private _handleManualActivationRequest = (): void => {
    if (this._normalizedActivationPolicy !== 'manual') {
      return;
    }

    if (!this._hydrationActivated) {
      this.activateHydration();
    }

    if (!this._isActivated) {
      this._activatePreview();
    }
  };

  private _activatePreview(): void {
    if (this._isActivated) {
      return;
    }
    this._isActivated = true;
    this._refreshSandboxDocument(true);
    this._intersectionObserver?.disconnect();
    this._intersectionObserver = null;
  }

  private _syncActivationPolicy(): void {
    if (!this.isConnected) {
      return;
    }

    const activationPolicy = this._normalizedActivationPolicy;
    if (this._isActivated) {
      this._intersectionObserver?.disconnect();
      this._intersectionObserver = null;
      return;
    }

    if (activationPolicy === 'eager') {
      this._activatePreview();
      return;
    }

    if (activationPolicy === 'visible') {
      this._observeVisibilityActivation();
      return;
    }

    this._intersectionObserver?.disconnect();
    this._intersectionObserver = null;
    this._srcdoc = '';
    this._lastBuildSignature = '';
  }

  private _observeVisibilityActivation(): void {
    this._intersectionObserver?.disconnect();
    this._intersectionObserver = null;

    if (typeof IntersectionObserver !== 'function') {
      this._activatePreview();
      return;
    }

    this._intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this._activatePreview();
            return;
          }
        }
      },
      { rootMargin: '240px 0px' },
    );
    this._intersectionObserver.observe(this);
  }

  private _syncTemplateObservers(): void {
    const directTemplates = new Set<HTMLTemplateElement>();
    for (const child of Array.from(this.children)) {
      if (!(child instanceof HTMLTemplateElement)) {
        continue;
      }
      directTemplates.add(child);
      if (this._templateObservers.has(child) || typeof MutationObserver === 'undefined') {
        continue;
      }

      const observer = new MutationObserver(() => {
        this._reportContractWarnings();
        this._refreshSandboxDocument();
      });
      observer.observe(child.content, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
      this._templateObservers.set(child, observer);
    }

    for (const [template, observer] of this._templateObservers.entries()) {
      if (directTemplates.has(template)) {
        continue;
      }
      observer.disconnect();
      this._templateObservers.delete(template);
    }
  }

  private _reportContractWarnings(): void {
    if (!shouldWarnInDevelopment()) {
      return;
    }

    const { warnings } = this._collectPayload();
    const signature = warnings.join('\n');
    if (signature === this._lastWarningSignature) {
      return;
    }
    this._lastWarningSignature = signature;

    for (const warning of warnings) {
      console.warn(`[ui-preview-sandbox] ${warning}`, this);
    }
  }

  private _collectPayload(): PayloadCollectionResult {
    const templateMap = new Map<PreviewPayloadKind, HTMLTemplateElement>();
    const warnings: string[] = [];

    for (const childNode of Array.from(this.childNodes)) {
      if (childNode.nodeType === Node.COMMENT_NODE) {
        continue;
      }

      if (childNode.nodeType === Node.TEXT_NODE) {
        const text = childNode.textContent ?? '';
        if (text.trim() === '') {
          continue;
        }
        warnings.push('直下の非空テキストノードは payload 入力として扱われません');
        continue;
      }

      if (!(childNode instanceof HTMLElement)) {
        continue;
      }

      if (!(childNode instanceof HTMLTemplateElement)) {
        warnings.push('template[data-preview-kind] 以外の直下子要素は契約違反です');
        continue;
      }

      const kind = childNode.getAttribute('data-preview-kind');
      if (!kind || !VALID_PAYLOAD_KINDS.has(kind as PreviewPayloadKind)) {
        warnings.push('列挙外の data-preview-kind を持つ template は無視されます');
        continue;
      }

      if (templateMap.has(kind as PreviewPayloadKind)) {
        warnings.push(`data-preview-kind="${kind}" の複数定義は契約違反です`);
        continue;
      }

      templateMap.set(kind as PreviewPayloadKind, childNode);
    }

    const descendantTemplates = Array.from(this.querySelectorAll('template[data-preview-kind]'));
    for (const template of descendantTemplates) {
      if (template.parentElement === this) {
        continue;
      }
      warnings.push('payload template は直下子でなければなりません');
      break;
    }

    const htmlTemplate = templateMap.get('html');
    const cssTemplate = templateMap.get('css');
    const jsTemplate = templateMap.get('js');

    if (!this.allowJs && jsTemplate) {
      warnings.push('allowJs=false のため js payload は無視されます');
    }

    return {
      payload: {
        html: this._sanitizeHtmlFragment(
          normalizeLineBreaks(this._readHtmlTemplatePayload(htmlTemplate)),
          warnings,
        ),
        css: normalizeLineBreaks(cssTemplate?.content.textContent ?? ''),
        js: this.allowJs ? normalizeLineBreaks(jsTemplate?.content.textContent ?? '') : '',
      },
      warnings,
    };
  }

  private _readHtmlTemplatePayload(template: HTMLTemplateElement | undefined): string {
    if (!template) {
      return '';
    }

    const nonWhitespaceNodes = Array.from(template.content.childNodes).filter((node) => {
      if (node.nodeType !== Node.TEXT_NODE) {
        return true;
      }

      return (node.textContent ?? '').trim().length > 0;
    });

    const isTextEncodedPayload =
      nonWhitespaceNodes.length > 0 &&
      nonWhitespaceNodes.every((node) => node.nodeType === Node.TEXT_NODE);

    if (isTextEncodedPayload) {
      return template.content.textContent;
    }

    return template.innerHTML;
  }

  private _sanitizeHtmlFragment(rawHtml: string, warnings: string[]): string {
    if (typeof DOMParser === 'undefined') {
      return '';
    }

    const lowerRawHtml = rawHtml.toLowerCase();
    if (
      lowerRawHtml.includes('<head') ||
      lowerRawHtml.includes('<meta') ||
      lowerRawHtml.includes('<base') ||
      lowerRawHtml.includes('<script')
    ) {
      warnings.push(
        'html payload は body fragment を前提とし、head/meta/base/script には依存できません',
      );
    }

    const parser = new DOMParser();
    const documentNode = parser.parseFromString(rawHtml, 'text/html');

    documentNode.querySelectorAll(DANGEROUS_ELEMENT_SELECTORS).forEach((element) => {
      element.remove();
    });
    documentNode.querySelectorAll('meta[http-equiv]').forEach((element) => {
      const httpEquiv = element.getAttribute('http-equiv')?.trim().toLowerCase();
      if (httpEquiv === 'refresh') {
        element.remove();
      }
    });

    documentNode.querySelectorAll('*').forEach((element) => {
      for (const attributeName of element.getAttributeNames()) {
        const normalizedName = attributeName.trim().toLowerCase();
        const value = element.getAttribute(attributeName);
        if (value === null) {
          continue;
        }

        if (normalizedName.startsWith('on') || normalizedName === 'srcdoc') {
          element.removeAttribute(attributeName);
          continue;
        }

        if (URL_ATTRIBUTE_NAMES.has(normalizedName) && !isSafeUrlValue(normalizedName, value)) {
          element.removeAttribute(attributeName);
          continue;
        }

        if (normalizedName === 'style') {
          const compactStyleValue = removeControlCharacters(value)
            .replace(/\s+/g, '')
            .toLowerCase();
          if (compactStyleValue.includes('javascript:')) {
            element.removeAttribute(attributeName);
          }
        }
      }
    });

    return documentNode.body.innerHTML;
  }

  private _buildHelperScriptBlock(): string {
    const helperScript = createBootstrapScript(this._messageToken);
    return `<script>${escapeScriptText(helperScript)}</script>`;
  }

  private _buildAuthorScriptBlock(payload: PreviewPayload): string {
    if (payload.js.trim() === '') {
      return '';
    }

    return `<script>${escapeScriptText(payload.js)}</script>`;
  }

  private _serializePreviewDocument(payload: PreviewPayload): string {
    const helperScriptBlock = this._buildHelperScriptBlock();
    const authorScriptBlock = this._buildAuthorScriptBlock(payload);

    return [
      '<!doctype html>',
      '<html lang="ja">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<base href="${escapeHtmlAttribute(this._normalizedBaseUrl)}">`,
      '<style>',
      'html { color-scheme: light; }',
      '*, *::before, *::after { box-sizing: border-box; }',
      'body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; color: rgb(24 24 27); background: rgb(255 255 255); }',
      '</style>',
      '<style>',
      escapeStyleText(payload.css),
      '</style>',
      '</head>',
      '<body>',
      payload.html,
      helperScriptBlock,
      authorScriptBlock,
      '</body>',
      '</html>',
    ].join('');
  }

  private _refreshSandboxDocument(force = false): void {
    if (!this._isActivated) {
      this._srcdoc = '';
      this._lastBuildSignature = '';
      return;
    }

    const { payload } = this._collectPayload();
    const signature = JSON.stringify({
      payload,
      baseUrl: this._normalizedBaseUrl,
      sandbox: this._sandboxValue,
    });
    if (!force && signature === this._lastBuildSignature) {
      return;
    }

    this._measuredHeight = this._normalizedHeight;
    this._srcdoc = this._serializePreviewDocument(payload);
    this._lastBuildSignature = signature;
  }

  private get _normalizedHeight(): number {
    return normalizePositiveNumber(this.height, DEFAULT_HEIGHT);
  }

  private get _normalizedMaxHeight(): number | undefined {
    return normalizeOptionalPositiveNumber(this.maxHeight);
  }

  private get _normalizedActivationPolicy(): ActivationPolicy {
    return normalizeActivationPolicy(this.activationPolicy);
  }

  private get _normalizedHeightMode(): HeightMode {
    return normalizeHeightMode(this.heightMode);
  }

  private get _normalizedBaseUrl(): string {
    if (this.baseUrl instanceof URL) {
      return this.baseUrl.href;
    }

    if (typeof this.baseUrl === 'string') {
      try {
        return new URL(this.baseUrl).href;
      } catch {
        // fallback へ進む
      }
    }

    if (typeof document !== 'undefined' && typeof document.baseURI === 'string') {
      return document.baseURI;
    }

    if (typeof window !== 'undefined') {
      return window.location.href;
    }

    return 'about:blank';
  }

  private get _effectiveSandboxTokens(): readonly string[] {
    const tokens = ['allow-scripts'];

    if (this.allowForms) {
      tokens.push('allow-forms');
    }
    if (this.allowDownloads) {
      tokens.push('allow-downloads');
    }
    if (this.allowPointerLock) {
      tokens.push('allow-pointer-lock');
    }
    if (this.allowPopups) {
      tokens.push('allow-popups');
    }

    return tokens;
  }

  private get _resolvedHeight(): number {
    const height = this._normalizedHeight;
    if (!this._isActivated) {
      return height;
    }

    if (this._normalizedHeightMode === 'fixed') {
      return height;
    }

    const measuredHeight = this._measuredHeight > 0 ? Math.ceil(this._measuredHeight) : height;
    const autoHeight = Math.max(height, measuredHeight);

    if (this._normalizedHeightMode !== 'bounded-auto') {
      return autoHeight;
    }

    const maxHeight = this._normalizedMaxHeight;
    if (typeof maxHeight !== 'number') {
      return autoHeight;
    }

    return Math.min(autoHeight, maxHeight);
  }

  private get _iframeAccessibleTitle(): string {
    const title = this.iframeTitle.trim();
    return title === '' ? DEFAULT_IFRAME_TITLE : title;
  }

  private get _sandboxValue(): string {
    return [...this._effectiveSandboxTokens].join(' ');
  }

  private get _hasManualOnlyCapability(): boolean {
    return this.allowForms || this.allowDownloads || this.allowPointerLock || this.allowPopups;
  }

  private get _manualActionLabel(): string {
    return this.allowJs || this._hasManualOnlyCapability ? 'プレビューを実行' : 'プレビューを表示';
  }

  override render(): TemplateResult {
    return html`
      <div
        class="root"
        data-link-contract-sandbox="preview"
        style=${`--_ui-preview-sandbox-min-height: ${String(
          this._normalizedHeight,
        )}px; --_ui-preview-sandbox-resolved-height: ${String(this._resolvedHeight)}px;`}
      >
        ${this._isActivated
          ? html`
              <iframe
                title=${this._iframeAccessibleTitle}
                sandbox=${this._sandboxValue}
                .srcdoc=${this._srcdoc}
              ></iframe>
            `
          : html`
              ${this._normalizedActivationPolicy === 'manual'
                ? html`
                    <button
                      class="placeholder"
                      type="button"
                      aria-label=${`${this._manualActionLabel}: ${this._iframeAccessibleTitle}`}
                      @click=${this._handleManualActivationRequest}
                    >
                      ${this._manualActionLabel}
                    </button>
                  `
                : html`
                    <div
                      class="placeholder"
                      role="status"
                      aria-label=${`プレビューを読み込んでいます: ${this._iframeAccessibleTitle}`}
                    >
                      プレビューを読み込んでいます
                    </div>
                  `}
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-preview-sandbox': PreviewSandbox;
  }
}
