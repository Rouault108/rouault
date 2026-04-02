import { loadCorporaOverviewData, type CorporaOverviewData } from './data/corporaOverview.js';
import { serializeHtmlAttributes } from './layouts/html-output.js';

interface CorporaOverviewTemplateData {
  corporaOverview?: CorporaOverviewData;
}

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

    return `<corpora-overview-page${serializeHtmlAttributes([
      { name: 'corpora-overview-json', value: corporaOverview, kind: 'json' },
    ])}></corpora-overview-page>`;
  }
}

export default CorporaOverviewTemplate;
