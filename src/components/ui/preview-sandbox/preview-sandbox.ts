import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

type PreviewPayloadKind = 'html' | 'css' | 'js';

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

const DEFAULT_HEIGHT = 160;
const LINK_URL_ATTRIBUTE_NAMES = new Set(['href', 'xlink:href']);
const RESOURCE_URL_ATTRIBUTE_NAMES = new Set(['src', 'poster']);
const FORM_URL_ATTRIBUTE_NAMES = new Set(['action', 'formaction']);
const URL_ATTRIBUTE_NAMES = new Set([
  ...LINK_URL_ATTRIBUTE_NAMES,
  ...RESOURCE_URL_ATTRIBUTE_NAMES,
  ...FORM_URL_ATTRIBUTE_NAMES,
]);
const DANGEROUS_ELEMENT_SELECTORS = 'script, iframe, object, embed, base';

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

const isAllowedProtocolForAttribute = (attributeName: string, protocol: string): boolean => {
  if (LINK_URL_ATTRIBUTE_NAMES.has(attributeName)) {
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' || protocol === 'tel:';
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
    const parsed = new URL(normalized, 'https://preview-sandbox.local');
    return isAllowedProtocolForAttribute(attributeName, parsed.protocol.toLowerCase());
  } catch {
    return false;
  }
};

const escapeStyleText = (value: string): string => value.replace(/<\/style/gi, '<\\/style');
const escapeScriptText = (value: string): string => value.replace(/<\/script/gi, '<\\/script');

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

  const requestPost = () => {
    requestAnimationFrame(() => {
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

    iframe {
      display: block;
      inline-size: 100%;
      min-block-size: var(--_ui-preview-sandbox-height, 160px);
      block-size: var(--_ui-preview-sandbox-height, 160px);
      border: 0;
      background: var(--ui-preview-sandbox-bg, rgb(255 255 255));
    }
  `;

  @property({ type: String, reflect: true })
  override title = '';

  @property({ type: Number, reflect: true })
  height = DEFAULT_HEIGHT;

  @property({ type: Boolean, attribute: 'allow-js', reflect: true })
  allowJs = false;

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
  private _measuredHeight = DEFAULT_HEIGHT;

  @query('iframe')
  private _iframe?: HTMLIFrameElement;

  private readonly _messageToken = `ui-preview-sandbox-${String(++previewSandboxUid)}`;
  private _payloadObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    if (typeof window !== 'undefined') {
      window.addEventListener('message', this._handleWindowMessage);
    }

    if (typeof MutationObserver !== 'undefined') {
      this._payloadObserver = new MutationObserver(() => {
        this._refreshSandboxDocument();
      });
      this._payloadObserver.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  override disconnectedCallback(): void {
    this._payloadObserver?.disconnect();
    this._payloadObserver = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this._handleWindowMessage);
    }

    super.disconnectedCallback();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('height')) {
      if (!Number.isFinite(this.height) || this.height <= 0) {
        this.height = DEFAULT_HEIGHT;
      } else {
        this.height = Math.trunc(this.height);
      }
    }
    if (
      !this.hasUpdated ||
      changedProperties.has('title') ||
      changedProperties.has('allowJs') ||
      changedProperties.has('allowForms') ||
      changedProperties.has('allowDownloads') ||
      changedProperties.has('allowPointerLock') ||
      changedProperties.has('allowPopups') ||
      changedProperties.has('height')
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

  private _readPayload(kind: PreviewPayloadKind): string {
    const template = this.querySelector(`template[data-preview-kind="${kind}"]`);
    if (!(template instanceof HTMLTemplateElement)) {
      return '';
    }

    if (kind === 'html' && template.content.childElementCount > 0) {
      return template.innerHTML.replace(/\r\n?/g, '\n');
    }

    return template.content.textContent.replace(/\r\n?/g, '\n');
  }

  private _sanitizeHtmlFragment(rawHtml: string): string {
    if (typeof DOMParser === 'undefined') {
      return '';
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

        if (normalizedName === 'style' && /javascript:/i.test(value)) {
          element.removeAttribute(attributeName);
        }
      }
    });

    return documentNode.body.innerHTML;
  }

  private _buildPayload(): PreviewPayload {
    return {
      html: this._sanitizeHtmlFragment(this._readPayload('html')),
      css: this._readPayload('css'),
      js: this._readPayload('js'),
    };
  }

  private _buildSrcdoc(payload: PreviewPayload): string {
    const bootstrapScript = createBootstrapScript(this._messageToken);
    const authorScript = this.allowJs && payload.js.trim() !== '' ? payload.js : '';

    return [
      '<!doctype html>',
      '<html lang="ja">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<style>',
      'html { color-scheme: light; }',
      '*, *::before, *::after { box-sizing: border-box; }',
      'body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; color: rgb(24 24 27); background: rgb(255 255 255); }',
      escapeStyleText(payload.css),
      '</style>',
      '</head>',
      '<body>',
      payload.html,
      `<script>${escapeScriptText(bootstrapScript)}</script>`,
      authorScript === '' ? '' : `<script>${escapeScriptText(authorScript)}</script>`,
      '</body>',
      '</html>',
    ].join('');
  }

  private _refreshSandboxDocument(): void {
    const payload = this._buildPayload();
    this._measuredHeight = this.height;
    this._srcdoc = this._buildSrcdoc(payload);
  }

  private get _resolvedHeight(): number {
    return this._measuredHeight > 0 ? this._measuredHeight : this.height;
  }

  private get _iframeTitle(): string {
    const title = this.title.trim();
    return title === '' ? 'プレビュー sandbox' : title;
  }

  private get _sandboxValue(): string {
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

    return tokens.join(' ');
  }

  override render(): TemplateResult {
    return html`
      <div class="root" style=${`--_ui-preview-sandbox-height: ${String(this._resolvedHeight)}px;`}>
        <iframe
          title="${this._iframeTitle}"
          sandbox=${this._sandboxValue}
          .srcdoc=${this._srcdoc}
        ></iframe>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-preview-sandbox': PreviewSandbox;
  }
}
