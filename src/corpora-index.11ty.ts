import { loadCorporaOverviewData, type CorporaOverviewData } from './data/corporaOverview.js';
import { renderCorporaOverviewHtml } from './layouts/corpora-overview-html.js';

interface CorporaOverviewTemplateData {
  corporaOverview?: CorporaOverviewData;
}

export class CorporaOverviewTemplate {
  data() {
    return {
      layout: 'base',
      title: 'コーパスから辿る',
      description: '公開ノートを、コーパスというまとまりごとに辿るための索引ページ。',
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
