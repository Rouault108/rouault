/**
 * ノートページ生成テンプレート。
 *
 * Eleventy の pagination 機能を使い、
 * Velite が生成した各ノートにつき1つの HTML ページを出力する。
 */

import {
  buildNotePageProjection,
  type NotePageProjection,
} from '../build/projections/note-page-projection.js';
import { buildNoteNavigationModel } from '../build/navigation/index.js';
import type { IntrinsicNote } from './data/notes.js';

interface NoteEntry extends IntrinsicNote {
  title: string;
  permalink: string;
  content?: string;
}

interface NotePageData {
  note?: NoteEntry;
  notes?: NoteEntry[];
  notePage?: NotePageProjection;
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
        notePage: (data: NotePageData) => {
          const note = data.note;
          if (!note) {
            return undefined;
          }

          const navigation = buildNoteNavigationModel({
            currentNote: note,
            notes: Array.isArray(data.notes) ? data.notes : [],
          });

          return buildNotePageProjection({
            note,
            navigation,
          });
        },
      },
    };
  }

  render(_data: NotePageData) {
    return '';
  }
}

export default NotePages;
