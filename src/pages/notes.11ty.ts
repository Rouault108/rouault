import { notes } from '../../.velite/index.js';

export class NotesPage {
  data() {
    return {
      layout: 'base',
      title: 'Notes',
      permalink: '/notes/index.html',
    };
  }

  render() {
    return `
<div class="note-list">
  <h1>Notes</h1>
  
  <ul class="notes-grid">
    ${notes
      .map(
        (note) => `
      <li class="note-card">
        <a href="${note.permalink}">
          <h2>${note.title}</h2>
          ${note.date ? `<time>${new Date(note.date).toLocaleDateString()}</time>` : ''}
          ${note.excerpt ? `<p>${note.excerpt}</p>` : ''}
        </a>
      </li>
    `,
      )
      .join('')}
  </ul>
</div>
    `.trim();
  }
}

export default NotesPage;
