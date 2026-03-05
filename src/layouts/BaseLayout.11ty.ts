export interface BaseLayoutData {
  title?: string;
  content: string;
}

export class BaseLayout {
  data() {
    return {
      title: 'Rouault',
    };
  }

  render(data: BaseLayoutData) {
    const title = data.title ? `${data.title} - Rouault` : 'Rouault';

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
    <layout-header></layout-header>
    <app-router>
      <main id="main-content" tabindex="-1">
        ${data.content}
      </main>
    </app-router>
    <layout-footer></layout-footer>
  </div>
</body>
</html>
    `.trim();
  }
}

export default BaseLayout;
