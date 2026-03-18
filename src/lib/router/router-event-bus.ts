import type { EventCallback } from './router-types.js';

export class RouterEventBus {
  private eventListeners = new Map<string, Set<EventCallback>>();

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners) {
      return;
    }

    listeners.forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in ${event} event handler:`, error);
      }
    });
  }

  emitCancelable(event: string, ...args: unknown[]): boolean {
    const listeners = this.eventListeners.get(event);
    if (!listeners) {
      return true;
    }

    for (const callback of listeners) {
      try {
        const result = callback(...args);
        if (result === false) {
          return false;
        }
      } catch (error) {
        console.error(`Error in ${event} event handler:`, error);
        if (event !== 'error') {
          this.emit('error', error instanceof Error ? error : new Error(String(error)));
        }
        return false;
      }
    }

    return true;
  }

  clear(): void {
    this.eventListeners.clear();
  }
}