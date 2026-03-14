/**
 * ノートページ生成テンプレート。
 *
 * Eleventy の pagination 機能を使い、
 * Velite が生成した各ノートにつき1つの HTML ページを出力する。
 */

interface NoteEntry {
  title: string;
  permalink?: string;
  content?: string;
}

interface NotePageData {
  note?: NoteEntry;
}

export class NotePages {
  data() {
    return {
      layout: 'note',
      pagination: {
        data: 'notes',
        size: 1,
        alias: 'note',
      },
      eleventyComputed: {
        title: (data: NotePageData) => data.note?.title,
        permalink: (data: NotePageData) => {
          if (!data.note?.permalink) return false;
          return `${data.note.permalink}/index.html`;
        },
      },
    };
  }

  render(data: NotePageData) {
    return data.note?.content ?? '';
  }
}

export default NotePages;
