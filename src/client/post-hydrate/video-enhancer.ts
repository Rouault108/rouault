import type { HydrationActivationResult } from '../../../shared/hydration/hydration-activation.js';
import { VideoController } from './video-controller.js';

const controllers = new WeakMap<HTMLElement, VideoController>();

export const activateVideo = (
  root: HTMLElement,
  signal: AbortSignal,
): HydrationActivationResult => {
  if (signal.aborted) return { status: 'aborted' };
  if (controllers.has(root)) return { status: 'skipped', reason: 'already-activated' };
  const lifetime = new AbortController();
  let controller: VideoController;
  try {
    controller = new VideoController(root, lifetime.signal);
  } catch (error) {
    lifetime.abort();
    const media = root.querySelector<HTMLVideoElement>(':scope > [data-video-player] > video');
    const controls = root.querySelector<HTMLElement>(
      ':scope > [data-video-player] > [data-video-enhanced-controls]',
    );
    if (media) media.controls = true;
    if (controls) controls.hidden = true;
    root.removeAttribute('data-video-enhanced');
    throw error;
  }
  controllers.set(root, controller);
  const cleanup = (): void => {
    lifetime.abort();
    controller.destroy();
    controllers.delete(root);
    signal.removeEventListener('abort', cleanup);
  };
  signal.addEventListener('abort', cleanup, { once: true });
  return { status: 'activated', cleanup };
};
