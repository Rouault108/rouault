export interface StaticHeaderContractRejectedCase {
  readonly label: string;
  readonly html: string;
}

const SEARCH_TRIGGER_HTML = `
      <a
        class="search-trigger"
        href="/search/"
        data-search-dialog-trigger="true"
        data-no-router="true"
        data-link-kind="internal-document"
        data-link-surface="header"
        aria-haspopup="dialog"
        aria-controls="global-search-dialog"
        aria-expanded="false"
        aria-label="検索ダイアログを開く"
      >
        <span class="search-trigger__icon static-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="search">
            <path d="m21 21-4.34-4.34"></path>
            <circle cx="11" cy="11" r="8"></circle>
          </svg>
        </span>
        <span class="search-trigger__placeholder" aria-hidden="true">検索...</span>
      </a>
`;

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
    <div class="layout-header__inner">
      <div class="layout-header__start slot-group start-slot-group">
        <button
          class="sidebar-toggle"
          type="button"
          aria-label="サイドバーを開く"
          aria-expanded="false"
          data-layout-sidebar-toggle
          data-sidebar-id="note-primary"
        >
          <span class="static-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="panel-left">
              <path d="M3 3h18v18H3z"></path>
            </svg>
          </span>
        </button>
        <details class="corpus-switcher" data-header-menu="corpus">
          <summary
            id="static-header-corpus-trigger"
            class="corpus-trigger-label"
            aria-label="コーパス: すべて"
            aria-controls="static-header-corpus-panel"
            data-header-menu-trigger="true"
            data-header-menu-trigger-id="static-header-corpus-trigger"
          >
            <span class="corpus-trigger-main">
              <span class="corpus-trigger-text">すべて</span>
            </span>
            <span class="corpus-trigger-icon static-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="chevron-down">
                <path d="m6 9 6 6 6-6"></path>
              </svg>
            </span>
          </summary>
          <nav
            id="static-header-corpus-panel"
            class="corpus-switcher__menu"
            aria-label="コーパス"
            data-header-menu-panel="true"
            data-header-menu-panel-id="static-header-corpus-panel"
          >
            <ul>
              <li>
                <a
                  href="/"
                  data-link-kind="internal-document"
                  data-link-surface="header"
                  data-header-menu-item="true"
                  data-header-menu-text="すべて"
                  aria-current="page"
                >
                  <span class="corpus-menu-item__indicator static-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="check">
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  </span>
                  <span class="corpus-menu-item__label">すべて</span>
                </a>
              </li>
            </ul>
          </nav>
        </details>
      </div>
      <div class="layout-header__center"></div>
      <div class="layout-header__compact-center"></div>
      <div class="layout-header__end slot-group end-slot-group">
        <a
          class="toc-trigger"
          href="#toc-runtime-static"
          data-visible="false"
          data-reserved="true"
          data-toc-trigger-reserved="true"
          data-toc-trigger-interactive="false"
          data-toc-hydration-state="unhydrated"
          data-toc-trigger="true"
          data-toc-runtime-id="toc-runtime"
          data-toc-static-root-id="toc-runtime-static"
          data-toc-mobile-panel-id="layout-toc-panel-toc-runtime"
          data-link-kind="internal-fragment"
          data-link-surface="header"
          aria-label="目次を開く"
          aria-expanded="false"
          aria-controls="toc-runtime-static"
        >
          <span class="toc-trigger-icon static-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="menu">
              <path d="M4 12h16"></path>
            </svg>
          </span>
          <span class="toc-trigger-text">目次</span>
        </a>
${SEARCH_TRIGGER_HTML}
        <details class="theme-switcher" data-theme-switcher="true" data-header-menu="theme">
          <summary
            id="static-header-theme-trigger"
            class="theme-trigger-label"
            aria-label="テーマ: システム"
            aria-controls="static-header-theme-panel"
            data-header-menu-trigger="true"
            data-header-menu-trigger-id="static-header-theme-trigger"
          >
            <span class="theme-trigger-main" data-theme-preference="system">
              <span class="theme-trigger-icon static-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="monitor">
                  <rect x="2" y="3" width="20" height="14"></rect>
                </svg>
              </span>
              <span class="theme-trigger-text" data-theme-current-label>システム</span>
            </span>
          </summary>
          <div
            id="static-header-theme-panel"
            class="theme-switcher__menu"
            role="group"
            aria-label="テーマ"
            data-header-menu-panel="true"
            data-header-menu-panel-id="static-header-theme-panel"
          >
            <ul>
              <li>
                <button
                  type="button"
                  data-theme-value="system"
                  data-selected="true"
                  data-header-menu-item="true"
                  data-header-menu-text="システム"
                  aria-pressed="true"
                >
                  <span>システム</span>
                </button>
              </li>
            </ul>
          </div>
        </details>
      </div>
    </div>
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
    <div class="layout-header__inner">
      <div class="layout-header__end slot-group end-slot-group">
${SEARCH_TRIGGER_HTML}
      </div>
    </div>
  </header>
`;

const withoutSearchTrigger = STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(SEARCH_TRIGGER_HTML, '');
const withSearchTrigger = (html: string): string =>
  STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(SEARCH_TRIGGER_HTML, html);

export const STATIC_HEADER_CONTRACT_REJECTED_CASES: readonly StaticHeaderContractRejectedCase[] = [
  {
    label: 'custom element',
    html: `${STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(
      '</div>\n      <div class="layout-header__center">',
      `</div>\n      <${'layout-header'}></${'layout-header'}>\n      <div class="layout-header__center">`,
    )}`,
  },
  {
    label: 'script',
    html: `${STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(
      '</div>\n      <div class="layout-header__center">',
      '</div>\n      <script>window.alert(1)</script>\n      <div class="layout-header__center">',
    )}`,
  },
  {
    label: 'event handler attribute',
    html: `${STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace('type="button"', 'type="button" onclick="window.alert(1)"')}`,
  },
  {
    label: 'element-specific attribute',
    html: `${STATIC_HEADER_CONTRACT_ACCEPTED_HTML.replace(
      '<span class="search-trigger__placeholder" aria-hidden="true">検索...</span>',
      '<span class="search-trigger__placeholder" href="/search/" aria-hidden="true">検索...</span>',
    )}`,
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
  {
    label: 'search trigger missing',
    html: withoutSearchTrigger,
  },
  {
    label: 'search trigger is button',
    html: withSearchTrigger(
      `
      <button class="search-trigger" type="button">検索...</button>
`,
    ),
  },
  {
    label: 'search trigger href missing',
    html: withSearchTrigger(SEARCH_TRIGGER_HTML.replace(/\s+href="\/search\/"/u, '')),
  },
  {
    label: 'search trigger href empty',
    html: withSearchTrigger(SEARCH_TRIGGER_HTML.replace('href="/search/"', 'href=""')),
  },
  {
    label: 'search trigger dialog trigger missing',
    html: withSearchTrigger(
      SEARCH_TRIGGER_HTML.replace(/\s+data-search-dialog-trigger="true"/u, ''),
    ),
  },
  {
    label: 'search trigger no-router missing',
    html: withSearchTrigger(SEARCH_TRIGGER_HTML.replace(/\s+data-no-router="true"/u, '')),
  },
  {
    label: 'search trigger aria-haspopup missing',
    html: withSearchTrigger(SEARCH_TRIGGER_HTML.replace(/\s+aria-haspopup="dialog"/u, '')),
  },
  {
    label: 'search trigger aria-controls missing',
    html: withSearchTrigger(
      SEARCH_TRIGGER_HTML.replace(/\s+aria-controls="global-search-dialog"/u, ''),
    ),
  },
  {
    label: 'search trigger aria-expanded missing',
    html: withSearchTrigger(SEARCH_TRIGGER_HTML.replace(/\s+aria-expanded="false"/u, '')),
  },
  {
    label: 'search trigger aria-label missing',
    html: withSearchTrigger(
      SEARCH_TRIGGER_HTML.replace(/\s+aria-label="検索ダイアログを開く"/u, ''),
    ),
  },
  {
    label: 'search trigger icon missing',
    html: withSearchTrigger(
      SEARCH_TRIGGER_HTML.replace(
        / {8}<span class="search-trigger__icon static-icon" aria-hidden="true">[\s\S]*? {8}<\/span>\n/u,
        '',
      ),
    ),
  },
  {
    label: 'search trigger placeholder missing',
    html: withSearchTrigger(
      SEARCH_TRIGGER_HTML.replace(
        /\s+<span class="search-trigger__placeholder" aria-hidden="true">検索\.\.\.<\/span>/u,
        '',
      ),
    ),
  },
  {
    label: 'search trigger placeholder aria-hidden missing',
    html: withSearchTrigger(
      SEARCH_TRIGGER_HTML.replace(
        '<span class="search-trigger__placeholder" aria-hidden="true">',
        '<span class="search-trigger__placeholder">',
      ),
    ),
  },
  {
    label: 'search trigger placeholder text mismatch',
    html: withSearchTrigger(SEARCH_TRIGGER_HTML.replace('>検索...</span>', '>Search</span>')),
  },
];
