import type { MdastNode, VFileLike } from '../types.js';
import {
  PREVIEW_ALIGN_MODES,
  PREVIEW_PADDING_MODES,
  PREVIEW_SURFACES,
  PREVIEW_THEMES,
  PREVIEW_VIEWPORTS,
} from '../shared/constants.js';
import { pickOptional } from '../parser-core/parse-attributes.js';
import { toError } from '../shared/errors.js';
import {
  parseBooleanAttribute,
  parseEnumListAttribute,
  parseIntegerMin,
} from './normalize-helpers.js';
import { validatePreviewSandboxBaseUrl } from '../../../rehype/preview-sandbox-link-contract.js';
import type { NotePolicyContext } from '../policy/note-policy-context.js';
import type {
  CodePreviewPayload,
  PreviewSandboxPayload,
  PreviewSlotPayload,
  ToolbarSlotPayload,
} from './payload-types.js';

const PREVIEW_CONTROLS = ['theme', 'surface', 'viewport'] as const;
const MANUAL_ONLY_PREVIEW_SANDBOX_CAPABILITIES = [
  'allow-forms',
  'allow-downloads',
  'allow-pointer-lock',
  'allow-popups',
] as const;

export const normalizeCodePreviewPayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): CodePreviewPayload => {
  const previewPadding = pickOptional(attrs['preview-padding'])?.toLowerCase();
  if (previewPadding && !PREVIEW_PADDING_MODES.has(previewPadding)) {
    throw toError(
      file,
      node,
      'code-preview の preview-padding は normal/compact/none のみ指定可能です',
    );
  }

  const previewAlign = pickOptional(attrs['preview-align'])?.toLowerCase();
  if (previewAlign && !PREVIEW_ALIGN_MODES.has(previewAlign)) {
    throw toError(
      file,
      node,
      'code-preview の preview-align は center/start/stretch のみ指定可能です',
    );
  }

  const previewTheme = pickOptional(attrs['preview-theme'])?.toLowerCase();
  if (previewTheme && !PREVIEW_THEMES.has(previewTheme)) {
    throw toError(file, node, 'code-preview の preview-theme は page/light/dark のみ指定可能です');
  }

  const previewSurface = pickOptional(attrs['preview-surface'])?.toLowerCase();
  if (previewSurface && !PREVIEW_SURFACES.has(previewSurface)) {
    throw toError(
      file,
      node,
      'code-preview の preview-surface は surface/canvas/muted のみ指定可能です',
    );
  }

  const previewViewport = pickOptional(attrs['preview-viewport'])?.toLowerCase();
  if (previewViewport && !PREVIEW_VIEWPORTS.has(previewViewport)) {
    throw toError(
      file,
      node,
      'code-preview の preview-viewport は full/tablet/mobile のみ指定可能です',
    );
  }

  return {
    kind: 'code-preview',
    ...(pickOptional(attrs['heading']) ? { heading: pickOptional(attrs['heading']) } : {}),
    ...(parseEnumListAttribute(
      attrs['controls'],
      node,
      file,
      'code-preview',
      'controls',
      PREVIEW_CONTROLS,
    )
      ? {
          controls: parseEnumListAttribute(
            attrs['controls'],
            node,
            file,
            'code-preview',
            'controls',
            PREVIEW_CONTROLS,
          ),
        }
      : {}),
    ...(previewPadding
      ? { previewPadding: previewPadding as CodePreviewPayload['previewPadding'] }
      : {}),
    ...(previewAlign ? { previewAlign: previewAlign as CodePreviewPayload['previewAlign'] } : {}),
    ...(previewTheme ? { previewTheme: previewTheme as CodePreviewPayload['previewTheme'] } : {}),
    ...(previewSurface
      ? { previewSurface: previewSurface as CodePreviewPayload['previewSurface'] }
      : {}),
    ...(previewViewport
      ? { previewViewport: previewViewport as CodePreviewPayload['previewViewport'] }
      : {}),
  };
};

export const normalizePreviewSlotPayload = (): PreviewSlotPayload => ({
  kind: 'preview',
});

export const normalizeToolbarSlotPayload = (): ToolbarSlotPayload => ({
  kind: 'toolbar',
});

const normalizePreviewSandboxBaseUrl = (
  value: string,
  policyContext: NotePolicyContext | undefined,
  node: MdastNode,
  file?: VFileLike,
): string => {
  const urlPolicyContext = policyContext?.urlPolicyContext;
  if (!urlPolicyContext) {
    throw toError(file, node, 'preview-sandbox の base-url 検証には URL policy context が必要です');
  }

  try {
    return validatePreviewSandboxBaseUrl(value, urlPolicyContext.siteUrlContext);
  } catch {
    throw toError(
      file,
      node,
      'preview-sandbox の base-url は same-origin かつ basePath 配下の /assets/preview/ または /media/preview/ に限定します',
    );
  }
};

export const normalizePreviewSandboxPayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
  policyContext?: NotePolicyContext,
): PreviewSandboxPayload => {
  const baseUrl = pickOptional(attrs['base-url']);
  const normalizedBaseUrl = baseUrl
    ? normalizePreviewSandboxBaseUrl(baseUrl, policyContext, node, file)
    : undefined;

  const activationPolicy = pickOptional(attrs['activation-policy']);
  if (activationPolicy && !['eager', 'visible', 'manual'].includes(activationPolicy)) {
    throw toError(
      file,
      node,
      'preview-sandbox の activation-policy は eager/visible/manual で指定してください',
    );
  }

  const allowJs =
    parseBooleanAttribute(attrs['allow-js'], node, file, 'preview-sandbox', 'allow-js') === true;
  const allowForms =
    parseBooleanAttribute(attrs['allow-forms'], node, file, 'preview-sandbox', 'allow-forms') ===
    true;
  const allowDownloads =
    parseBooleanAttribute(
      attrs['allow-downloads'],
      node,
      file,
      'preview-sandbox',
      'allow-downloads',
    ) === true;
  const allowPointerLock =
    parseBooleanAttribute(
      attrs['allow-pointer-lock'],
      node,
      file,
      'preview-sandbox',
      'allow-pointer-lock',
    ) === true;
  const allowPopups =
    parseBooleanAttribute(attrs['allow-popups'], node, file, 'preview-sandbox', 'allow-popups') ===
    true;
  const hasManualOnlyCapability =
    allowForms || allowDownloads || allowPointerLock || allowPopups;

  if (hasManualOnlyCapability && (activationPolicy === 'visible' || activationPolicy === 'eager')) {
    throw toError(
      file,
      node,
      `preview-sandbox の ${MANUAL_ONLY_PREVIEW_SANDBOX_CAPABILITIES.join(
        '/',
      )} は activation-policy="manual" でのみ使用できます`,
    );
  }

  const normalizedActivationPolicy =
    activationPolicy ?? (hasManualOnlyCapability ? 'manual' : undefined);

  const heightMode = pickOptional(attrs['height-mode']);
  if (heightMode && !['fixed', 'auto', 'bounded-auto'].includes(heightMode)) {
    throw toError(
      file,
      node,
      'preview-sandbox の height-mode は fixed/auto/bounded-auto で指定してください',
    );
  }

  return {
    kind: 'preview-sandbox',
    ...(pickOptional(attrs['iframe-title'])
      ? { iframeTitle: pickOptional(attrs['iframe-title']) }
      : {}),
    ...(normalizedBaseUrl ? { baseUrl: normalizedBaseUrl } : {}),
    allowJs,
    ...(normalizedActivationPolicy
      ? {
          activationPolicy:
            normalizedActivationPolicy as PreviewSandboxPayload['activationPolicy'],
        }
      : {}),
    ...(heightMode
      ? {
          heightMode: heightMode as PreviewSandboxPayload['heightMode'],
        }
      : {}),
    allowForms,
    allowDownloads,
    allowPointerLock,
    allowPopups,
    ...(typeof parseIntegerMin(attrs['height'], node, file, 'preview-sandbox', 'height', 1) ===
    'number'
      ? {
          height: parseIntegerMin(attrs['height'], node, file, 'preview-sandbox', 'height', 1),
        }
      : {}),
    ...(typeof parseIntegerMin(
      attrs['max-height'],
      node,
      file,
      'preview-sandbox',
      'max-height',
      1,
    ) === 'number'
      ? {
          maxHeight: parseIntegerMin(
            attrs['max-height'],
            node,
            file,
            'preview-sandbox',
            'max-height',
            1,
          ),
        }
      : {}),
  };
};
