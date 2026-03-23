import type {
  DocumentRouteContext,
  DocumentRouteHandler,
  DocumentSnapshot,
  RoutePattern,
} from './router-types.js';

interface RouteDefinition {
  pattern: RoutePattern;
  handler: DocumentRouteHandler;
}

export class RouteRegistry {
  private routes: RouteDefinition[] = [];

  add(pattern: RoutePattern, handler: DocumentRouteHandler): void {
    this.routes.push({ pattern, handler });
  }

  async execute(context: DocumentRouteContext): Promise<DocumentSnapshot | null> {
    for (const route of this.routes) {
      if (!this.matches(route.pattern, context.pathname)) {
        continue;
      }

      return route.handler({
        ...context,
        searchParams: new URLSearchParams(context.searchParams),
      });
    }

    return null;
  }

  private matches(pattern: RoutePattern, pathname: string): boolean {
    if (typeof pattern === 'string') {
      return pattern === pathname;
    }

    return pattern.test(pathname);
  }
}
