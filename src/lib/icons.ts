/**
 * Iconify アイコンのセットアップ
 *
 * このファイルをアプリケーションのエントリーポイントでインポートすることで、
 * Lucide アイコンがオフライン（ローカルバンドル）で使用可能になります。
 *
 * 使用例:
 * ```ts
 * import '@/lib/icons'; // エントリーポイントでインポート
 * ```
 *
 * その後、任意のテンプレートで:
 * ```html
 * <iconify-icon icon="lucide:home"></iconify-icon>
 * <iconify-icon icon="lucide:search"></iconify-icon>
 * ```
 */

import 'iconify-icon';
import { addCollection } from 'iconify-icon';

// Lucide アイコンセット全体をインポート
import lucideIcons from '@iconify-json/lucide/icons.json';

// コレクションを登録（これによりAPIフェッチなしでアイコンが使える）
addCollection(lucideIcons);
