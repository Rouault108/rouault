export class ReinitializeHookRegistry {
  private hooks = new Set<() => void>();

  add(hook: () => void): void {
    this.hooks.add(hook);
  }

  remove(hook: () => void): void {
    this.hooks.delete(hook);
  }

  run(): void {
    this.hooks.forEach((hook) => {
      try {
        hook();
      } catch (error) {
        console.error('Error in reinitialize hook:', error);
      }
    });
  }

  clear(): void {
    this.hooks.clear();
  }
}