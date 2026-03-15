import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';
import '../../../lib/icons';
import '../button/button';
import '../dropdown/dropdown';

type PreviewPadding = 'normal' | 'none' | 'compact';
type PreviewAlign = 'center' | 'start' | 'stretch';
type PreviewTheme = 'page' | 'light' | 'dark';
type PreviewSurface = 'surface' | 'canvas' | 'muted';
type PreviewViewport = 'full' | 'tablet' | 'mobile';
type PreviewControl = 'theme' | 'surface' | 'viewport';

interface PreviewControlOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
}

const VALID_PADDING = new Set<PreviewPadding>(['normal', 'none', 'compact']);
const VALID_ALIGN = new Set<PreviewAlign>(['center', 'start', 'stretch']);
const VALID_THEMES = new Set<PreviewTheme>(['page', 'light', 'dark']);
const VALID_SURFACES = new Set<PreviewSurface>(['surface', 'canvas', 'muted']);
const VALID_VIEWPORTS = new Set<PreviewViewport>(['full', 'tablet', 'mobile']);
const VALID_CONTROLS = new Set<PreviewControl>(['theme', 'surface', 'viewport']);
const CONTROL_ORDER: PreviewControl[] = ['theme', 'surface', 'viewport'];

const THEME_OPTIONS: PreviewControlOption<PreviewTheme>[] = [
  { value: 'page', label: 'Page', shortLabel: 'Page', icon: 'lucide:monitor' },
  { value: 'light', label: 'Light', shortLabel: 'Light', icon: 'lucide:sun' },
  { value: 'dark', label: 'Dark', shortLabel: 'Dark', icon: 'lucide:moon' },
];

const SURFACE_OPTIONS: PreviewControlOption<PreviewSurface>[] = [
  { value: 'surface', label: 'Surface', shortLabel: 'Surface', icon: 'lucide:layers-3' },
  { value: 'canvas', label: 'Canvas', shortLabel: 'Canvas', icon: 'lucide:square' },
  { value: 'muted', label: 'Muted', shortLabel: 'Muted', icon: 'lucide:blend' },
];

const VIEWPORT_OPTIONS: PreviewControlOption<PreviewViewport>[] = [
  { value: 'full', label: 'Full', shortLabel: 'Full', icon: 'lucide:monitor' },
  { value: 'tablet', label: 'Tablet', shortLabel: 'Tablet', icon: 'lucide:tablet' },
  { value: 'mobile', label: 'Mobile', shortLabel: 'Mobile', icon: 'lucide:smartphone' },
];

const normalizeControls = (value: string): string => {
  if (value.trim() === '') {
    return '';
  }

  const seen = new Set<PreviewControl>();

  for (const token of value.trim().split(/\s+/)) {
    if (!VALID_CONTROLS.has(token as PreviewControl)) {
      continue;
    }
    seen.add(token as PreviewControl);
  }

  return CONTROL_ORDER.filter((control) => seen.has(control)).join(' ');
};

const findOption = <T extends string>(
  options: readonly PreviewControlOption<T>[],
  value: T,
): PreviewControlOption<T> =>
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  options.find((option) => option.value === value) ?? options[0]!;

/**
 * コードプレビューコンポーネント。
 *
 * UIのレンダリング結果（プレビュー）とソースコードを一体化して提示します。
 * 「See it, then understand it」の読み順を実現します。
 *
 * @slot preview - レンダリング結果を含む任意のHTML
 * @slot         - コードエリア（ui-code-block または ui-code-group を配置）
 * @slot toolbar - ヘッダー右側に配置するオプションのアクション領域
 */
@customElement('ui-code-preview')
export class CodePreview extends LitElement {
  static override styles = css`
    :host {
      --_ui-code-preview-breakout-width-default: 100%;
      --_ui-code-preview-breakout-margin-default: 0;

      /* ─── 子コンポーネントの breakout を無効化（本コンポーネントが担当） ─── */
      --ui-code-block-breakout-width: 100%;
      --ui-code-block-breakout-margin: 0;
      --ui-code-block-radius-top: 0;
      --ui-code-group-width: 100%;
      --ui-code-group-margin-inline: 0;

      display: block;
      width: var(--ui-code-preview-breakout-width, var(--_ui-code-preview-breakout-width-default));
      margin-inline: var(
        --ui-code-preview-breakout-margin,
        var(--_ui-code-preview-breakout-margin-default)
      );
      margin-block: var(--space-8, 2rem);

      --_ui-preview-color-scheme: inherit;
      --_ui-preview-primary: var(--primary, oklch(55% 0.2 250));
      --_ui-preview-primary-hover: var(--primary-hover, oklch(50% 0.2 250));
      --_ui-preview-on-primary: var(--on-primary, oklch(100% 0 0));
      --_ui-preview-danger: var(--danger, oklch(55% 0.2 25));
      --_ui-preview-on-danger: var(--on-danger, oklch(100% 0 0));
      --_ui-preview-success: var(--success, oklch(55% 0.18 145));
      --_ui-preview-on-success: var(--on-success, oklch(100% 0 0));
      --_ui-preview-warning: var(--warning, oklch(75% 0.16 85));
      --_ui-preview-on-warning: var(--on-warning, oklch(20% 0.05 85));
      --_ui-preview-bg-default: var(--bg-default, oklch(1 0 0));
      --_ui-preview-bg-surface-1: var(--bg-surface-1, var(--_ui-preview-bg-default));
      --_ui-preview-bg-surface-2: var(--bg-surface-2, oklch(100% 0 0));
      --_ui-preview-bg-surface-3: var(--bg-surface-3, oklch(100% 0 0));
      --_ui-preview-bg-fill-muted: var(--bg-fill-muted, oklch(96% 0 0));
      --_ui-preview-bg-fill-neutral: var(--bg-fill-neutral, oklch(20% 0 0 / 0.12));
      --_ui-preview-bg-hover: var(--bg-hover, oklch(20% 0 0 / 0.05));
      --_ui-preview-bg-active: var(--bg-active, oklch(55% 0.2 250 / 0.08));
      --_ui-preview-bg-surface-active: var(--bg-surface-active, var(--_ui-preview-bg-active));
      --_ui-preview-bg-danger-subtle: var(--bg-danger-subtle, oklch(96% 0.03 25));
      --_ui-preview-bg-warning-subtle: var(--bg-warning-subtle, oklch(96% 0.04 85));
      --_ui-preview-bg-highlight-subtle: var(--bg-highlight-subtle, oklch(96% 0.04 65));
      --_ui-preview-bg-success-subtle: var(--bg-success-subtle, oklch(96% 0.04 145));
      --_ui-preview-bg-tip-subtle: var(--bg-tip-subtle, oklch(96% 0.04 250));
      --_ui-preview-bg-note-subtle: var(--bg-note-subtle, oklch(96% 0 0));
      --_ui-preview-bg-table-ruler: var(--bg-table-ruler, oklch(20% 0 0 / 0.08));
      --_ui-preview-fg-default: var(--fg-default, oklch(20% 0 0));
      --_ui-preview-fg-muted: var(--fg-muted, oklch(45% 0 0));
      --_ui-preview-fg-subtle: var(--fg-subtle, oklch(60% 0 0));
      --_ui-preview-fg-on-primary: var(--fg-on-primary, var(--_ui-preview-on-primary));
      --_ui-preview-fg-warning: var(--fg-warning, oklch(55% 0.16 85));
      --_ui-preview-fg-success: var(--fg-success, var(--_ui-preview-success));
      --_ui-preview-fg-danger: var(--fg-danger, var(--_ui-preview-danger));
      --_ui-preview-fg-info: var(--fg-info, var(--_ui-preview-primary));
      --_ui-preview-border-default: var(--border-default, oklch(20% 0 0 / 0.12));
      --_ui-preview-border-muted: var(--border-muted, oklch(20% 0 0 / 0.06));
      --_ui-preview-border-ghost: var(--border-ghost, oklch(20% 0 0 / 0.04));
      --_ui-preview-border-danger: var(--border-danger, oklch(72% 0.15 25));
      --_ui-preview-border-warning: var(--border-warning, oklch(72% 0.15 85));
      --_ui-preview-border-on-inverted: var(
        --border-on-inverted,
        oklch(from var(--_ui-preview-fg-default) l c h / 0.1)
      );
      --_ui-preview-elevation-sm: var(--elevation-sm, 0 1px 2px oklch(0% 0 0 / 0.08));
      --_ui-preview-elevation-md: var(--elevation-md, 0 4px 12px oklch(0% 0 0 / 0.08));
      --_ui-preview-elevation-lg: var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12));
      --_ui-preview-elevation-glow: var(--elevation-glow, 0 0 12px oklch(65% 0.18 250 / 0.5));
      --_ui-preview-bg-default-rgb: var(--bg-default-rgb, 250, 250, 251);
      --_ui-preview-bg-surface-2-rgb: var(--bg-surface-2-rgb, 255, 255, 255);
      --_ui-code-preview-surface-bg: var(
        --ui-code-preview-preview-bg,
        var(--_ui-preview-bg-surface-2)
      );
      --_ui-preview-context-bg-default: var(--_ui-code-preview-surface-bg);
      --_ui-preview-context-bg-surface-1: var(--_ui-code-preview-surface-bg);
      --_ui-code-preview-frame-width: 100%;
    }

    :host([preview-theme='light']) {
      --_ui-preview-color-scheme: light;
      --_ui-preview-primary: oklch(55% 0.2 250);
      --_ui-preview-primary-hover: oklch(50% 0.2 250);
      --_ui-preview-on-primary: oklch(100% 0 0);
      --_ui-preview-danger: oklch(55% 0.2 25);
      --_ui-preview-on-danger: oklch(100% 0 0);
      --_ui-preview-success: oklch(55% 0.18 145);
      --_ui-preview-on-success: oklch(100% 0 0);
      --_ui-preview-warning: oklch(75% 0.16 85);
      --_ui-preview-on-warning: oklch(20% 0.05 85);
      --_ui-preview-bg-default: oklch(1 0 0);
      --_ui-preview-bg-surface-1: var(--_ui-preview-bg-default);
      --_ui-preview-bg-surface-2: oklch(100% 0 0);
      --_ui-preview-bg-surface-3: oklch(100% 0 0);
      --_ui-preview-bg-fill-muted: oklch(96% 0 0);
      --_ui-preview-bg-fill-neutral: oklch(from var(--_ui-preview-fg-default) l c h / 0.12);
      --_ui-preview-bg-hover: oklch(from var(--_ui-preview-fg-default) l c h / 0.05);
      --_ui-preview-bg-active: oklch(from var(--_ui-preview-primary) l c h / 0.08);
      --_ui-preview-bg-surface-active: var(--_ui-preview-bg-active);
      --_ui-preview-bg-danger-subtle: oklch(96% 0.03 25);
      --_ui-preview-bg-warning-subtle: oklch(96% 0.04 85);
      --_ui-preview-bg-highlight-subtle: oklch(96% 0.04 65);
      --_ui-preview-bg-success-subtle: oklch(96% 0.04 145);
      --_ui-preview-bg-tip-subtle: oklch(96% 0.04 250);
      --_ui-preview-bg-note-subtle: oklch(96% 0 0);
      --_ui-preview-bg-table-ruler: oklch(from var(--_ui-preview-fg-default) l c h / 0.08);
      --_ui-preview-fg-default: oklch(20% 0 0);
      --_ui-preview-fg-muted: oklch(45% 0 0);
      --_ui-preview-fg-subtle: oklch(60% 0 0);
      --_ui-preview-fg-on-primary: var(--_ui-preview-on-primary);
      --_ui-preview-fg-warning: oklch(55% 0.16 85);
      --_ui-preview-fg-success: var(--_ui-preview-success);
      --_ui-preview-fg-danger: var(--_ui-preview-danger);
      --_ui-preview-fg-info: var(--_ui-preview-primary);
      --_ui-preview-border-default: oklch(20% 0 0 / 0.12);
      --_ui-preview-border-muted: oklch(20% 0 0 / 0.06);
      --_ui-preview-border-ghost: oklch(20% 0 0 / 0.04);
      --_ui-preview-border-danger: oklch(72% 0.15 25);
      --_ui-preview-border-warning: oklch(72% 0.15 85);
      --_ui-preview-border-on-inverted: oklch(from var(--_ui-preview-fg-default) l c h / 0.1);
      --_ui-preview-bg-default-rgb: 250, 250, 251;
      --_ui-preview-bg-surface-2-rgb: 255, 255, 255;
    }

    :host([preview-theme='dark']) {
      --_ui-preview-color-scheme: dark;
      --_ui-preview-primary: oklch(65% 0.12 250);
      --_ui-preview-primary-hover: oklch(70% 0.18 250);
      --_ui-preview-on-primary: oklch(100% 0 0);
      --_ui-preview-danger: oklch(55% 0.2 25);
      --_ui-preview-on-danger: oklch(100% 0 0);
      --_ui-preview-success: oklch(55% 0.18 145);
      --_ui-preview-on-success: oklch(100% 0 0);
      --_ui-preview-warning: oklch(25% 0.16 85);
      --_ui-preview-on-warning: oklch(85% 0.16 85);
      --_ui-preview-bg-default: oklch(12% 0 0);
      --_ui-preview-bg-surface-1: var(--_ui-preview-bg-default);
      --_ui-preview-bg-surface-2: oklch(17% 0 0);
      --_ui-preview-bg-surface-3: oklch(22% 0 0);
      --_ui-preview-bg-fill-muted: oklch(9% 0 0);
      --_ui-preview-bg-fill-neutral: oklch(from var(--_ui-preview-fg-default) l c h / 0.12);
      --_ui-preview-bg-hover: oklch(from var(--_ui-preview-fg-default) l c h / 0.05);
      --_ui-preview-bg-active: oklch(from var(--_ui-preview-primary) l c h / 0.15);
      --_ui-preview-bg-surface-active: var(--_ui-preview-bg-active);
      --_ui-preview-bg-danger-subtle: oklch(25% 0.05 25);
      --_ui-preview-bg-warning-subtle: oklch(25% 0.05 85);
      --_ui-preview-bg-highlight-subtle: oklch(60% 0.05 65);
      --_ui-preview-bg-success-subtle: oklch(25% 0.05 145);
      --_ui-preview-bg-tip-subtle: oklch(25% 0.05 250);
      --_ui-preview-bg-note-subtle: oklch(20% 0 0);
      --_ui-preview-bg-table-ruler: oklch(from var(--_ui-preview-fg-default) l c h / 0.08);
      --_ui-preview-fg-default: oklch(90% 0 0);
      --_ui-preview-fg-muted: oklch(65% 0 0);
      --_ui-preview-fg-subtle: oklch(50% 0 0);
      --_ui-preview-fg-on-primary: var(--_ui-preview-on-primary);
      --_ui-preview-fg-warning: oklch(85% 0.16 85);
      --_ui-preview-fg-success: var(--_ui-preview-success);
      --_ui-preview-fg-danger: var(--_ui-preview-danger);
      --_ui-preview-fg-info: var(--_ui-preview-primary);
      --_ui-preview-border-default: oklch(90% 0 0 / 0.18);
      --_ui-preview-border-muted: oklch(90% 0 0 / 0.1);
      --_ui-preview-border-ghost: oklch(90% 0 0 / 0.06);
      --_ui-preview-border-danger: oklch(62% 0.2 25);
      --_ui-preview-border-warning: oklch(60% 0.14 85);
      --_ui-preview-border-on-inverted: oklch(from var(--_ui-preview-bg-default) l c h / 0.1);
      --_ui-preview-elevation-sm: 0 1px 2px oklch(0% 0 0 / 0.3);
      --_ui-preview-elevation-md: 0 4px 8px oklch(0% 0 0 / 0.4);
      --_ui-preview-elevation-lg: 0 8px 16px oklch(0% 0 0 / 0.5);
      --_ui-preview-elevation-glow: 0 0 12px oklch(65% 0.18 250 / 0.5);
      --_ui-preview-bg-default-rgb: 28, 29, 33;
      --_ui-preview-bg-surface-2-rgb: 40, 42, 47;
    }

    :host([preview-surface='surface']) {
      --_ui-code-preview-surface-bg: var(
        --ui-code-preview-preview-bg,
        var(--_ui-preview-bg-surface-2)
      );
      --_ui-preview-context-bg-default: var(--_ui-code-preview-surface-bg);
      --_ui-preview-context-bg-surface-1: var(--_ui-code-preview-surface-bg);
    }

    :host([preview-surface='canvas']) {
      --_ui-code-preview-surface-bg: var(--_ui-preview-bg-default);
      --_ui-preview-context-bg-default: var(--_ui-preview-bg-default);
      --_ui-preview-context-bg-surface-1: var(--_ui-preview-bg-default);
    }

    :host([preview-surface='muted']) {
      --_ui-code-preview-surface-bg: var(--_ui-preview-bg-fill-muted);
      --_ui-preview-context-bg-default: var(--_ui-preview-bg-fill-muted);
      --_ui-preview-context-bg-surface-1: var(--_ui-preview-bg-fill-muted);
    }

    :host([preview-viewport='tablet']) {
      --_ui-code-preview-frame-width: 768px;
    }

    :host([preview-viewport='mobile']) {
      --_ui-code-preview-frame-width: 375px;
    }

    /* ─── Root Container ─── */
    .root {
      border: var(--border-style-subtle, 1px solid oklch(20% 0 0 / 0.08));
      border-radius: var(--ui-code-preview-radius, var(--radius-md, 6px));
      overflow: hidden;
      background: var(--bg-fill-muted, oklch(96% 0 0));
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ─── Header ─── */
    .header {
      display: none;
      align-items: center;
      justify-content: flex-start;
      gap: var(--space-2, 0.5rem);
      padding: var(--space-4, 1rem) var(--space-4, 1rem);
      background: var(--_ui-code-preview-surface-bg);
      color: var(--_ui-preview-fg-default);
      border-bottom: none;
      min-block-size: var(--control-min-touch, 44px);
    }

    :host([data-show-header]) .header {
      display: flex;
    }

    .header-label {
      display: none;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--_ui-preview-fg-muted);
      font-size: var(--text-xs, 12px);
      font-weight: var(--font-medium, 500);
      letter-spacing: var(--tracking-wide, 0.025em);
    }

    :host([data-has-label]) .header-label {
      display: block;
    }

    .header-tools {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: var(--space-2, 0.5rem);
      flex-shrink: 0;
      margin-inline-start: auto;
      min-width: 0;
    }

    .header-control {
      display: inline-flex;
    }

    .header-control ui-button {
      --fg-default: var(--_ui-preview-fg-default);
      --fg-muted: var(--_ui-preview-fg-muted);
      --bg-hover: var(--_ui-preview-bg-hover);
    }

    .header-control ui-button iconify-icon {
      flex-shrink: 0;
    }

    .header-toolbar {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2, 0.5rem);
    }

    /* toolbar 内の操作要素は最低ターゲットサイズを保証 */
    ::slotted(button[slot='toolbar']),
    ::slotted(a[slot='toolbar']),
    ::slotted([role='button'][slot='toolbar']) {
      min-inline-size: 24px;
      min-block-size: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    @media (pointer: coarse) {
      ::slotted(button[slot='toolbar']),
      ::slotted(a[slot='toolbar']),
      ::slotted([role='button'][slot='toolbar']) {
        min-inline-size: var(--control-min-touch, 24px);
        min-block-size: var(--control-min-touch, 24px);
      }
    }

    /* ─── Preview Area ─── */
    .preview-area {
      display: flex;
      background: var(--_ui-code-preview-surface-bg);
      min-height: var(--ui-code-preview-preview-min-height, 72px);
      border-bottom: var(--border-width, 1px) solid var(--_ui-preview-border-default);
      /* Padding variant: normal（既定値） */
      padding: var(--space-4, 1rem);
      /* Align variant: center（既定値） */
      align-items: center;
      justify-content: center;
      color: var(--_ui-preview-fg-default);
    }

    /* Padding variants */
    :host([preview-padding='compact']) .preview-area {
      padding: var(--space-3, 0.75rem);
    }

    :host([preview-padding='none']) .preview-area {
      padding: 0;
    }

    :host([data-show-header]) .header {
      padding-bottom: 0;
    }

    /* ヘッダー表示時はヘッダーの下パディングと重複するため除去 */
    :host([data-show-header]) .preview-area {
      padding-top: 0;
    }

    /* Align variants */
    :host([preview-align='start']) .preview-area {
      align-items: flex-start;
      justify-content: flex-start;
    }

    :host([preview-align='stretch']) .preview-area {
      align-items: stretch;
      justify-content: flex-start;
    }

    .preview-frame {
      width: 100%;
      max-width: var(--_ui-code-preview-frame-width);
      max-inline-size: var(--_ui-code-preview-frame-width);
      box-sizing: border-box;
      flex: 0 1 auto;
      min-inline-size: 0;
      transition:
        width var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        max-width var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        max-inline-size var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host([preview-align='stretch']) .preview-frame {
      width: 100%;
      max-width: var(--_ui-code-preview-frame-width);
      max-inline-size: var(--_ui-code-preview-frame-width);
    }

    ::slotted([slot='preview']) {
      color-scheme: var(--_ui-preview-color-scheme);
      color: var(--_ui-preview-fg-default);
      --primary: var(--_ui-preview-primary);
      --primary-hover: var(--_ui-preview-primary-hover);
      --on-primary: var(--_ui-preview-on-primary);
      --danger: var(--_ui-preview-danger);
      --on-danger: var(--_ui-preview-on-danger);
      --success: var(--_ui-preview-success);
      --on-success: var(--_ui-preview-on-success);
      --warning: var(--_ui-preview-warning);
      --on-warning: var(--_ui-preview-on-warning);
      --bg-default: var(--_ui-preview-context-bg-default);
      --bg-surface-1: var(--_ui-preview-context-bg-surface-1);
      --bg-surface-2: var(--_ui-preview-bg-surface-2);
      --bg-surface-3: var(--_ui-preview-bg-surface-3);
      --bg-fill-muted: var(--_ui-preview-bg-fill-muted);
      --bg-fill-neutral: var(--_ui-preview-bg-fill-neutral);
      --bg-hover: var(--_ui-preview-bg-hover);
      --bg-active: var(--_ui-preview-bg-active);
      --bg-surface-active: var(--_ui-preview-bg-surface-active);
      --bg-danger-subtle: var(--_ui-preview-bg-danger-subtle);
      --bg-warning-subtle: var(--_ui-preview-bg-warning-subtle);
      --bg-highlight-subtle: var(--_ui-preview-bg-highlight-subtle);
      --bg-success-subtle: var(--_ui-preview-bg-success-subtle);
      --bg-tip-subtle: var(--_ui-preview-bg-tip-subtle);
      --bg-note-subtle: var(--_ui-preview-bg-note-subtle);
      --bg-table-ruler: var(--_ui-preview-bg-table-ruler);
      --fg-default: var(--_ui-preview-fg-default);
      --fg-muted: var(--_ui-preview-fg-muted);
      --fg-subtle: var(--_ui-preview-fg-subtle);
      --fg-on-primary: var(--_ui-preview-fg-on-primary);
      --fg-warning: var(--_ui-preview-fg-warning);
      --fg-success: var(--_ui-preview-fg-success);
      --fg-danger: var(--_ui-preview-fg-danger);
      --fg-info: var(--_ui-preview-fg-info);
      --border-default: var(--_ui-preview-border-default);
      --border-muted: var(--_ui-preview-border-muted);
      --border-ghost: var(--_ui-preview-border-ghost);
      --border-danger: var(--_ui-preview-border-danger);
      --border-warning: var(--_ui-preview-border-warning);
      --border-on-inverted: var(--_ui-preview-border-on-inverted);
      --elevation-sm: var(--_ui-preview-elevation-sm);
      --elevation-md: var(--_ui-preview-elevation-md);
      --elevation-lg: var(--_ui-preview-elevation-lg);
      --elevation-glow: var(--_ui-preview-elevation-glow);
      --bg-default-rgb: var(--_ui-preview-bg-default-rgb);
      --bg-surface-2-rgb: var(--_ui-preview-bg-surface-2-rgb);
    }

    :host([preview-align='stretch']) ::slotted([slot='preview']) {
      inline-size: 100%;
    }

    /* ─── Code Area ─── */

    /* 子 Code Block の外枠・breakout を除去し、親の外枠に統合 */
    ::slotted(ui-code-block) {
      width: 100% !important;
      margin-inline: 0 !important;
      --border-style-subtle: none;
      --ui-code-block-radius-bottom: var(--ui-code-preview-radius, var(--radius-md, 6px));
      border-radius: 0 0 var(--ui-code-preview-radius, var(--radius-md, 6px))
        var(--ui-code-preview-radius, var(--radius-md, 6px)) !important;
    }

    /* 子 Code Group の外枠・角丸を除去し、親の外枠に統合 */
    ::slotted(ui-code-group) {
      border: none !important;
      border-radius: 0 0 var(--ui-code-preview-radius, var(--radius-md, 6px))
        var(--ui-code-preview-radius, var(--radius-md, 6px)) !important;
    }

    /* ─── Forced Colors ─── */
    @media (forced-colors: active) {
      .root {
        border-color: CanvasText;
      }

      .header,
      .preview-area {
        background: Canvas;
        color: CanvasText;
        border-bottom-color: CanvasText;
      }

      .preview-area {
        /* プレビューとコードの区別のため太い境界線を使用 */
        border-bottom-width: var(--border-width-thick, 2px);
      }

      .header-control ui-button {
        --fg-default: CanvasText;
        --bg-hover: Highlight;
        --border-default: CanvasText;
      }
    }

    /* ─── Print ─── */
    @media print {
      :host {
        width: 100% !important;
        margin-inline: 0 !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .root {
        background: transparent !important;
        border-color: #000 !important;
      }

      .header {
        background: transparent !important;
        border-bottom-color: #000 !important;
      }

      .header-tools,
      .header-toolbar {
        display: none !important;
      }

      .preview-area {
        background: transparent !important;
        border-bottom-color: #000 !important;
        min-height: auto !important;
      }
    }
  `;

  /** オプションのヘッダーラベル。非空の場合、toolbar が空でもヘッダー領域を表示します。 */
  @property({ type: String, reflect: true })
  label = '';

  /** built-in controls を空白区切りで指定します。 */
  @property({ type: String, reflect: true })
  controls = '';

  /**
   * プレビュー領域の内部余白を制御します。
   * `normal`: --space-4（既定値）、`compact`: --space-3、`none`: 余白なし
   */
  @property({ type: String, attribute: 'preview-padding', reflect: true })
  previewPadding: PreviewPadding = 'normal';

  /**
   * プレビュー領域内のコンテンツ配置を制御します。
   * `center`: 中央揃え（既定値）、`start`: 左上揃え、`stretch`: 親幅いっぱい
   */
  @property({ type: String, attribute: 'preview-align', reflect: true })
  previewAlign: PreviewAlign = 'center';

  /** プレビュー領域だけに適用するテーマです。 */
  @property({ type: String, attribute: 'preview-theme', reflect: true })
  previewTheme: PreviewTheme = 'page';

  /** プレビュー領域だけに適用する面のコンテキストです。 */
  @property({ type: String, attribute: 'preview-surface', reflect: true })
  previewSurface: PreviewSurface = 'surface';

  /** プレビュー領域だけに適用するビューポート幅です。 */
  @property({ type: String, attribute: 'preview-viewport', reflect: true })
  previewViewport: PreviewViewport = 'full';

  @state()
  private _hasToolbarContent = false;

  @query('slot[name="toolbar"]')
  private _toolbarSlot?: HTMLSlotElement;

  @query('slot:not([name])')
  private _codeSlot?: HTMLSlotElement;

  override firstUpdated(): void {
    this._onToolbarSlotChange();
    this._onCodeSlotChange();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has('controls')) {
      const normalizedControls = normalizeControls(this.controls);
      if (normalizedControls !== this.controls) {
        this.controls = normalizedControls;
      }
    }

    if (changedProperties.has('previewPadding') && !VALID_PADDING.has(this.previewPadding)) {
      this.previewPadding = 'normal';
    }

    if (changedProperties.has('previewAlign') && !VALID_ALIGN.has(this.previewAlign)) {
      this.previewAlign = 'center';
    }

    if (changedProperties.has('previewTheme') && !VALID_THEMES.has(this.previewTheme)) {
      this.previewTheme = 'page';
    }

    if (changedProperties.has('previewSurface') && !VALID_SURFACES.has(this.previewSurface)) {
      this.previewSurface = 'surface';
    }

    if (changedProperties.has('previewViewport') && !VALID_VIEWPORTS.has(this.previewViewport)) {
      this.previewViewport = 'full';
    }

    this._syncHostAttributes();
  }

  private _syncHostAttributes(): void {
    const hasLabel = this.label.trim() !== '';
    const showHeader = hasLabel || this._hasToolbarContent || this._activeControls.length > 0;
    this.toggleAttribute('data-has-label', hasLabel);
    this.toggleAttribute('data-show-header', showHeader);
  }

  private _onToolbarSlotChange = (): void => {
    const slot = this._toolbarSlot;
    if (!slot) return;

    const hasMeaningful = slot.assignedNodes({ flatten: true }).some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return true;
      if (node.nodeType !== Node.TEXT_NODE) return false;
      return (node.textContent?.trim().length ?? 0) > 0;
    });

    this._hasToolbarContent = hasMeaningful;
  };

  private _onCodeSlotChange = (): void => {
    const slot = this._codeSlot;
    if (!slot) return;

    for (const element of slot.assignedElements({ flatten: true })) {
      const tag = element.tagName.toLowerCase();
      if (tag !== 'ui-code-block' && tag !== 'ui-code-group') continue;
      element.setAttribute('embedded', '');
    }
  };

  private get _groupAriaLabel(): string {
    const label = this.label.trim();
    return label !== '' ? label : 'コード プレビュー';
  }

  private get _activeControls(): PreviewControl[] {
    if (this.controls.trim() === '') {
      return [];
    }

    const enabled = new Set<PreviewControl>(this.controls.split(/\s+/) as PreviewControl[]);
    return CONTROL_ORDER.filter((control) => enabled.has(control));
  }

  private get _themeOption(): PreviewControlOption<PreviewTheme> {
    return findOption(THEME_OPTIONS, this.previewTheme);
  }

  private get _surfaceOption(): PreviewControlOption<PreviewSurface> {
    return findOption(SURFACE_OPTIONS, this.previewSurface);
  }

  private get _viewportOption(): PreviewControlOption<PreviewViewport> {
    return findOption(VIEWPORT_OPTIONS, this.previewViewport);
  }

  private _handleThemeSelect = (event: CustomEvent<{ value: string; label: string }>): void => {
    if (!VALID_THEMES.has(event.detail.value as PreviewTheme)) {
      return;
    }
    this.previewTheme = event.detail.value as PreviewTheme;
  };

  private _handleSurfaceSelect = (event: CustomEvent<{ value: string; label: string }>): void => {
    if (!VALID_SURFACES.has(event.detail.value as PreviewSurface)) {
      return;
    }
    this.previewSurface = event.detail.value as PreviewSurface;
  };

  private _handleViewportSelect = (event: CustomEvent<{ value: string; label: string }>): void => {
    if (!VALID_VIEWPORTS.has(event.detail.value as PreviewViewport)) {
      return;
    }
    this.previewViewport = event.detail.value as PreviewViewport;
  };

  private _renderControlButton<T extends string>(
    controlName: string,
    option: PreviewControlOption<T>,
  ) {
    return html`
      <ui-button slot="trigger" variant="ghost" size="sm" aria-label="${`${controlName} を変更`}">
        <iconify-icon icon="${option.icon}" aria-hidden="true"></iconify-icon>
        <span>${option.shortLabel}</span>
      </ui-button>
    `;
  }

  private _renderThemeControl() {
    return html`
      <ui-dropdown
        class="header-control"
        data-control="theme"
        align="end"
        @menu-item-select="${this._handleThemeSelect}"
      >
        ${this._renderControlButton('プレビューテーマ', this._themeOption)}
        ${THEME_OPTIONS.map(
          (option) => html`
            <ui-menu-item value="${option.value}">
              <iconify-icon icon="${option.icon}" aria-hidden="true"></iconify-icon>
              <span>${option.label}</span>
            </ui-menu-item>
          `,
        )}
      </ui-dropdown>
    `;
  }

  private _renderSurfaceControl() {
    return html`
      <ui-dropdown
        class="header-control"
        data-control="surface"
        align="end"
        @menu-item-select="${this._handleSurfaceSelect}"
      >
        ${this._renderControlButton('プレビュー面', this._surfaceOption)}
        ${SURFACE_OPTIONS.map(
          (option) => html`
            <ui-menu-item value="${option.value}">
              <iconify-icon icon="${option.icon}" aria-hidden="true"></iconify-icon>
              <span>${option.label}</span>
            </ui-menu-item>
          `,
        )}
      </ui-dropdown>
    `;
  }

  private _renderViewportControl() {
    return html`
      <ui-dropdown
        class="header-control"
        data-control="viewport"
        align="end"
        @menu-item-select="${this._handleViewportSelect}"
      >
        ${this._renderControlButton('プレビュービューポート', this._viewportOption)}
        ${VIEWPORT_OPTIONS.map(
          (option) => html`
            <ui-menu-item value="${option.value}">
              <iconify-icon icon="${option.icon}" aria-hidden="true"></iconify-icon>
              <span>${option.label}</span>
            </ui-menu-item>
          `,
        )}
      </ui-dropdown>
    `;
  }

  private _renderBuiltInControls() {
    if (this._activeControls.length === 0) {
      return nothing;
    }

    return html`
      ${this._activeControls.includes('theme') ? this._renderThemeControl() : nothing}
      ${this._activeControls.includes('surface') ? this._renderSurfaceControl() : nothing}
      ${this._activeControls.includes('viewport') ? this._renderViewportControl() : nothing}
    `;
  }

  override render() {
    return html`
      <div class="root" role="group" aria-label="${this._groupAriaLabel}">
        <div class="header">
          <span class="header-label">${this.label.trim()}</span>
          <div class="header-tools">
            ${this._renderBuiltInControls()}
            <div class="header-toolbar">
              <slot name="toolbar" @slotchange="${this._onToolbarSlotChange}"></slot>
            </div>
          </div>
        </div>

        <div class="preview-area">
          <div class="preview-frame">
            <slot name="preview"></slot>
          </div>
        </div>

        <div class="code-area">
          <slot @slotchange="${this._onCodeSlotChange}"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-code-preview': CodePreview;
  }
}
