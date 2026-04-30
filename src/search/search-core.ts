/**
 * Search runtime の正本 entry point。
 *
 * ルール:
 * - executable な core / stage / ranking / source 実装は src/search/** に置く
 * - shared/search/** には型・URL 正規化・query 前処理などの共有ユーティリティのみを置く
 * - shared/search/** から src/search/** を import しない
 */
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
  type SearchExecutionOptions,
} from './core/search-core.js';

export type {
  PagefindApi,
  PagefindFragmentData,
  PagefindLoader,
  PagefindSearchResponse,
  PagefindSearchResult,
  SearchCore,
  SearchCoreDependencies,
  SearchExecutionOptions,
};
export { createDefaultPagefindLoader, createSearchCore, searchCore };
