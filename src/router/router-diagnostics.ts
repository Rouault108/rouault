import { DiagnosticError } from '../diagnostics/diagnostic-error.js';

export const routerDiagnosticReasons = [
  'post-commit-handler-failed',
  'route-state-mismatch',
  'return-to-reading-unavailable',
  'invalid-target',
  'navigation-envelope-invalid',
] as const;

export type RouterDiagnosticReason = (typeof routerDiagnosticReasons)[number];

export type RouterDiagnosticPayload =
  | {
      readonly reason: 'post-commit-handler-failed';
      readonly handlerName: string;
    }
  | {
      readonly reason: 'route-state-mismatch';
      readonly routeId: string;
    }
  | {
      readonly reason: 'return-to-reading-unavailable';
      readonly routeId: string;
    }
  | {
      readonly reason: 'invalid-target';
      readonly target: string;
    }
  | {
      readonly reason: 'navigation-envelope-invalid';
      readonly routeId: string;
    };

export class RouterDiagnosticError extends DiagnosticError {
  readonly diagnostic: RouterDiagnosticPayload;

  constructor(message: string, diagnostic: RouterDiagnosticPayload) {
    super({ code: diagnostic.reason, message });
    this.name = 'RouterDiagnosticError';
    this.diagnostic = diagnostic;
  }
}

export const createRouterDiagnosticError = (
  message: string,
  diagnostic: RouterDiagnosticPayload,
): RouterDiagnosticError => new RouterDiagnosticError(message, diagnostic);

export interface RouterRuntimeDiagnosticSink {
  readonly record: (diagnostic: RouterDiagnosticPayload) => void;
}

export const createRouterRuntimeDiagnosticSink = (
  onRecord?: (diagnostic: RouterDiagnosticPayload) => void,
): RouterRuntimeDiagnosticSink => ({
  record: (diagnostic) => {
    onRecord?.(diagnostic);
  },
});
