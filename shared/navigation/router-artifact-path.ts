export const ROUTER_ARTIFACT_ROOT_PATHNAME = '/__router';

const ensureLeadingSlash = (pathname: string): string =>
  pathname.startsWith('/') ? pathname : `/${pathname}`;

const ensureTrailingSlash = (pathname: string): string =>
  pathname.endsWith('/') ? pathname : `${pathname}/`;

export const resolveRouterArtifactPathname = (contentPathname: string): string => {
  const normalizedPathname = ensureTrailingSlash(ensureLeadingSlash(contentPathname));

  return normalizedPathname === '/'
    ? `${ROUTER_ARTIFACT_ROOT_PATHNAME}/index.router.json`
    : `${ROUTER_ARTIFACT_ROOT_PATHNAME}${normalizedPathname}index.router.json`;
};
