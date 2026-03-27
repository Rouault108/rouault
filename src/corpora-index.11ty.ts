import { loadCorporaOverviewData, type CorporaOverviewData } from './data/corporaOverview.js';

interface CorporaOverviewTemplateData {
  corporaOverview?: CorporaOverviewData;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export class CorporaOverviewTemplate {
  data() {
    return {
      layout: 'base',
      title: 'すべてのノート',
      description: '公開しているコーパスと最近更新したノートを横断して辿るための一覧ページ。',
      permalink: '/corpora/index.html',
      currentCorpusKey: 'all',
    };
  }

  render(data: CorporaOverviewTemplateData) {
    const corporaOverview = data.corporaOverview ?? loadCorporaOverviewData();

    return `<corpora-overview-page corpora-overview-json="${escapeHtml(JSON.stringify(corporaOverview))}"></corpora-overview-page>`;
  }
}

export default CorporaOverviewTemplate;