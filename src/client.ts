/**
 * アプリケーションのクライアントサイドエントリーポイント
 *
 * <app-router> が connectedCallback() で自己初期化するため、
 * コンポーネントのインポートのみ必要。
 */

import './components/app/app-router.js';
import './components/ui/ol/ol.js';
import './components/ui/divider/divider.js';
import './components/ui/translation/translation.js';
import { initTranslationOrchestrator } from './components/ui/translation/translation-orchestrator.js';

initTranslationOrchestrator();

console.log('Rouault Client Initialized');
