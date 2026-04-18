import '../../../icons/register.js';
import type { IconName } from '../../../../shared/icons/icons-catalog.js';

const NAME_ATTRIBUTE = 'name';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
type UiIconBaseConstructor = new () => HTMLElement;

const BaseElement: UiIconBaseConstructor =
  typeof HTMLElement === 'undefined'
    ? (class {
        __rouaultBaseElement = 0;
      } as unknown as UiIconBaseConstructor)
    : HTMLElement;

const prepareGlyphElement = (glyph: HTMLElement): void => {
  glyph.setAttribute('part', 'glyph');
  glyph.style.inlineSize = '1em';
  glyph.style.blockSize = '1em';
  glyph.style.display = 'inline-block';
  glyph.style.flexShrink = '0';
};

export class UiIcon extends BaseElement {
  static readonly observedAttributes = [NAME_ATTRIBUTE, ARIA_LABEL_ATTRIBUTE];

  private glyph: HTMLElement = document.createElement('iconify-icon');
  private glyphRoot: ShadowRoot | null = null;
  private collapsedDisplayBackup: string | null = null;

  constructor() {
    super();
    prepareGlyphElement(this.glyph);
  }

  get name(): IconName | null {
    const host = this as unknown as HTMLElement;
    const value = host.getAttribute(NAME_ATTRIBUTE)?.trim();
    return value ? (value as IconName) : null;
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

    if (this.glyphRoot !== null) {
      if (this.glyph.parentNode !== this.glyphRoot) {
        this.glyphRoot.replaceChildren(this.glyph);
      }
      return this.glyphRoot;
    }

    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    this.glyphRoot = root;

    const existingGlyph = root.querySelector('iconify-icon');
    if (existingGlyph instanceof HTMLElement) {
      this.glyph = existingGlyph;
      prepareGlyphElement(this.glyph);
      return root;
    }

    root.replaceChildren(this.glyph);
    return root;
  }

  #ensureHostPresentation(): void {
    const host = this as unknown as HTMLElement;
    if (host.style.display.length === 0) {
      host.style.display = 'inline-flex';
    }

    if (host.style.alignItems.length === 0) {
      host.style.alignItems = 'center';
    }

    if (host.style.justifyContent.length === 0) {
      host.style.justifyContent = 'center';
    }

    if (host.style.lineHeight.length === 0) {
      host.style.lineHeight = '1';
    }
  }

  #getResolvedName(): IconName | null {
    const host = this as unknown as HTMLElement;
    const value = host.getAttribute(NAME_ATTRIBUTE)?.trim();
    return value ? (value as IconName) : null;
  }

  #collapseHost(): void {
    const host = this as unknown as HTMLElement;
    this.collapsedDisplayBackup ??= host.style.display;

    host.style.display = 'none';
    host.removeAttribute('role');
    this.glyph.removeAttribute('icon');
    this.glyph.setAttribute('aria-hidden', 'true');
    this.glyph.removeAttribute('aria-label');
  }

  #expandHost(): void {
    const host = this as unknown as HTMLElement;
    if (this.collapsedDisplayBackup !== null) {
      host.style.display = this.collapsedDisplayBackup;
      this.collapsedDisplayBackup = null;
    }

    this.#ensureHostPresentation();
  }

  #sync(): void {
    const host = this as unknown as HTMLElement;
    const name = this.#getResolvedName();

    if (!name) {
      this.#collapseHost();
      return;
    }

    this.#expandHost();

    this.glyph.setAttribute('icon', `lucide:${name}`);

    const ariaLabel = host.getAttribute(ARIA_LABEL_ATTRIBUTE)?.trim();
    if (ariaLabel && ariaLabel.length > 0) {
      host.setAttribute('role', 'img');
      this.glyph.setAttribute('aria-hidden', 'false');
      this.glyph.setAttribute('aria-label', ariaLabel);
    } else {
      host.removeAttribute('role');
      this.glyph.setAttribute('aria-hidden', 'true');
      this.glyph.removeAttribute('aria-label');
    }
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
