import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { Router, type RouterOptions } from '../router.js';

export class RouterController implements ReactiveController {
  private _router: Router | null = null;
  isNavigating = false;

  constructor(private host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected(): void {
    // no-op
  }

  hostDisconnected(): void {
    this._router?.destroy();
    this._router = null;
  }

  initRouter(outlet: HTMLElement, options: RouterOptions = {}): Router {
    this._router = new Router(outlet, options);
    this._router.on('navigation:busy-change', ({ isNavigating }) => {
      this.isNavigating = isNavigating;
      this.host.requestUpdate();
    });

    return this._router;
  }

  get router(): Router | null {
    return this._router;
  }
}
