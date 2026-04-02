import type { CorpusPageEntry } from './data/corpusPages.js';
import { serializeHtmlAttributes } from './layouts/html-output.js';

interface CorpusPagesPaginationData {
  corpusPages?: CorpusPageEntry[];
  corpusPage?: CorpusPageEntry;
}

interface CorpusPageTemplateData {
  corpusPage?: CorpusPageEntry;
}

export class CorpusPagesTemplate {
  data() {
    return {
      layout: 'base',
      pagination: {
        data: 'corpusPages',
        size: 1,
        alias: 'corpusPage',
      },
      eleventyComputed: {
        title: (data: CorpusPageTemplateData) => `コーパス: ${data.corpusPage?.label ?? ''}`,
        permalink: (data: CorpusPageTemplateData) => {
          if (typeof data.corpusPage?.key !== 'string' || data.corpusPage.key.length === 0) {
            return false;
          }

          return `/corpora/${encodeURIComponent(data.corpusPage.key)}/index.html`;
        },
        currentCorpusKey: (data: CorpusPageTemplateData) => data.corpusPage?.key ?? 'all',
      },
    };
  }

  render(data: CorpusPagesPaginationData) {
    if (!data.corpusPage) {
      return '';
    }

    return `<corpus-page${serializeHtmlAttributes([
      { name: 'corpus-page-json', value: data.corpusPage, kind: 'json' },
    ])}></corpus-page>`;
  }
}

export default CorpusPagesTemplate;
