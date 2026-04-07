import path from 'node:path';
import { readFile } from 'node:fs/promises';

export interface ClientBundleData {
  scriptSrc: string;
  styleSrcs: string[];
}

interface ViteManifestEntry {
  file?: string;
  css?: string[];
}

const DEV_SCRIPT_ENTRY = '/src/client.ts';
const DEV_STYLE_ENTRY = '/src/assets/css/main.css';
const MANIFEST_PATH = path.resolve(process.cwd(), '.generated/client/.vite/manifest.json');
const MANIFEST_SCRIPT_KEY = 'src/client.ts';
const MANIFEST_STYLE_KEY = 'src/assets/css/main.css';

const toPublicPath = (assetPath: string): string => `/${assetPath.replace(/^\/+/, '')}`;

const collectStyleSrcs = (
  scriptEntry: ViteManifestEntry | undefined,
  styleEntry: ViteManifestEntry | undefined,
): string[] => {
  const candidates = [
    ...(styleEntry?.file ? [styleEntry.file] : []),
    ...(scriptEntry?.css ?? []),
  ];

  return [...new Set(candidates)].map(toPublicPath);
};

export async function loadClientBundleData(): Promise<ClientBundleData> {
  if (process.argv.includes('--serve')) {
    return {
      scriptSrc: DEV_SCRIPT_ENTRY,
      styleSrcs: [DEV_STYLE_ENTRY],
    };
  }

  const manifestText = await readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(manifestText) as Record<string, ViteManifestEntry>;

  const scriptEntry = manifest[MANIFEST_SCRIPT_KEY];
  const styleEntry = manifest[MANIFEST_STYLE_KEY];
  const scriptSrc = scriptEntry?.file;

  if (!scriptSrc) {
    throw new Error(`Client bundle entry not found in Vite manifest: ${MANIFEST_SCRIPT_KEY}`);
  }

  const styleSrcs = collectStyleSrcs(scriptEntry, styleEntry);

  if (styleSrcs.length === 0) {
    throw new Error(`Client style entry not found in Vite manifest: ${MANIFEST_STYLE_KEY}`);
  }

  return {
    scriptSrc: toPublicPath(scriptSrc),
    styleSrcs,
  };
}