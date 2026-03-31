import {
  buildNotFoundPageMarkup,
  NOT_FOUND_PAGE_META_DESCRIPTION,
  NOT_FOUND_PAGE_TITLE,
} from './not-found/not-found-page.js';

export class NotFoundPageTemplate {
  data() {
    return {
      layout: 'base',
      title: NOT_FOUND_PAGE_TITLE,
      description: NOT_FOUND_PAGE_META_DESCRIPTION,
      permalink: '/404.html',
    };
  }

  render() {
    return buildNotFoundPageMarkup();
  }
}

export default NotFoundPageTemplate;
