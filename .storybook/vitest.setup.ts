/**
 * Vitest Setup for Storybook
 *
 * このファイルは Storybook の設定 (preview.ts で定義されたデコレーター、
 * グローバルスタイル、パラメータなど) を Vitest テスト環境に適用します。
 *
 * @see https://storybook.js.org/docs/writing-tests/test-addon#example-configuration-files
 */

// Lit の dev mode 警告を Storybook テスト実行時のみ抑止する。
// setupFiles は各 story import より先に評価されるため、ここで無効化すれば警告を防げる。
(globalThis as typeof globalThis & { litDisableDevMode?: boolean }).litDisableDevMode = true;

import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/web-components';
import * as previewAnnotations from './preview';

// Storybook の設定を Vitest に適用
// これにより、stories.ts の play 関数が正しく実行されます
const annotations = setProjectAnnotations([previewAnnotations]);

// beforeAll でプロジェクトのセットアップを実行
beforeAll(annotations.beforeAll);
