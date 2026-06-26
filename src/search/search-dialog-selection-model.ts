export type SearchDialogFocusTarget = 'input' | 'clear-button' | 'close-button';

export type SearchDialogTraversalOrigin = 'input' | 'clear-button' | 'close-button';

export type SearchDialogActiveChangeOrigin =
  | 'keyboard-navigation'
  | 'pointer'
  | 'state-reset'
  | 'passive-scroll';

export interface SearchDialogTraversalIntent {
  readonly origin: SearchDialogTraversalOrigin;
  readonly shiftKey: boolean;
}

export interface SearchDialogSelectionHost {
  isLoading(): boolean;
  isUnavailable(): boolean;
  isClearButtonVisible(): boolean;
  getResultCount(): number;
  getResultIdAt(index: number): string | null;
  getActiveId(): string | null;
  getNavigationStartIndex(delta: 1 | -1): number | null;
  setActiveId(activeId: string | null, origin: SearchDialogActiveChangeOrigin): void;
  requestSelection(activeId: string, modality: 'keyboard' | 'pointer'): void;
  requestFocus(target: SearchDialogFocusTarget): void;
}

export class SearchDialogSelectionModel {
  constructor(private readonly host: SearchDialogSelectionHost) {}

  moveActive(delta: 1 | -1): void {
    if (this.host.isLoading() || this.host.isUnavailable()) return;
    const total = this.host.getResultCount();
    if (total === 0) return;
    const activeId = this.host.getActiveId();
    let activeIndex = -1;
    for (let index = 0; index < total; index += 1) {
      if (this.host.getResultIdAt(index) === activeId) {
        activeIndex = index;
        break;
      }
    }
    const nextIndex =
      activeIndex < 0
        ? this.host.getNavigationStartIndex(delta)
        : (activeIndex + delta + total) % total;
    if (nextIndex === null) return;
    this.host.setActiveId(this.host.getResultIdAt(nextIndex), 'keyboard-navigation');
  }

  selectActive(method: 'keyboard' | 'pointer'): void {
    if (this.host.isLoading() || this.host.isUnavailable()) return;
    const activeId = this.host.getActiveId();
    if (activeId !== null) this.host.requestSelection(activeId, method);
  }

  setActiveByIndex(index: number, origin: SearchDialogActiveChangeOrigin): void {
    if (this.host.isLoading() || this.host.isUnavailable()) return;
    const activeId = this.host.getResultIdAt(index);
    if (activeId !== null) this.host.setActiveId(activeId, origin);
  }

  handleForwardTabFromInput(): void {
    this.host.requestFocus(this.host.isClearButtonVisible() ? 'clear-button' : 'close-button');
  }

  handleAuxiliaryTraversal(intent: SearchDialogTraversalIntent): void {
    if (intent.origin === 'clear-button') {
      this.host.requestFocus(intent.shiftKey ? 'input' : 'close-button');
      return;
    }
    if (intent.origin === 'close-button' && intent.shiftKey) {
      this.host.requestFocus(this.host.isClearButtonVisible() ? 'clear-button' : 'input');
    }
  }
}
