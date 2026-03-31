import type { RouterEventMap } from './router-types.js';

type EventKey = keyof RouterEventMap;
type EventCallback<K extends EventKey> = (payload: RouterEventMap[K]) => void;

export class RouterEventBus {
  private eventListeners = new Map<EventKey, Set<(payload: unknown) => void>>();

  on<K extends EventKey>(event: K, callback: EventCallback<K>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback as (payload: unknown) => void);
  }

  off<K extends EventKey>(event: K, callback: EventCallback<K>): void {
    this.eventListeners.get(event)?.delete(callback as (payload: unknown) => void);
  }

  emit<K extends EventKey>(event: K, payload: RouterEventMap[K]): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) {
      return;
    }

    for (const callback of listeners) {
      callback(payload);
    }
  }

  clear(): void {
    this.eventListeners.clear();
  }
}
