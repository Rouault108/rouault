import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { transformHtmlWithLitSsr } from '../lib/ssr/html-transform.js';

const require = createRequire(import.meta.url);
const { build } = require(path.join(process.cwd(), 'node_modules/.pnpm/node_modules/esbuild')) as {
  build: (options: {
    entryPoints: string[];
    outfile: string;
    bundle: boolean;
    format: 'esm';
    platform: 'node';
    target: string;
    logLevel: 'silent';
  }) => Promise<void>;
};
const DIST_DIR = path.resolve(process.cwd(), 'dist');

const listHtmlFiles = async (dirPath: string): Promise<string[]> => {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const htmlFiles: string[] = [];

  for (const entry of entries) {
    const nextPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      htmlFiles.push(...await listHtmlFiles(nextPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(nextPath);
    }
  }

  return htmlFiles;
};

interface ServerEntryModule {
  SSR_TARGET_TAGS: readonly string[];
  renderCustomElement: (
    tagName: string,
    attributes: readonly { name: string; value: string }[],
    innerHtml: string,
  ) => Promise<string>;
  collectDocumentStylesForTags: (tagNames: ReadonlySet<string>) => readonly {
    id: string;
    cssText: string;
  }[];
}

const buildServerEntry = async (): Promise<{
  module: ServerEntryModule;
  cleanup: () => Promise<void>;
}> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rouault-lit-ssr-'));
  const outfile = path.join(tempDir, 'server-entry.mjs');

  await build({
    entryPoints: [path.resolve(process.cwd(), 'src/ssr/server-entry.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    logLevel: 'silent',
  });

  const moduleUrl = pathToFileURL(outfile).href;
  const importedModule = await import(moduleUrl);

  return {
    module: importedModule as ServerEntryModule,
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true });
    },
  };
};

const main = async (): Promise<void> => {
  process.env['NODE_ENV'] = 'production';

  const { module, cleanup } = await buildServerEntry();

  try {
    const htmlFiles = await listHtmlFiles(DIST_DIR);

    for (const htmlFile of htmlFiles) {
      const source = await readFile(htmlFile, 'utf8');
      const rendered = await transformHtmlWithLitSsr(source, {
        targetTagNames: module.SSR_TARGET_TAGS,
        renderCustomElement: module.renderCustomElement,
        collectDocumentStylesForTags: module.collectDocumentStylesForTags,
      });

      if (rendered !== source) {
        await writeFile(htmlFile, rendered, 'utf8');
      }
    }
  } finally {
    await cleanup();
  }
};

await main();
