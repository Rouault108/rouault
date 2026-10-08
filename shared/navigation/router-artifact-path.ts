import { hasAsciiControlCharacter } from '../string/ascii-control.js';

export const ROUTER_ARTIFACT_ROOT_PATHNAME = '/__router';

const ensureLeadingSlash = (pathname: string): string =>
  pathname.startsWith('/') ? pathname : `/${pathname}`;

const ensureTrailingSlash = (pathname: string): string =>
  pathname.endsWith('/') ? pathname : `${pathname}/`;

export const resolveRouterArtifactStoragePathname = (contentPathname: string): string => {
  const normalizedPathname = ensureTrailingSlash(ensureLeadingSlash(contentPathname));
  const storagePathname = decodeURI(normalizedPathname);
  const segments = storagePathname.split('/');

  if (
    hasAsciiControlCharacter(storagePathname) ||
    storagePathname.includes('\\') ||
    segments.some((segment) => segment === '.' || segment === '..')
  ) {
    throw new TypeError('router artifact pathname must not contain unsafe filesystem segments');
  }

  return storagePathname;
};

export const resolveRouterArtifactPathname = (contentPathname: string): string => {
  const artifactContentPathname = encodeURI(
    resolveRouterArtifactStoragePathname(contentPathname),
  );

  return artifactContentPathname === '/'
    ? `${ROUTER_ARTIFACT_ROOT_PATHNAME}/index.router.json`
    : `${ROUTER_ARTIFACT_ROOT_PATHNAME}${artifactContentPathname}index.router.json`;
};
