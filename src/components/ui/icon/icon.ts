import '../../../icons/register.js';
import type { IconName } from '../../../icons/catalog.js';

const NAME_ATTRIBUTE = 'name';
const ICON_ATTRIBUTE = 'icon';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
type UiIconBaseConstructor = new () => HTMLElement;

const BaseElement: UiIconBaseConstructor =
  typeof HTMLElement === 'undefined'
    ? (class {
        __rouaultBaseElement = 0;
      } as unknown as UiIconBaseConstructor)
    : HTMLElement;

export class UiIcon extends BaseElement {
  static readonly observedAttributes = [NAME_ATTRIBUTE, ICON_ATTRIBUTE, ARIA_LABEL_ATTRIBUTE];

  private readonly glyph = document.createElement('iconify-icon');
  private readonly glyphRoot: ShadowRoot;
  private collapsedDisplayBackup: string | null = null;

  constructor() {
    super();

    const host = this as unknown as HTMLElement;
    this.glyphRoot = host.attachShadow({ mode: 'open' });
    this.glyph.setAttribute('part', 'glyph');
    this.glyph.style.inlineSize = '1em';
    this.glyph.style.blockSize = '1em';
    this.glyph.style.display = 'inline-block';
    this.glyph.style.flexShrink = '0';
    this.glyphRoot.append(this.glyph);
  }

  get name(): IconName | null {
    const host = this as unknown as HTMLElement;
    const value = host.getAttribute(NAME_ATTRIBUTE)?.trim();
    if (value) {
      return value as IconName;
    }

    const legacyValue = host.getAttribute(ICON_ATTRIBUTE)?.trim();
    return legacyValue ? (legacyValue as IconName) : null;
  }

  set name(value: IconName | null) {
    const host = this as unknown as HTMLElement;
    if (value === null) {
      host.removeAttribute(NAME_ATTRIBUTE);
      return;
    }

    host.setAttribute(NAME_ATTRIBUTE, value);
  }

  get icon(): IconName | null {
    const host = this as unknown as HTMLElement;
    const value = host.getAttribute(ICON_ATTRIBUTE)?.trim();
    return value ? (value as IconName) : null;
  }

  set icon(value: IconName | null) {
    const host = this as unknown as HTMLElement;
    if (value === null) {
      host.removeAttribute(ICON_ATTRIBUTE);
      return;
    }

    host.setAttribute(ICON_ATTRIBUTE, value);
  }

  connectedCallback(): void {
    this.#sync();
  }

  attributeChangedCallback(): void {
    this.#sync();
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
    const canonicalName = host.getAttribute(NAME_ATTRIBUTE)?.trim();
    if (canonicalName) {
      return canonicalName as IconName;
    }

    const legacyName = host.getAttribute(ICON_ATTRIBUTE)?.trim();
    return legacyName ? (legacyName as IconName) : null;
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
