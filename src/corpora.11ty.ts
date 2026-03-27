import type { CorpusPageEntry } from './data/corpusPages.js';

interface CorpusPagesPaginationData {
  corpusPages?: CorpusPageEntry[];
}

interface CorpusPageTemplateData {
  corpusPage?: CorpusPageEntry;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

    return `<corpus-page corpus-page-json="${escapeHtml(JSON.stringify(data.corpusPage))}"></corpus-page>`;
  }
}

export default CorpusPagesTemplate;
