import {
  buildNotFoundPageMarkup,
  NOT_FOUND_PAGE_META_DESCRIPTION,
  NOT_FOUND_PAGE_TITLE,
} from '@/components/not-found/not-found-page';
import type { SiteUrlContext } from '../shared/site/site-url-context.js';

export class NotFoundPageTemplate {
  data() {
    return {
      layout: 'base',
      title: NOT_FOUND_PAGE_TITLE,
      description: NOT_FOUND_PAGE_META_DESCRIPTION,
      permalink: '/404.html',
    };
  }

  render(data: { siteUrlContext: SiteUrlContext }) {
    return buildNotFoundPageMarkup({ siteUrlContext: data.siteUrlContext });
  }
}

export default NotFoundPageTemplate;
