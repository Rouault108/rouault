interface VideoControlsLayoutState {
  readonly inline: boolean;
  readonly inlineVolume: boolean;
}

// breakpointsはCSSを正本とし、同じcontrolを動かして視覚順とTab順を揃える。
export class VideoControlsLayout {
  private readonly bar: HTMLElement;
  private readonly timeline: HTMLElement;
  private readonly playback: HTMLElement;
  private readonly sound: HTMLElement;
  private readonly observer: ResizeObserver | undefined;

  constructor(
    player: HTMLElement,
    controls: HTMLElement,
    private readonly onResize: () => void,
    private readonly signal: AbortSignal,
  ) {
    const bar = controls.querySelector<HTMLElement>('.floating-bar');
    const timeline = bar?.querySelector<HTMLElement>('.bar-row-top');
    const playback = bar?.querySelector<HTMLElement>('.bar-group-left');
    const sound = bar?.querySelector<HTMLElement>('.bar-group-right');
    if (!bar || !timeline || !playback || !sound)
      throw new Error('[video] control groupが必要です');
    this.bar = bar;
    this.timeline = timeline;
    this.playback = playback;
    this.sound = sound;
    const view = player.ownerDocument.defaultView;
    if (view?.ResizeObserver) {
      this.observer = new view.ResizeObserver(onResize);
      this.observer.observe(player);
    } else {
      view?.addEventListener('resize', onResize, { signal });
    }
    signal.addEventListener('abort', this.destroy, { once: true });
  }

  read(): VideoControlsLayoutState {
    const style = this.bar.ownerDocument.defaultView?.getComputedStyle(this.bar);
    return {
      inline: style?.getPropertyValue('--video-controls-layout').trim() === 'inline',
      inlineVolume: style?.getPropertyValue('--video-volume-layout').trim() === 'inline',
    };
  }

  sync(inline: boolean, dragging: boolean): void {
    // native rangeのdrag中にreparentして操作を中断しない。
    if (dragging) return;
    const next = inline ? this.sound : this.playback;
    if (this.timeline.nextElementSibling === next) return;
    const document = this.bar.ownerDocument;
    const active = document.activeElement;
    const restoreFocus = active instanceof HTMLElement && this.timeline.contains(active);
    this.bar.insertBefore(this.timeline, next);
    if (restoreFocus && document.activeElement !== active) active.focus({ preventScroll: true });
  }

  destroy = (): void => {
    this.observer?.disconnect();
    this.signal.removeEventListener('abort', this.destroy);
    this.bar.ownerDocument.defaultView?.removeEventListener('resize', this.onResize);
  };
}
