export type InternalDocumentRoutePathname = string;

export interface InternalDocumentRouteSet {
  readonly routes: readonly InternalDocumentRoutePathname[];
  readonly has: (pathname: string) => boolean;
}

export type InternalDocumentRouteSetContractErrorReason =
  | 'invalid-route-pathname'
  | 'duplicate-route-pathname';

export class InternalDocumentRouteSetContractError extends Error {
  override readonly name = 'InternalDocumentRouteSetContractError';
  readonly reason: InternalDocumentRouteSetContractErrorReason;

  constructor(reason: InternalDocumentRouteSetContractErrorReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

const ASCII_CONTROL_RE = /[\u0000-\u001f\u007f]/u;

const fail = (
  reason: InternalDocumentRouteSetContractErrorReason,
  message: string,
): never => {
  throw new InternalDocumentRouteSetContractError(reason, message);
};

export const normalizeInternalDocumentRoutePathname = (
  value: string,
): InternalDocumentRoutePathname => {
  if (value.length === 0 || value !== value.trim()) {
    fail('invalid-route-pathname', 'Internal document route pathname must be non-empty.');
  }

  if (!value.startsWith('/')) {
    fail('invalid-route-pathname', 'Internal document route pathname must start with /.');
  }

  if (value.includes('?') || value.includes('#')) {
    fail('invalid-route-pathname', 'Internal document route pathname must not include query or hash.');
  }

  if (value.includes('\\') || ASCII_CONTROL_RE.test(value)) {
    fail(
      'invalid-route-pathname',
      'Internal document route pathname must not include backslash or control characters.',
    );
  }

  if (value !== '/' && value.includes('//')) {
    fail('invalid-route-pathname', 'Internal document route pathname must not include empty segments.');
  }

  return value;
};

export const createInternalDocumentRouteSet = (
  routes: Iterable<string>,
): InternalDocumentRouteSet => {
  const uniqueRoutes = new Set<InternalDocumentRoutePathname>();

  for (const route of routes) {
    const normalized = normalizeInternalDocumentRoutePathname(route);
    if (uniqueRoutes.has(normalized)) {
      fail('duplicate-route-pathname', `Duplicate internal document route pathname: ${normalized}`);
    }
    uniqueRoutes.add(normalized);
  }

  const sortedRoutes = [...uniqueRoutes].sort((left, right) => left.localeCompare(right, 'en'));
  const lookup = new Set(sortedRoutes);

  return {
    routes: sortedRoutes,
    has: (pathname: string): boolean => lookup.has(pathname),
  };
};

export const routeSetIncludesPathname = (
  routeSet: InternalDocumentRouteSet,
  pathname: string,
): boolean => routeSet.has(pathname);
