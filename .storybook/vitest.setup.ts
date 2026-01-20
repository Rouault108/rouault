/**
 * Vitest Setup for Storybook
 *
 * このファイルは Storybook の設定 (preview.ts で定義されたデコレーター、
 * グローバルスタイル、パラメータなど) を Vitest テスト環境に適用します。
 *
 * @see https://storybook.js.org/docs/writing-tests/test-addon#example-configuration-files
 */

import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@storybook/web-components';
import * as previewAnnotations from './preview';

// Storybook の設定を Vitest に適用
// これにより、stories.ts の play 関数が正しく実行されます
const annotations = setProjectAnnotations([previewAnnotations]);

// beforeAll でプロジェクトのセットアップを実行
beforeAll(annotations.beforeAll);
