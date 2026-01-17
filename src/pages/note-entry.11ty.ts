import { notes } from '../../.velite/index.js';

/**
 * ノートの一覧ページ
 */
export class NoteEntryPage {
  data() {
    return {
      layout: 'base',
      pagination: {
        data: 'notes_data',
        size: 1,
        alias: 'note',
      },
      permalink: (data: any) => data.note.slug + '/index.html', // Output: /notes/slug/index.html
    };
  }

  // Veliteデータを11tyデータカスケードに注入
  async before() {
    return {
      notes_data: notes
    }
  }

  render(data: any) {
    const { note } = data;

    return `
<article class="note-entry">
  <header class="note-header">
    <h1>${note.title}</h1>
    <div class="note-meta">
      ${note.date ? `<time>${new Date(note.date).toLocaleDateString()}</time>` : ''}
    </div>
  </header>
  
  <div class="note-content markdown-body">
    ${note.content}
  </div>

  <nav class="note-footer-nav">
    <a href="/notes">← Back to Notes</a>
  </nav>
</article>
    `.trim();
  }
}

export default NoteEntryPage;
