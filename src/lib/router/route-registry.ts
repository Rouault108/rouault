import type { RouteDefinition, RouteHandler } from './router-types.js';

export class RouteRegistry {
  private routes: RouteDefinition[] = [];

  add(pattern: string | RegExp, handler: RouteHandler): void {
    this.routes.push({ pattern, handler });
  }

  async execute(url: string): Promise<string | null> {
    for (const route of this.routes) {
      let matched = false;

      if (typeof route.pattern === 'string') {
        if (route.pattern.includes('*')) {
          const regexPattern = route.pattern.replace(/\*/g, '.*');
          matched = new RegExp(`^${regexPattern}$`).test(url);
        } else {
          matched = route.pattern === url;
        }
      } else {
        matched = route.pattern.test(url);
      }

      if (matched) {
        const result: unknown = await route.handler();
        return typeof result === 'string' ? result : null;
      }
    }

    return null;
  }
}