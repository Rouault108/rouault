import { loadCorporaOverviewData, type CorporaOverviewData } from './data/corporaOverview.js';
import { renderCorporaOverviewHtml } from './layouts/corpora-overview-html.js';

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

    return renderCorporaOverviewHtml(corporaOverview);
  }
}

export default CorporaOverviewTemplate;
