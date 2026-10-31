import { readFile } from 'node:fs/promises';
import { readVerifiedCspStageOne, renderCspHeaders } from '../build/security/csp-report-only.js';

const manifest = await readVerifiedCspStageOne('dist', '.generated/csp/manifest.json');
const headers = await readFile('.generated/csp/report-only.headers', 'utf8');
if (headers !== renderCspHeaders(manifest)) throw new Error('[csp] stale CSP header fragment');
const productionHeaders = await readFile('dist/_headers', 'utf8');
if (/^\s*(?:!\s+)?Content-Security-Policy(?:-Report-Only)?:/imu.test(productionHeaders)) {
  throw new Error('[csp] Stage 1 must not publish CSP through dist/_headers');
}
const existingRules = productionHeaders
  .split(/\r?\n/u)
  .filter((line) => line.startsWith('/')).length;
if (existingRules + manifest.rules.length > 100)
  throw new Error('[csp] combined Pages rule limit exceeded');
console.log('[csp] frozen hashes, inventory, headers and publication isolation verified');
