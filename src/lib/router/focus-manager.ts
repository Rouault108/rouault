export class FocusManager {
  focusMainContent(outlet: HTMLElement): void {
    const mainHeading = outlet.querySelector('h1, h2');

    if (mainHeading instanceof HTMLElement) {
      if (!mainHeading.hasAttribute('tabindex')) {
        mainHeading.setAttribute('tabindex', '-1');
      }
      mainHeading.focus({ preventScroll: true });
      return;
    }

    if (!outlet.hasAttribute('tabindex')) {
      outlet.setAttribute('tabindex', '-1');
    }
    outlet.focus({ preventScroll: true });
  }
}