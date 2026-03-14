import { serializeSearchCatalog, type SearchCatalogSourceNote } from './data/searchCatalog.js';

interface SearchCatalogPageData {
  notes?: SearchCatalogSourceNote[];
}

export class SearchCatalogPage {
  data() {
    return {
      permalink: '/search-catalog.json',
      eleventyExcludeFromCollections: true,
    };
  }

  render(data: SearchCatalogPageData) {
    return serializeSearchCatalog(data.notes ?? []);
  }
}

export default SearchCatalogPage;
