import type { SidebarMode, SidebarState } from '../../../shared/navigation/sidebar-presentation.js';

export interface SidebarHeaderDisplay {
  readonly mode: SidebarMode;
  readonly state: SidebarState;
  readonly active: boolean;
  readonly triggerVisible: boolean;
}

export interface SidebarHeaderPort {
  readonly header: HTMLElement;
  readonly button: HTMLButtonElement | null;
  readonly sidebarId: string;
  readonly generation: number;
  render(display: SidebarHeaderDisplay): void;
}

export interface SidebarPresentationOwner {
  refresh(): void;
  beforeMutation(handoff: boolean, preservePlacement: boolean): () => void;
  retireHeader(port: SidebarHeaderPort, clear: () => void): void;
}

interface Binding {
  header?: SidebarHeaderPort;
  owner?: SidebarPresentationOwner;
}

// headerとsidebarの起動順を所有権に使わず、同じshell内の同期窓口だけを共有する。
const bindings = new WeakMap<Element, Binding>();
const binding = (shell: Element): Binding => {
  let value = bindings.get(shell);
  if (!value) {
    value = {};
    bindings.set(shell, value);
  }
  return value;
};

export const readSidebarHeaderPort = (shell: Element): SidebarHeaderPort | undefined =>
  bindings.get(shell)?.header;

export const connectSidebarPresentationOwner = (
  shell: Element,
  owner: SidebarPresentationOwner,
): (() => void) => {
  const value = binding(shell);
  value.owner = owner;
  return () => {
    if (value.owner === owner) delete value.owner;
  };
};

export const connectSidebarHeaderPort = (
  shell: Element,
  port: SidebarHeaderPort,
  clear: () => void,
): (() => void) => {
  const value = binding(shell);
  value.header = port;
  value.owner?.refresh();
  return () => {
    if (value.header !== port) return;
    delete value.header;
    // clearより前に、退役するbutton上のfocusを記録し、可視baselineへ引き渡す。
    if (value.owner) value.owner.retireHeader(port, clear);
    else clear();
  };
};

export const beforeSidebarShellMutation = (element: Element, handoff = false): (() => void) => {
  const shell = element.closest('[data-app-shell-root]');
  return (
    (shell
      ? bindings
          .get(shell)
          ?.owner?.beforeMutation(handoff, handoff && element.matches('header[data-layout-header]'))
      : undefined) ??
    (() => {
      /* 未enhanceの静的surfaceは処理不要。 */
    })
  );
};
