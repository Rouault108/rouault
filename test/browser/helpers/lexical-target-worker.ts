import { LexicalRuntime } from '../../../src/search/lexical/runtime.js';

// native scoreの環境差を観測するだけで、production検索の入力・選択規則は変えない。
const search = LexicalRuntime.prototype.search;
LexicalRuntime.prototype.search = async function (...args) {
  const result = await search.apply(this, args);
  result.metrics['nativeTrace'] = this.lastRanking?.traces;
  return result;
};
import '../../../src/search/lexical/worker.js';
