import '../../../icons/register.js';
import type { IconName } from '../../../icons/catalog.js';

const NAME_ATTRIBUTE = 'name';
const ICON_ATTRIBUTE = 'icon';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';
const BaseElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

export class UiIcon extends BaseElement {
  static readonly observedAttributes = [NAME_ATTRIBUTE, ICON_ATTRIBUTE, ARIA_LABEL_ATTRIBUTE];

  private readonly glyph = document.createElement('iconify-icon');
  private readonly glyphRoot: ShadowRoot;
  private collapsedDisplayBackup: string | null = null;

  constructor() {
    super();

    this.glyphRoot = this.attachShadow({ mode: 'open' });
    this.glyph.setAttribute('part', 'glyph');
    this.glyph.style.inlineSize = '1em';
    this.glyph.style.blockSize = '1em';
    this.glyph.style.display = 'inline-block';
    this.glyph.style.flexShrink = '0';
    this.glyphRoot.append(this.glyph);
  }

  get name(): IconName | null {
    const value = this.getAttribute(NAME_ATTRIBUTE)?.trim();
    if (value) {
      return value as IconName;
    }

    const legacyValue = this.getAttribute(ICON_ATTRIBUTE)?.trim();
    return legacyValue ? (legacyValue as IconName) : null;
  }

  set name(value: IconName | null) {
    if (value === null) {
      this.removeAttribute(NAME_ATTRIBUTE);
      return;
    }

    this.setAttribute(NAME_ATTRIBUTE, value);
  }

  get icon(): IconName | null {
    const value = this.getAttribute(ICON_ATTRIBUTE)?.trim();
    return value ? (value as IconName) : null;
  }

  set icon(value: IconName | null) {
    if (value === null) {
      this.removeAttribute(ICON_ATTRIBUTE);
      return;
    }

    this.setAttribute(ICON_ATTRIBUTE, value);
  }

  connectedCallback(): void {
    this.#sync();
  }

  attributeChangedCallback(): void {
    this.#sync();
  }

  #ensureHostPresentation(): void {
    if (this.style.display.length === 0) {
      this.style.display = 'inline-flex';
    }

    if (this.style.alignItems.length === 0) {
      this.style.alignItems = 'center';
    }

    if (this.style.justifyContent.length === 0) {
      this.style.justifyContent = 'center';
    }

    if (this.style.lineHeight.length === 0) {
      this.style.lineHeight = '1';
    }
  }

  #getResolvedName(): IconName | null {
    const canonicalName = this.getAttribute(NAME_ATTRIBUTE)?.trim();
    if (canonicalName) {
      return canonicalName as IconName;
    }

    const legacyName = this.getAttribute(ICON_ATTRIBUTE)?.trim();
    return legacyName ? (legacyName as IconName) : null;
  }

  #collapseHost(): void {
    this.collapsedDisplayBackup ??= this.style.display;

    this.style.display = 'none';
    this.removeAttribute('role');
    this.glyph.removeAttribute('icon');
    this.glyph.setAttribute('aria-hidden', 'true');
    this.glyph.removeAttribute('aria-label');
  }

  #expandHost(): void {
    if (this.collapsedDisplayBackup !== null) {
      this.style.display = this.collapsedDisplayBackup;
      this.collapsedDisplayBackup = null;
    }

    this.#ensureHostPresentation();
  }

  #sync(): void {
    const name = this.#getResolvedName();

    if (!name) {
      this.#collapseHost();
      return;
    }

    this.#expandHost();

    this.glyph.setAttribute('icon', `lucide:${name}`);

    const ariaLabel = this.getAttribute(ARIA_LABEL_ATTRIBUTE)?.trim();
    if (ariaLabel && ariaLabel.length > 0) {
      this.setAttribute('role', 'img');
      this.glyph.setAttribute('aria-hidden', 'false');
      this.glyph.setAttribute('aria-label', ariaLabel);
    } else {
      this.removeAttribute('role');
      this.glyph.setAttribute('aria-hidden', 'true');
      this.glyph.removeAttribute('aria-label');
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('ui-icon')) {
  customElements.define('ui-icon', UiIcon);
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-icon': UiIcon;
  }
}
