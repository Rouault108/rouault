import { getDirectiveNameFromNode } from '../grammar/directive-grammar.js';
import {
  getCodePreviewControlsRestrictionMessage,
  getCodePreviewToolbarRestrictionMessage,
  getPreviewSandboxRestrictionMessage,
} from '../policy/preview-policy.js';
import { getSandboxJavaScriptRestrictionMessage } from '../policy/sandbox-policy.js';
import type { NotePolicyContext } from '../policy/note-policy-context.js';
import { getDirectivePayload } from '../payload/registry.js';
import type { CodePreviewPayload, PreviewSandboxPayload } from '../payload/payload-types.js';
import { toError } from '../shared/errors.js';
import type { MdastNode, VFileLike } from '../types.js';

const validatePreviewSandboxPolicy = (
  node: MdastNode,
  policyContext: NotePolicyContext,
  file?: VFileLike,
): void => {
  const restrictionMessage = getPreviewSandboxRestrictionMessage(policyContext);
  if (restrictionMessage) {
    throw toError(file, node, restrictionMessage);
  }

  const payload = getDirectivePayload<PreviewSandboxPayload>(node);
  if (payload?.allowJs) {
    const scriptRestriction = getSandboxJavaScriptRestrictionMessage(policyContext);
    if (scriptRestriction) {
      throw toError(file, node, scriptRestriction);
    }
  }
};

const validateCodePreviewPolicy = (
  node: MdastNode,
  policyContext: NotePolicyContext,
  file?: VFileLike,
): void => {
  const payload = getDirectivePayload<CodePreviewPayload>(node);
  if (payload?.controls && payload.controls.length > 0) {
    const controlsRestriction = getCodePreviewControlsRestrictionMessage(policyContext);
    if (controlsRestriction) {
      throw toError(file, node, controlsRestriction);
    }
  }

  const hasToolbar = (node.children ?? []).some(
    (child) => getDirectiveNameFromNode(child) === 'toolbar',
  );
  if (hasToolbar) {
    const toolbarRestriction = getCodePreviewToolbarRestrictionMessage(policyContext);
    if (toolbarRestriction) {
      throw toError(file, node, toolbarRestriction);
    }
  }
};

export const validatePolicy = (
  nodes: MdastNode[],
  policyContext: NotePolicyContext,
  file?: VFileLike,
): void => {
  for (const node of nodes) {
    const directiveName = getDirectiveNameFromNode(node);
    if (directiveName === 'preview-sandbox') {
      validatePreviewSandboxPolicy(node, policyContext, file);
    }
    if (directiveName === 'code-preview') {
      validateCodePreviewPolicy(node, policyContext, file);
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      validatePolicy(node.children, policyContext, file);
    }
  }
};
