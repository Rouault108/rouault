/** Search runtimeの公開入口。Analyzer/retrieval/rankingはWorkerへ閉じ込める。 */
export {
  createSearchCore,
  type SearchCore,
  type SearchCoreDependencies,
  type SearchExecutionOptions,
} from './core/search-core.js';
