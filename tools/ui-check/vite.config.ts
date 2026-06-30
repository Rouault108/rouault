import { defineConfig } from 'vite';
import { STATIC_ASSETS_ROOT_ABSOLUTE_PATH } from '../../build/assets/static-font-assets.js';

export default defineConfig({
  publicDir: STATIC_ASSETS_ROOT_ABSOLUTE_PATH,
});

