export type SidebarMode = 'fixed' | 'overlay';
export type SidebarState = 'expanded' | 'collapsed';
export type SidebarPresentation = 'auto' | SidebarMode;

export type SidebarReturnFocusDescriptor =
  | { readonly kind: 'sidebar-header-trigger'; readonly sidebarId: string }
  | { readonly kind: 'connected-element'; readonly element: HTMLElement };

export interface SidebarRuntimeSnapshot {
  readonly overlayState: SidebarState;
  readonly returnFocusDescriptor: SidebarReturnFocusDescriptor | null;
}
