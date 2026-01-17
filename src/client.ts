import { Router } from './lib/router.js';
import './components/hello-world.ts';

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
