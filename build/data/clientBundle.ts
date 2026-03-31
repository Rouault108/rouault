import path from 'node:path';
import { readFile } from 'node:fs/promises';

export interface ClientBundleData {
  scriptSrc: string;
}

const DEV_ENTRY = '/src/client.ts';
const MANIFEST_PATH = path.resolve(process.cwd(), '.generated/client/.vite/manifest.json');
const MANIFEST_KEY = 'src/client.ts';

export async function loadClientBundleData(): Promise<ClientBundleData> {
  if (process.argv.includes('--serve')) {
    return { scriptSrc: DEV_ENTRY };
  }

  const manifestText = await readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestText) as Record<string, { file?: string }>;
  const entry = manifest[MANIFEST_KEY]?.file;

  if (!entry) {
    throw new Error(`Client bundle entry not found in Vite manifest: ${MANIFEST_KEY}`);
  }

  return {
    scriptSrc: `/${entry}`,
  };
}