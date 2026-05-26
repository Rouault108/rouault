import { renderStaticIconHtml } from './icons/render-static-icon-html.js';

export type StaticCopyValueKind = 'short-text' | 'permalink';

export interface StaticCopyButtonExtraAttribute {
  readonly name: string;
  readonly value?: string | boolean;
}

interface StaticCopyButtonBaseOptions {
  readonly label: string;
  readonly disabled?: boolean;
  readonly controlClassName?: string;
  readonly buttonClassName?: string;
  readonly extraButtonAttributes?: readonly StaticCopyButtonExtraAttribute[];
}

interface StaticCopyButtonTargetOptions extends StaticCopyButtonBaseOptions {
  readonly targetId: string;
  readonly copyValue?: never;
  readonly copyKind?: never;
}

interface StaticCopyButtonValueOptions extends StaticCopyButtonBaseOptions {
  readonly targetId?: never;
  readonly copyValue: string;
  readonly copyKind: StaticCopyValueKind;
}

export type StaticCopyButtonOptions = StaticCopyButtonTargetOptions | StaticCopyButtonValueOptions;

export interface StaticCopyButtonContract {
  readonly controlClassNames: readonly string[];
  readonly buttonClassNames: readonly string[];
  readonly buttonAttributes: readonly StaticCopyButtonExtraAttribute[];
  readonly label: string;
  readonly disabled: boolean;
}

const splitClassNames = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/\s+/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const mergeClassNames = (base: readonly string[], extra: string | undefined): readonly string[] => {
  const merged = [...base];
  for (const className of splitClassNames(extra)) {
    if (!merged.includes(className)) {
      merged.push(className);
    }
  }
  return merged;
};

const escapeHtmlAttribute = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

const serializeAttribute = ({ name, value }: StaticCopyButtonExtraAttribute): string => {
  if (value === false) {
    return '';
  }
  if (value === true || value === undefined) {
    return ` ${name}`;
  }
  return ` ${name}="${escapeHtmlAttribute(value)}"`;
};

const normalizeSourceAttributes = (
  options: StaticCopyButtonOptions,
): readonly StaticCopyButtonExtraAttribute[] => {
  if ('targetId' in options) {
    const targetId = options.targetId.trim();
    if (targetId.length === 0) {
      throw new Error('static copy button requires a non-empty targetId.');
    }
    return [{ name: 'data-copy-target-id', value: targetId }];
  }

  if (options.copyKind !== 'short-text' && options.copyKind !== 'permalink') {
    throw new Error('static copy button copyValue requires copyKind short-text or permalink.');
  }
  return [
    { name: 'data-copy-kind', value: options.copyKind },
    { name: 'data-copy-value', value: options.copyValue },
  ];
};

export const createStaticCopyButtonContract = (
  options: StaticCopyButtonOptions,
): StaticCopyButtonContract => {
  const sourceAttributes = normalizeSourceAttributes(options);
  return {
    controlClassNames: mergeClassNames(['static-copy-control'], options.controlClassName),
    buttonClassNames: mergeClassNames(['static-copy-button'], options.buttonClassName),
    buttonAttributes: [
      { name: 'type', value: 'button' },
      { name: 'data-copy-button', value: 'true' },
      ...sourceAttributes,
      { name: 'data-copy-state', value: 'idle' },
      { name: 'aria-label', value: options.label },
      ...(options.disabled ? [{ name: 'disabled', value: true }] : []),
      ...(options.extraButtonAttributes ?? []),
    ],
    label: options.label,
    disabled: options.disabled ?? false,
  };
};

export const renderStaticCopyButtonHtml = (options: StaticCopyButtonOptions): string => {
  const contract = createStaticCopyButtonContract(options);
  const controlClass = escapeHtmlAttribute(contract.controlClassNames.join(' '));
  const buttonClass = escapeHtmlAttribute(contract.buttonClassNames.join(' '));
  const buttonAttributes = contract.buttonAttributes
    .map((attribute) => serializeAttribute(attribute))
    .join('');

  return `<span class="${controlClass}" data-copy-control="true"><button class="${buttonClass}"${buttonAttributes}>${renderStaticIconHtml(
    'copy',
  )}</button><span class="static-copy-button__status sr-only" role="status" aria-live="polite" data-copy-status="true"></span></span>`;
};
