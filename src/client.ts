import { Router } from './lib/router.js';
import './components/sample/hello-world.js';

/*
 * アプリケーションのクライアントサイドエントリーポイント（ルーターの初期化）
 */
const mainContent = document.getElementById('main-content');
if (mainContent) {
  new Router(mainContent);
} else {
  console.error('Main content area not found');
}

console.log('Rouault Client Initialized');
