export interface StaticHeaderContractRejectedCase {
  readonly label: string;
  readonly html: string;
}

export const STATIC_HEADER_CONTRACT_ACCEPTED_HTML = `
  <header
    class="layout-header"
    data-layout-header="true"
    data-note-layout="true"
    data-sidebar-enabled="true"
    data-sidebar-id="note-primary"
    data-toc-presence="present"
    data-toc-runtime-id="toc-runtime"
    data-toc-owner-id="toc-owner"
    data-toc-trigger-reserved="true"
    data-current-corpus-key="all"
  >
    <nav aria-label="global">
      <a class="search-trigger" href="/search/" data-link-kind="internal-document" data-link-surface="header">
        <span>search</span>
      </a>
      <button type="button" aria-expanded="false" data-layout-sidebar-toggle>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v18H3z"></path></svg>
      </button>
    </nav>
  </header>
`;

export const STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML = `
  <header
    class="layout-header"
    data-layout-header="true"
    data-note-layout="false"
    data-sidebar-enabled="false"
    data-sidebar-id="page-sidebar"
    data-toc-presence="absent"
    data-toc-trigger-reserved="false"
    data-current-corpus-key="all"
  >
    <a class="search-trigger" href="/search/" data-link-kind="internal-document" data-link-surface="header">search</a>
  </header>
`;

export const STATIC_HEADER_CONTRACT_REJECTED_CASES: readonly StaticHeaderContractRejectedCase[] = [
  {
    label: 'custom element',
    html: `${STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(
      '</nav>',
      `<${'layout-header'}></${'layout-header'}></nav>`,
    )}`,
  },
  {
    label: 'script',
    html: `${STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace('</nav>', '<script>window.alert(1)</script></nav>')}`,
  },
  {
    label: 'event handler attribute',
    html: `${STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace('type="button"', 'type="button" onclick="window.alert(1)"')}`,
  },
  {
    label: 'element-specific attribute',
    html: `${STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace('<span>search</span>', '<span href="/search/">search</span>')}`,
  },
  {
    label: 'missing data-note-layout',
    html: STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(/\s+data-note-layout="true"/u, ''),
  },
  {
    label: 'invalid boolean root attribute',
    html: STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(
      'data-sidebar-enabled="true"',
      'data-sidebar-enabled="yes"',
    ),
  },
  {
    label: 'missing sidebar id',
    html: STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(/\s+data-sidebar-id="note-primary"/u, ''),
  },
  {
    label: 'invalid toc presence',
    html: STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(
      'data-toc-presence="present"',
      'data-toc-presence="unknown"',
    ),
  },
  {
    label: 'missing toc runtime id when present',
    html: STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(/\s+data-toc-runtime-id="toc-runtime"/u, ''),
  },
  {
    label: 'missing toc owner id when present',
    html: STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(/\s+data-toc-owner-id="toc-owner"/u, ''),
  },
  {
    label: 'toc identity when absent',
    html: STATIC_HEADER_CONTRACT_ACCEPTED_TOC_ABSENT_HTML.replace(
      'data-toc-trigger-reserved="false"',
      'data-toc-runtime-id="toc-runtime" data-toc-trigger-reserved="false"',
    ),
  },
];
