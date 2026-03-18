import type { DirectiveName } from '../types';
import type { DirectiveValidator } from './types';
import { codePreviewValidator } from './code-preview';
import { previewSandboxValidator } from './preview-sandbox';
import { panelValidator, tabValidator, tabsValidator } from './tabs';

export const directiveValidators: Partial<Record<DirectiveName, DirectiveValidator>> = {
  'code-preview': codePreviewValidator,
  'preview-sandbox': previewSandboxValidator,
  tabs: tabsValidator,
  tab: tabValidator,
  panel: panelValidator,
};