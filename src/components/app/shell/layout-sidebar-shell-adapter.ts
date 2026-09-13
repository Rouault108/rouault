import type {
  PayloadDocumentShellSnapshot,
  PreparedShellUpdate,
  RuntimeDocumentShellSnapshot,
  RuntimeSidebarShellSnapshot,
  ShellUpdatePayload,
} from '../../../router/router.js';
import { createCanonicalAbsentRuntimeSidebarProjection } from '../../../../shared/navigation/sidebar-shell-projection-contract.js';
import { validateRuntimeSidebarProjection } from '../../../../shared/navigation/navigation-shell-validator.js';
import { layoutSidebarController } from '../../layout/layout-sidebar-controller.js';
import { LAYOUT_SIDEBAR_ROOT_SELECTOR } from '../../../../shared/navigation/sidebar-enhancement-contract.js';

export const SIDEBAR_ROOT_SELECTOR = LAYOUT_SIDEBAR_ROOT_SELECTOR;
const ATTRIBUTES = [
  'sidebar-id',
  'state-scope-id',
  'selected-id',
  'initial-expanded-ids',
  'topology-revision',
  'heading',
  'fixed-breakpoint',
  'presentation',
] as const;

const expandedIds = (root: Element): string[] => {
  const value: unknown = JSON.parse(root.getAttribute('initial-expanded-ids') ?? '[]');
  if (!Array.isArray(value) || value.some((id: unknown) => typeof id !== 'string'))
    throw new Error('invalid sidebar expanded ids');
  return value as string[];
};

export const readSidebarShellSnapshot = (root: Element): RuntimeSidebarShellSnapshot => {
  if (root.hasAttribute('hidden')) return createCanonicalAbsentRuntimeSidebarProjection();
  const nav = root.querySelector('nav[data-sidebar-nav]');
  if (!nav) throw new Error('present sidebar requires nav');
  const canonical = nav.cloneNode(true) as HTMLElement;
  const initialExpandedIds = expandedIds(root);
  for (const branch of canonical.querySelectorAll<HTMLDetailsElement>(
    'details[data-sidebar-nav-branch]',
  )) {
    branch.open = initialExpandedIds.includes(
      branch.parentElement?.getAttribute('data-node-id') ?? '',
    );
  }
  for (const element of [canonical, ...canonical.querySelectorAll('*')]) {
    for (const name of [
      'tabindex',
      'inert',
      'style',
      'data-sidebar-active',
      'data-active',
      'data-focused',
    ])
      element.removeAttribute(name);
  }
  return validateRuntimeSidebarProjection({
    present: true,
    sidebarId: root.getAttribute('sidebar-id'),
    stateScopeId: root.getAttribute('state-scope-id'),
    selectedId: root.getAttribute('selected-id'),
    initialExpandedIds,
    topologyRevision: root.getAttribute('topology-revision'),
    navHtml: canonical.outerHTML,
    heading: root.querySelector('[data-layout-sidebar-heading]')?.textContent ?? null,
    fixedBreakpoint: Number(root.getAttribute('fixed-breakpoint') ?? 1024),
    presentation: root.getAttribute('presentation') ?? 'auto',
  });
};

const prepareProjection = (snapshot: RuntimeSidebarShellSnapshot | null, root: HTMLElement) => {
  const validated = validateRuntimeSidebarProjection(
    snapshot ?? createCanonicalAbsentRuntimeSidebarProjection(),
  );
  const content = root.ownerDocument.createDocumentFragment();
  if (validated.present) {
    const template = root.ownerDocument.createElement('template');
    template.innerHTML = validated.navHtml;
    const nav = template.content.firstElementChild;
    if (template.content.children.length !== 1 || !nav?.matches('nav[data-sidebar-nav]'))
      throw new Error('sidebar projection requires one nav');
    if (validated.heading !== null) {
      const heading = root.ownerDocument.createElement('header');
      heading.setAttribute('data-layout-sidebar-heading', '');
      heading.textContent = validated.heading;
      content.append(heading);
    }
    content.append(nav);
  }
  const surface = root.querySelector('[data-layout-sidebar-surface]');
  const host = root.ownerDocument.querySelector<HTMLElement>('[data-app-shell-sidebar-host]');
  if (!surface || !host) throw new Error('sidebar shell structure is missing');
  return () => {
    // 検証・detached parse後だけlive DOMを変更し、controller stateはvalidationまで保留する。
    if (root.parentElement !== host) host.append(root);
    surface.replaceChildren(content);
    for (const name of ATTRIBUTES) root.removeAttribute(name);
    root.setAttribute('sidebar-id', validated.sidebarId);
    root.setAttribute('state-scope-id', validated.stateScopeId);
    root.setAttribute('presentation', validated.presentation);
    root.setAttribute('fixed-breakpoint', String(validated.fixedBreakpoint));
    if (validated.present) {
      root.setAttribute('initial-expanded-ids', JSON.stringify(validated.initialExpandedIds));
      root.setAttribute('topology-revision', validated.topologyRevision);
      if (validated.selectedId !== null) root.setAttribute('selected-id', validated.selectedId);
      if (validated.heading !== null) root.setAttribute('heading', validated.heading);
    }
    root.hidden = !validated.present;
    host.hidden = !validated.present;
    root.ownerDocument
      .querySelector('router-document-host')
      ?.setAttribute('data-sidebar-presence', validated.present ? 'present' : 'absent');
  };
};

export const applyPayloadShellSnapshot = (
  shell: PayloadDocumentShellSnapshot | null,
  _router: HTMLElement | null,
  _column: HTMLElement | null,
  root: HTMLElement | null,
): void => {
  if (root) prepareProjection(shell?.sidebarProjection ?? null, root)();
};
export const applyRuntimeSidebarSnapshotForRollback = (
  shell: RuntimeDocumentShellSnapshot | null,
  _router: HTMLElement | null,
  _column: HTMLElement | null,
  root: HTMLElement | null,
): void => {
  if (root) prepareProjection(shell?.sidebar ?? null, root)();
};
export const applySidebarSnapshot = applyPayloadShellSnapshot;

export const createLayoutSidebarShellAdapter = () => ({
  prepare(update: ShellUpdatePayload): PreparedShellUpdate {
    const root = document.querySelector<HTMLElement>(SIDEBAR_ROOT_SELECTOR);
    if (!root) throw new Error('persistent sidebar root is required');
    const previous = readSidebarShellSnapshot(root);
    const state = layoutSidebarController.readRuntimeSnapshot(previous.sidebarId);
    const commit = prepareProjection(update.shell.sidebarProjection, root);
    const rollback = prepareProjection(previous, root);
    return {
      commit,
      rollback() {
        rollback();
        layoutSidebarController.restoreRuntimeSnapshot(previous.sidebarId, state);
      },
    };
  },
});
