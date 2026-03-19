export class RouterAnnouncer {
  private ariaLiveRegion: HTMLDivElement | null = null;

  constructor(private enabled: boolean) {}

  attach(): void {
    if (!this.enabled || this.ariaLiveRegion) {
      return;
    }

    const region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.style.cssText =
      'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;';
    document.body.appendChild(region);
    this.ariaLiveRegion = region;
  }

  announcePageChange(): void {
    if (!this.ariaLiveRegion) {
      return;
    }

    setTimeout(() => {
      if (!this.ariaLiveRegion) {
        return;
      }

      this.ariaLiveRegion.textContent = 'ページが読み込まれました';
      setTimeout(() => {
        if (this.ariaLiveRegion) {
          this.ariaLiveRegion.textContent = '';
        }
      }, 1000);
    }, 100);
  }

  destroy(): void {
    this.ariaLiveRegion?.remove();
    this.ariaLiveRegion = null;
  }
}
