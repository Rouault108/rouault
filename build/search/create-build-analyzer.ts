import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  createCanonicalAnalyzer,
  PROVIDER_WASM_SHA256,
} from '../../shared/search/lexical-analyzer.js';

export async function createBuildAnalyzer() {
  const wasm = import.meta.resolve('@libraz/suzume/wasm');
  const bytes = await readFile(new URL(wasm));
  if (createHash('sha256').update(bytes).digest('hex') !== PROVIDER_WASM_SHA256) {
    throw new Error('Suzume WASM artifact mismatch');
  }
  return createCanonicalAnalyzer(wasm);
}
