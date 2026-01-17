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
  <div id="app">
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/notes">Notes</a>
      </nav>
    </header>

    <main id="main-content">
      ${data.content}
    </main>

    <footer>
      <p>&copy; 2026 Rouault</p>
    </footer>
  </div>
</body>
</html>
    `.trim();
  }
}

export default BaseLayout;
