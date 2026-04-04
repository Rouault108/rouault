import {
  ARTICLE_HEADER_TAGS_DATA_ATTRIBUTE,
  parseArticleHeaderTagsAdapterValue,
} from '../../components/ui/article-header/article-header-tags-adapter.js';

interface ArticleHeaderWithTags extends HTMLElement {
  tags?: string[];
}

export const hydrateArticleHeaderTags = (root: ParentNode): void => {
  const headers = root.querySelectorAll<ArticleHeaderWithTags>('ui-article-header');

  for (const header of headers) {
    const currentTags = Array.isArray(header.tags) ? header.tags : [];
    if (currentTags.length > 0) {
      continue;
    }

    const tags = parseArticleHeaderTagsAdapterValue(
      header.getAttribute(ARTICLE_HEADER_TAGS_DATA_ATTRIBUTE),
    );

    if (tags.length === 0) {
      continue;
    }

    header.tags = tags;
  }
};
