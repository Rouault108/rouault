import {
  createDefaultPagefindLoader,
  type PagefindApi,
  type PagefindFragmentData,
  type PagefindLoader,
  type PagefindSearchResponse,
  type PagefindSearchResult,
} from './sources/pagefind-source.js';
import {
  createSearchCore,
  searchCore,
  type SearchCore,
  type SearchCoreDependencies,
} from './core/search-core.js';

export type {
  PagefindApi,
  PagefindFragmentData,
  PagefindLoader,
  PagefindSearchResponse,
  PagefindSearchResult,
  SearchCore,
  SearchCoreDependencies,
};
export { createDefaultPagefindLoader, createSearchCore, searchCore };
