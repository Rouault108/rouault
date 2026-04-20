import '../../../icons/register.js';
import { isIconName, type IconName } from '../../../../shared/icons/icons-catalog.js';

const NAME_ATTRIBUTE = 'name';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const ICON_STATE_ATTRIBUTE = 'data-icon-state';
const STYLE_MARKER_ATTRIBUTE = 'data-ui-icon-host-style';

const ICON_SHADOW_STYLE = `
  :host {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    flex: 0 0 auto;
  }

  :host([hidden]),
  :host([data-icon-state='empty']),
  :host([data-icon-state='invalid']) {
    display: none;
  }

  iconify-icon {
    inline-size: 1em;
    block-size: 1em;
    display: inline-block;
    flex-shrink: 0;
  }
`;

type UiIconBaseConstructor = new () => HTMLElement;

const BaseElement: UiIconBaseConstructor =
  typeof HTMLElement === 'undefined'
    ? (class {
        __rouaultBaseElement = 0;
      } as unknown as UiIconBaseConstructor)
    : HTMLElement;

const warnedInvalidNames = new Set<string>();

const createGlyphElement = (): HTMLElement => {
  const glyph = document.createElement('iconify-icon');
  glyph.setAttribute('part', 'glyph');
  return glyph;
};

const createStyleElement = (): HTMLStyleElement => {
  const style = document.createElement('style');
  style.setAttribute(STYLE_MARKER_ATTRIBUTE, '');
  style.textContent = ICON_SHADOW_STYLE;
  return style;
};

type ResolvedIconState =
  | { kind: 'empty' }
  | { kind: 'invalid'; rawName: string }
  | { kind: 'valid'; name: IconName };

export class UiIcon extends BaseElement {
  static readonly observedAttributes = [NAME_ATTRIBUTE, ARIA_LABEL_ATTRIBUTE];

  private glyph: HTMLElement = createGlyphElement();
  private glyphRoot: ShadowRoot | null = null;
  private hostStyle: HTMLStyleElement | null = null;
  private readonly _isDevelopment: boolean;

  constructor() {
    super();
    this._isDevelopment =
      (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV ?? true;
  }

  get name(): IconName | null {
    const host = this as unknown as HTMLElement;
    const value = host.getAttribute(NAME_ATTRIBUTE)?.trim();
    return value && isIconName(value) ? value : null;
  }

  set name(value: IconName | null) {
    const host = this as unknown as HTMLElement;
    if (value === null) {
      host.removeAttribute(NAME_ATTRIBUTE);
      return;
    }

    host.setAttribute(NAME_ATTRIBUTE, value);
  }

  connectedCallback(): void {
    this.#ensureShadowRoot();
    this.#sync();
  }

  attributeChangedCallback(): void {
    this.#ensureShadowRoot();
    this.#sync();
  }

  #ensureShadowRoot(): ShadowRoot {
    const host = this as unknown as HTMLElement;

    const root = this.glyphRoot ?? host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    this.glyphRoot = root;

    const existingStyle = root.querySelector(`style[${STYLE_MARKER_ATTRIBUTE}]`);
    this.hostStyle =
      existingStyle instanceof HTMLStyleElement ? existingStyle : this.hostStyle ?? createStyleElement();

    const existingGlyph = root.querySelector('iconify-icon');
    if (existingGlyph instanceof HTMLElement) {
      this.glyph = existingGlyph;
      this.glyph.setAttribute('part', 'glyph');
    }

    if (this.hostStyle.parentNode !== root || this.glyph.parentNode !== root) {
      root.replaceChildren(this.hostStyle, this.glyph);
    }

    return root;
  }

  #readRawName(): string | null {
    const host = this as unknown as HTMLElement;
    const value = host.getAttribute(NAME_ATTRIBUTE)?.trim();
    return value && value.length > 0 ? value : null;
  }

  #resolveNameState(): ResolvedIconState {
    const rawName = this.#readRawName();
    if (rawName === null) {
      return { kind: 'empty' };
    }

    if (!isIconName(rawName)) {
      return { kind: 'invalid', rawName };
    }

    return { kind: 'valid', name: rawName };
  }

  #applyCollapsedState(state: 'empty' | 'invalid'): void {
    const host = this as unknown as HTMLElement;
    host.setAttribute(ICON_STATE_ATTRIBUTE, state);
    host.removeAttribute('role');

    this.glyph.removeAttribute('icon');
    this.glyph.setAttribute('aria-hidden', 'true');
    this.glyph.removeAttribute('aria-label');
  }

  #clearCollapsedState(): void {
    const host = this as unknown as HTMLElement;
    host.removeAttribute(ICON_STATE_ATTRIBUTE);
  }

  #warnInvalidName(rawName: string): void {
    if (!this._isDevelopment || warnedInvalidNames.has(rawName)) {
      return;
    }

    warnedInvalidNames.add(rawName);
    console.warn(
      `[ui-icon]: "${rawName}" は shared/icons/icons-catalog.ts に存在しないため描画しません。`,
    );
  }

  #sync(): void {
    const host = this as unknown as HTMLElement;
    const resolved = this.#resolveNameState();

    if (resolved.kind === 'empty') {
      this.#applyCollapsedState('empty');
      return;
    }

    if (resolved.kind === 'invalid') {
      this.#warnInvalidName(resolved.rawName);
      this.#applyCollapsedState('invalid');
      return;
    }

    this.#clearCollapsedState();
    this.glyph.setAttribute('icon', `lucide:${resolved.name}`);

    const ariaLabel = host.getAttribute(ARIA_LABEL_ATTRIBUTE)?.trim();
    if (ariaLabel && ariaLabel.length > 0) {
      host.setAttribute('role', 'img');
      this.glyph.setAttribute('aria-hidden', 'false');
      this.glyph.setAttribute('aria-label', ariaLabel);
      return;
    }

    host.removeAttribute('role');
    this.glyph.setAttribute('aria-hidden', 'true');
    this.glyph.removeAttribute('aria-label');
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ui-icon')) {
  customElements.define('ui-icon', UiIcon as unknown as CustomElementConstructor);
}

export type UiIconElement = InstanceType<typeof UiIcon>;

declare global {
  interface HTMLElementTagNameMap {
    'ui-icon': UiIconElement;
  }
}