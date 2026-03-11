import {
  buildBreadcrumbs,
  type BreadcrumbSourceNote,
} from '../../lib/content/build-breadcrumbs.js';

export interface BaseLayoutData {
  title?: string;
  content: string;
  note?: BreadcrumbSourceNote;
}

export class BaseLayout {
  data() {
    return {
      title: 'Rouault',
    };
  }

  render(data: BaseLayoutData) {
    const title = data.title ? `${data.title} - Rouault` : 'Rouault';
    const breadcrumbsJson = JSON.stringify(buildBreadcrumbs(data.note))
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="Personal Note Viewer">
  <link rel="stylesheet" href="/assets/css/main.css">
  <script type="module" src="/src/client.ts"></script>
</head>
<body>
  <ui-skip-link href="#main-content" label="メインコンテンツへ移動"></ui-skip-link>
  <div id="app" class="app-root">
    <layout-header breadcrumbs-json="${breadcrumbsJson}"></layout-header>
    <app-router>
      <main id="main-content" tabindex="-1">
        ${data.content}
      </main>
    </app-router>
    <layout-footer></layout-footer>
  </div>
  <ui-search-dialog id="global-search-dialog"></ui-search-dialog>
</body>
</html>
    `.trim();
  }
}

export default BaseLayout;
