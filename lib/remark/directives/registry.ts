import type { DirectiveHandler, DirectiveName } from './types';
import {
  calloutHandler,
  codeGroupHandler,
  detailsHandler,
  infoBoxHandler,
  linkCardHandler,
} from './surface';
import {
  codePreviewHandler,
  previewSandboxHandler,
  previewSlotHandler,
  toolbarSlotHandler,
} from './preview';
import { tabsHandler, tabSlotHandler, panelSlotHandler } from './tabs';
import { scoreHandler } from './media';
import { translationHandler } from './translation';

export const directiveHandlers: Record<DirectiveName, DirectiveHandler> = {
  callout: calloutHandler,
  'code-group': codeGroupHandler,
  'code-preview': codePreviewHandler,
  'preview-sandbox': previewSandboxHandler,
  details: detailsHandler,
  'info-box': infoBoxHandler,
  'link-card': linkCardHandler,
  score: scoreHandler,
  tabs: tabsHandler,
  translation: translationHandler,
  preview: previewSlotHandler,
  toolbar: toolbarSlotHandler,
  tab: tabSlotHandler,
  panel: panelSlotHandler,
};