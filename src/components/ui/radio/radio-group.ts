import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface ImportMetaEnvLike {
  DEV?: boolean;
}

interface RadioGroupStateDetail {
  reason: 'connected' | 'disconnected' | 'checked' | 'disabled' | 'name';
}

interface RadioLikeElement extends HTMLElement {
  checked: boolean;
  disabled: boolean;
  name: string;
}

const DEFAULT_REQUIRED_ERROR_MESSAGE = 'いずれか1つを選択してください。';
const RADIO_STATE_CHANGE_EVENT = 'ui-radio-state-change';
const IS_DEVELOPMENT = (import.meta as ImportMeta & { env?: ImportMetaEnvLike }).env?.DEV ?? true;

/**
 * ラジオグループコンテナ。
 *
 * - `role="radiogroup"` とラベル付けを提供
 * - `required` 時に「いずれか1つ選択」の検証を提供
 * - 配下 `ui-radio` の構造不整合を開発時に警告
 */
@customElement('ui-radio-group')
export class RadioGroup extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .group {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 8px);
    }

    .error-message {
      margin-top: var(--space-1, 4px);
      font-size: var(--text-sm, 13px);
      color: var(--fg-danger, oklch(55% 0.2 28));
      line-height: var(--line-height-normal, 1.5);
    }
  `;

  @property({ type: String })
  label = '';

  @property({ type: Boolean, reflect: true })
  required = false;

  @property({ type: Boolean, reflect: true })
  invalid = false;

  @property({ type: String, attribute: 'error-message' })
  errorMessage = '';

  private readonly _errorId = `radio-group-error-${Math.random().toString(36).substring(2, 11)}`;
  private _memberObserver: MutationObserver | null = null;
  private _lastDiagnosticKey = '';

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('change', this._handleChange as EventListener);
    this.addEventListener(RADIO_STATE_CHANGE_EVENT, this._handleRadioStateChange as EventListener);
    this._observeMembers();

    queueMicrotask(() => {
      if (!this.isConnected) {
        return;
      }

      this._handleMembersChanged();
    });
  }

  override disconnectedCallback(): void {
    this.removeEventListener('change', this._handleChange as EventListener);
    this.removeEventListener(RADIO_STATE_CHANGE_EVENT, this._handleRadioStateChange as EventListener);
    this._memberObserver?.disconnect();
    this._memberObserver = null;
    super.disconnectedCallback();
  }

  checkValidity(): boolean {
    if (!this.required) {
      return true;
    }

    return this._getGroupMembers().some((radio) => radio.checked && !radio.disabled);
  }

  reportValidity(): boolean {
    const valid = this.checkValidity();
    this.invalid = !valid;

    if (!valid && this.errorMessage === '') {
      this.errorMessage = DEFAULT_REQUIRED_ERROR_MESSAGE;
    }

    if (valid && this.errorMessage === DEFAULT_REQUIRED_ERROR_MESSAGE) {
      this.errorMessage = '';
    }

    return valid;
  }

  private _observeMembers(): void {
    if (typeof MutationObserver === 'undefined' || this._memberObserver) {
      return;
    }

    this._memberObserver = new MutationObserver(() => {
      this._handleMembersChanged();
    });

    this._memberObserver.observe(this, {
      childList: true,
      subtree: true,
    });
  }

  private _getGroupMembers(): RadioLikeElement[] {
    return [...this.querySelectorAll<RadioLikeElement>('ui-radio')].filter(
      (radio) => radio.closest('ui-radio-group') === this,
    );
  }

  private _getResolvedGroupMembers(member: RadioLikeElement): RadioLikeElement[] {
    if (member.name === '') {
      return [member];
    }

    const scope = member.closest('form') ?? (member.getRootNode() as Document | ShadowRoot);
    return [...scope.querySelectorAll<RadioLikeElement>(`ui-radio[name="${CSS.escape(member.name)}"]`)];
  }

  private _handleMembersChanged = (): void => {
    this._warnAuthoringIssues();

    if (this.required) {
      this.reportValidity();
    }
  };

  private _handleChange = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest('ui-radio-group') !== this) {
      return;
    }

    if (this.required) {
      this.reportValidity();
    }
  };

  private _handleRadioStateChange = (event: CustomEvent<RadioGroupStateDetail>): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest('ui-radio-group') !== this) {
      return;
    }

    this._handleMembersChanged();
  };

  private _warnAuthoringIssues(): void {
    if (!IS_DEVELOPMENT) {
      return;
    }

    const issues = this._collectAuthoringIssues();
    const diagnosticKey = issues.join('\n');

    if (diagnosticKey === '') {
      this._lastDiagnosticKey = '';
      return;
    }

    if (diagnosticKey === this._lastDiagnosticKey) {
      return;
    }

    this._lastDiagnosticKey = diagnosticKey;
    issues.forEach((issue) => {
      console.warn(`[ui-radio-group] ${issue}`, this);
    });
  }

  private _collectAuthoringIssues(): string[] {
    const members = this._getGroupMembers();
    if (members.length === 0) {
      return [];
    }

    const issues: string[] = [];
    const uniqueNames = [...new Set(members.map((radio) => radio.name))];
    const nonEmptyNames = uniqueNames.filter((name) => name !== '');

    if (members.some((radio) => radio.name === '')) {
      issues.push('空文字の `name` を持つ `ui-radio` が含まれています。');
    }

    if (nonEmptyNames.length > 1) {
      issues.push(
        `配下の \`ui-radio\` で \`name\` が一致していません: ${nonEmptyNames.join(', ')}`,
      );
    }

    nonEmptyNames.forEach((name) => {
      const firstMember = members.find((radio) => radio.name === name);
      if (!firstMember) {
        return;
      }

      const resolvedGroup = this._getResolvedGroupMembers(firstMember);
      if (resolvedGroup.some((radio) => radio.closest('ui-radio-group') !== this)) {
        issues.push(
          `\`name="${name}"\` の解決グループが現在の \`ui-radio-group\` 境界を跨いでいます。`,
        );
      }

      const checkedMembers = resolvedGroup.filter((radio) => radio.checked);
      if (checkedMembers.length > 1) {
        issues.push(
          `\`name="${name}"\` の解決グループで複数の \`checked=true\` が検出されました。`,
        );
      }
    });

    return issues;
  }

  override render() {
    const externalLabelledBy = this.getAttribute('aria-labelledby');
    const externalLabel = this.getAttribute('aria-label');
    const showError = this.invalid && this.errorMessage !== '';
    const describedBy = showError ? this._errorId : nothing;
    const ariaLabel = this.label !== '' ? this.label : (externalLabel ?? nothing);
    const ariaLabelledBy = this.label === '' ? (externalLabelledBy ?? nothing) : nothing;

    return html`
      <div
        class="group"
        role="radiogroup"
        aria-label="${ariaLabel}"
        aria-labelledby="${ariaLabelledBy}"
        aria-invalid="${showError ? 'true' : nothing}"
        aria-describedby="${describedBy}"
      >
        <slot @slotchange="${this._handleMembersChanged}"></slot>
      </div>
      ${showError
        ? html`
            <span id="${this._errorId}" class="error-message" aria-live="polite">
              ${this.errorMessage}
            </span>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-radio-group': RadioGroup;
  }
}
