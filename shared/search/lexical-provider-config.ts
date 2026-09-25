import type { SuzumeOptions } from '@libraz/suzume';

export const ANALYZER_POLICY_ID = 'rouault-lexical-v3';
export const PROVIDER_WASM_SHA256 =
  'f0ee2d14fcbbb0559c3246263aa907987012a1ff45939484ee6b79bae1821baf';
export const SUZUME_OPTIONS = Object.freeze({
  mode: 'normal',
  mergeCompounds: false,
  preserveVu: true,
  preserveCase: true,
  preserveSymbols: false,
  lemmatize: true,
  skipUserDictionary: false,
  skipCoreDictionary: false,
  skipEnvConfig: false,
  reportScorerConfig: false,
  freshWasmModule: true,
} satisfies SuzumeOptions);
