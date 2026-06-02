export interface StaticHeaderContractRejectedCase {
  readonly label: string;
  readonly html: string;
}

export const STATIC_HEADER_CONTRACT_ACCEPTED_HTML = `
  <header class="layout-header" data-layout-header="true">
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

export const STATIC_HEADER_CONTRACT_REJECTED_CASES: readonly StaticHeaderContractRejectedCase[] = [
  {
    label: 'custom element',
    html: '<header data-layout-header="true"><layout-header></layout-header></header>',
  },
  {
    label: 'script',
    html: '<header data-layout-header="true"><script>window.alert(1)</script></header>',
  },
  {
    label: 'event handler attribute',
    html: '<header data-layout-header="true"><button type="button" onclick="window.alert(1)">open</button></header>',
  },
  {
    label: 'element-specific attribute',
    html: '<header data-layout-header="true"><span href="/search/">search</span></header>',
  },
];
