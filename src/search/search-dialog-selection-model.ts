export type SearchDialogFocusTarget = 'input' | 'clear-button' | 'close-button';

export type SearchDialogTraversalOrigin = 'input' | 'clear-button' | 'close-button';

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
  setActiveId(activeId: string | null): void;
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
      activeIndex < 0 ? (delta === 1 ? 0 : total - 1) : (activeIndex + delta + total) % total;
    this.host.setActiveId(this.host.getResultIdAt(nextIndex));
  }

  selectActive(method: 'keyboard' | 'pointer'): void {
    if (this.host.isLoading() || this.host.isUnavailable()) return;
    const activeId = this.host.getActiveId() ?? this.host.getResultIdAt(0);
    if (activeId !== null) this.host.requestSelection(activeId, method);
  }

  setActiveByIndex(index: number): void {
    if (this.host.isLoading() || this.host.isUnavailable()) return;
    const activeId = this.host.getResultIdAt(index);
    if (activeId !== null) this.host.setActiveId(activeId);
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
