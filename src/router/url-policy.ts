import {
  normalizeRouaultPathname,
  resolveRouaultContentPath,
  sanitizeRouaultSearchParams,
} from '../../shared/url/rouault-url-policy.js';

export interface UrlPolicy {
  normalizePathname(pathname: string): string;
  sanitizeSearchParams(url: URL): void;
  resolveContentPath(pathname: string): string;
}

export const createSharedRouaultUrlPolicy = (): UrlPolicy => ({
  normalizePathname: normalizeRouaultPathname,
  sanitizeSearchParams: sanitizeRouaultSearchParams,
  resolveContentPath: resolveRouaultContentPath,
});
