export interface UrlPolicy {
  normalizePathname(pathname: string): string;
  sanitizeSearchParams(url: URL): void;
  resolveContentPath(pathname: string): string;
}
