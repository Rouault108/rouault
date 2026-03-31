export class FocusManager {
  focusMainContent(outlet: HTMLElement): void {
    if (!outlet.hasAttribute('tabindex')) {
      outlet.setAttribute('tabindex', '-1');
    }
    outlet.focus({ preventScroll: true });
  }
}
