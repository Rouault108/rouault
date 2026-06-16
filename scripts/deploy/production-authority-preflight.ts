/// <reference types="node" />

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  observeProductionBranchHead,
  productionAuthorityFromProcessEnv,
  writeJsonAtomically,
} from './production-authority.js';

const OUTPUT_PATH = path.resolve(
  process.cwd(),
  '.generated',
  'deployment',
  'validated-production-context.json',
);

const run = async (): Promise<void> => {
  const authority = productionAuthorityFromProcessEnv();
  const headObservation = await observeProductionBranchHead(authority, 'production-preflight');

  await writeJsonAtomically(OUTPUT_PATH, {
    schemaVersion: 1,
    authority,
    headObservation,
  });

  console.log('[production-authority] wrote validated production context');
};

const entryPoint = process.argv[1];
if (typeof entryPoint === 'string' && fileURLToPath(import.meta.url) === path.resolve(entryPoint)) {
  void run();
}
