/**
 * ノート用1カラムレイアウト。
 *
 * BaseLayout を layout chain で継承し、
 * 記事ヘッダー + .prose コンテナの読書体験を提供する。
 */

interface NoteData {
  title?: string;
  description?: string;
  date?: string;
  updated?: string;
  genre?: string[];
  license?: string;
  licenseNote?: string;
  draft?: boolean;
}

interface NoteLayoutData {
  content: string;
  note?: NoteData;
}

/**
 * HTML属性値のエスケープ。XSS防止のために使用。
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class NoteLayout {
  data() {
    return {
      layout: 'base',
    };
  }

  render(data: NoteLayoutData) {
    const note = data.note;
    const heading = escapeAttr(note?.title ?? '');
    const published = note?.date ? ` published="${escapeAttr(note.date)}"` : '';
    const updated = note?.updated
      ? ` updated="${escapeAttr(note.updated)}"`
      : '';
    const status = note?.draft ? ' status="draft"' : '';
    const license = note?.license
      ? ` license="${escapeAttr(note.license)}"`
      : '';

    return `
      <article class="container-reading">
        <ui-article-header
          heading="${heading}"${published}${updated}${status}${license}
        ></ui-article-header>
        <div class="prose">
          ${data.content}
        </div>
      </article>
    `.trim();
  }
}

export default NoteLayout;
