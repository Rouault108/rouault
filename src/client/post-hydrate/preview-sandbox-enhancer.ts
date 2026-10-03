import type { HydrationActivationResult } from '../../../shared/hydration/hydration-activation.js';

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

interface PayloadCollectionResult {
  readonly payload: PreviewPayload;
  readonly warnings: string[];
}

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

let sandboxSequence = 0;
const controllers = new WeakMap<HTMLElement, PreviewSandboxController>();

class PreviewSandboxController {
  private readonly _messageToken = 'ui-preview-sandbox-' + String(++sandboxSequence);
  private readonly allowJs: boolean;
  private readonly _normalizedBaseUrl: string;
  private readonly _normalizedContentLayout: string;
  private readonly height: number;
  private readonly maximum: number | undefined;
  private readonly heightMode: string;
  private readonly iframe: HTMLIFrameElement;
  private readonly sandboxTokens: string;
  private readonly placeholder: HTMLElement | null;
  private readonly observers: MutationObserver[] = [];
  private signature = '';

  constructor(
    private readonly root: HTMLElement,
    signal: AbortSignal,
  ) {
    this.allowJs = root.hasAttribute('data-sandbox-allow-js');
    this._normalizedBaseUrl = root.dataset['sandboxBaseUrl'] ?? '';
    this._normalizedContentLayout = root.dataset['sandboxContentLayout'] ?? '';
    this.height = Number(root.dataset['sandboxHeight']);
    this.maximum = root.hasAttribute('data-sandbox-max-height')
      ? Number(root.dataset['sandboxMaxHeight'])
      : undefined;
    this.heightMode = root.dataset['sandboxHeightMode'] ?? '';
    this.placeholder = root.querySelector(':scope > [data-preview-sandbox-placeholder]');
    this.iframe = root.ownerDocument.createElement('iframe');
    this.iframe.setAttribute('data-sandbox-frame', '');
    this.iframe.setAttribute('data-search-exclude', '');
    this.iframe.title = root.dataset['sandboxIframeTitle'] ?? '';
    const tokens = ['allow-scripts'];
    for (const capability of ['forms', 'downloads', 'pointer-lock', 'popups']) {
      if (root.hasAttribute('data-sandbox-allow-' + capability)) tokens.push('allow-' + capability);
    }
    this.sandboxTokens = tokens.join(' ');
    this.iframe.setAttribute('sandbox', this.sandboxTokens);
    this.rebuild();
    root.append(this.iframe);
    if (this.placeholder) this.placeholder.hidden = true;
    for (const template of root.querySelectorAll<HTMLTemplateElement>(
      ':scope > template[data-preview-kind]',
    )) {
      const observer = new MutationObserver(() => {
        if (!signal.aborted) this.rebuild();
      });
      observer.observe(template.content, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
      this.observers.push(observer);
    }
    root.ownerDocument.defaultView?.addEventListener(
      'message',
      (event: MessageEvent<unknown>) => {
        if (
          event.source !== this.iframe.contentWindow ||
          !event.data ||
          typeof event.data !== 'object'
        )
          return;
        const message = event.data as Partial<PreviewSandboxResizeMessage>;
        if (message.source !== 'ui-preview-sandbox' || message.token !== this._messageToken) return;
        const measured = typeof message.height === 'number' ? Math.ceil(message.height) : NaN;
        if (!Number.isFinite(measured) || measured <= 0) return;
        this.projectHeight(measured);
      },
      { signal },
    );
  }

  private projectHeight(measured: number): void {
    const auto = Math.max(this.height, measured);
    const resolved =
      this.heightMode === 'fixed'
        ? this.height
        : this.heightMode === 'bounded-auto' && this.maximum !== undefined
          ? Math.min(auto, this.maximum)
          : auto;
    this.iframe.style.height = String(resolved) + 'px';
  }

  private rebuild(): void {
    const { payload } = this._collectPayload();
    const signature = JSON.stringify({
      payload,
      baseUrl: this._normalizedBaseUrl,
      sandbox: this.sandboxTokens,
      contentLayout: this._normalizedContentLayout,
    });
    if (signature === this.signature) return;
    this.projectHeight(this.height);
    this.iframe.srcdoc = this._serializePreviewDocument(payload);
    this.signature = signature;
  }

  destroy(): void {
    for (const observer of this.observers) observer.disconnect();
    this.iframe.remove();
    if (this.placeholder) this.placeholder.hidden = false;
    controllers.delete(this.root);
  }
  private _collectPayload(): PayloadCollectionResult {
    const templateMap = new Map<PreviewPayloadKind, HTMLTemplateElement>();
    const warnings: string[] = [];

    for (const childNode of Array.from(this.root.childNodes)) {
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

      if (childNode.matches('[data-preview-sandbox-placeholder], iframe[data-sandbox-frame]'))
        continue;
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

    const descendantTemplates = Array.from(
      this.root.querySelectorAll('template[data-preview-kind]'),
    );
    for (const template of descendantTemplates) {
      if (template.parentElement === this.root) {
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
    const contentLayout = this._normalizedContentLayout;

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
      '<style>',
      'html { display: block; inline-size: auto; min-inline-size: 100%; min-block-size: 100%; overflow: auto; }',
      'body[data-preview-content-layout] { box-sizing: border-box; inline-size: auto; min-inline-size: 100%; min-block-size: 100vh; margin: 0; padding: 0; overflow: visible; }',
      'body[data-preview-content-layout="stage"] { display: flex; flex-flow: row nowrap; }',
      'body[data-preview-content-layout="flow"] { display: block; }',
      'body > ui-preview-content-root { display: block; min-inline-size: 0; max-inline-size: 100%; block-size: auto; max-block-size: none; overflow: visible; }',
      'body[data-preview-content-layout="stage"] > ui-preview-content-root { flex: none; inline-size: fit-content; margin: auto; }',
      'body[data-preview-content-layout="flow"] > ui-preview-content-root { inline-size: auto; margin: 0; }',
      '</style>',
      '</head>',
      `<body data-preview-content-layout="${contentLayout}">`,
      '<ui-preview-content-root>',
      payload.html,
      '</ui-preview-content-root>',
      helperScriptBlock,
      authorScriptBlock,
      '</body>',
      '</html>',
    ].join('');
  }
}

export const activatePreviewSandbox = (
  root: HTMLElement,
  signal: AbortSignal,
): HydrationActivationResult => {
  if (signal.aborted) return { status: 'aborted' };
  if (controllers.has(root)) return { status: 'skipped', reason: 'already-activated' };
  const lifetime = new AbortController();
  const controller = new PreviewSandboxController(root, lifetime.signal);
  controllers.set(root, controller);
  const cleanup = (): void => {
    if (lifetime.signal.aborted) return;
    lifetime.abort();
    controller.destroy();
    signal.removeEventListener('abort', cleanup);
  };
  signal.addEventListener('abort', cleanup, { once: true });
  return { status: 'activated', cleanup };
};
