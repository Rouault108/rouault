import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  collectCspStageOne,
  renderCspHeaders,
  verifyCspStageOne,
} from '../build/security/csp-report-only.js';
import { getMediaBaseUrl } from '../build/media/media-base-url.js';

const dist = path.resolve('dist');
const mediaBase = getMediaBaseUrl();
const manifest = await collectCspStageOne(dist, mediaBase ? new URL(mediaBase).origin : null);
await mkdir('.generated/csp', { recursive: true });
await writeFile('.generated/csp/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await writeFile('.generated/csp/report-only.headers', renderCspHeaders(manifest));
await verifyCspStageOne(dist, manifest);
console.log(
  `[csp] verified ${String(manifest.documents.length)} documents; ${String(manifest.rules.length)} isolated rules; dist/_headers unchanged`,
);
