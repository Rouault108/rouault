import { pathToFileURL } from 'node:url';

import { prepareStaticFontAssets } from '../build/assets/static-font-assets.js';

const isCliEntrypoint = (): boolean => {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href;
};

if (isCliEntrypoint()) {
  try {
    await prepareStaticFontAssets();
    console.log('prepare-static-font-assets: ok');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
