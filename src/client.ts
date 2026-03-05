/**
 * アプリケーションのクライアントサイドエントリーポイント
 *
 * <app-router> が connectedCallback() で自己初期化するため、
 * コンポーネントのインポートのみ必要。
 */

import './components/app/app-router.js';
import './components/layout/layout-footer.js';
import './components/layout/layout-header.js';
import './components/layout/layout-sidebar.js';
import './components/layout/layout-toc.js';
import './components/ui/article-header/article-header.js';
import './components/ui/blockquote/blockquote.js';
import './components/ui/callout/callout.js';
import './components/ui/codeblock/codeblock.js';
import './components/ui/code-group/code-group.js';
import './components/ui/ol/ol.js';
import './components/ui/divider/divider.js';
import './components/ui/table/table.js';
import './components/ui/translation/translation.js';
import './components/ui/skip-link/skip-link.js';
import { initTranslationOrchestrator } from './components/ui/translation/translation-orchestrator.js';

initTranslationOrchestrator();

console.log('Rouault Client Initialized');
