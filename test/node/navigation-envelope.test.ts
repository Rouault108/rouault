import { describe, expect, it } from 'vitest';
import { validateNavigationEnvelope } from '../../src/router/navigation-envelope-validator.js';
import { NavigationEnvelopeContractError } from '../../src/router/navigation-envelope-errors.js';
import { RouterDiagnosticError } from '../../src/router/router-diagnostics.js';
import { NAVIGATION_ENVELOPE_SCHEMA_VERSION } from '../../shared/navigation/navigation-envelope.js';

const VALID_SIDEBAR_NAV_HTML =
  '<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="rev-1"><ul><li data-node-id="notes/example" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/example/" aria-current="page"><span data-sidebar-nav-label>Example</span></a></li></ul></nav>';

describe('navigation envelope', () => {
  it('schemaVersion と最小構造が正しい envelope を受理すること', () => {
    const envelope = validateNavigationEnvelope({
      schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
      buildId: 'build-123',
      document: {
        html: '<main>ok</main>',
        title: 'Example',
        description: null,
        renderedKind: 'page',
      },
      shellProjection: null,
      hydrationPlan: {
        scopes: [{ scope: 'note-shell', capability: 'interactive', trigger: 'initial' }],
      },
    });

    expect(envelope.buildId).to.equal('build-123');
    expect(envelope.document.renderedKind).to.equal('page');
    expect(envelope.hydrationPlan?.scopes).to.have.length(1);
  });

  it('present sidebar の navHtml / topologyRevision を保持し heading = null を受理すること', () => {
    const envelope = validateNavigationEnvelope({
      schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
      buildId: 'build-456',
      document: {
        html: '<main>ok</main>',
        title: 'Example With Sidebar',
        description: null,
        renderedKind: 'page',
      },
      shellProjection: {
        header: {
          corpora: [],
          currentCorpusKey: 'all',
          noteLayout: true,
          sidebarEnabled: true,
          sidebarId: 'note-primary',
          tocPresence: 'absent',
          tocRuntimeId: null,
          tocOwnerId: null,
          tocTriggerReserved: false,
        },
        sidebar: {
          present: true,
          sidebarId: 'note-primary',
          stateScopeId: 'note-navigation',
          selectedId: 'notes/example',
          initialExpandedIds: [],
          fixedBreakpoint: 1024,
          presentation: 'auto',
          heading: null,
          topologyRevision: 'rev-1',
          navHtml: VALID_SIDEBAR_NAV_HTML,
        },
      },
      hydrationPlan: null,
    });

    expect(envelope.shellProjection?.sidebar?.heading).to.equal(null);
    expect(envelope.shellProjection?.header.tocTriggerReserved).to.equal(false);
    expect(envelope.shellProjection?.sidebar?.initialExpandedIds).to.deep.equal([]);
    expect(envelope.shellProjection?.sidebar?.topologyRevision).to.equal('rev-1');
    expect(envelope.shellProjection?.sidebar?.navHtml).to.equal(VALID_SIDEBAR_NAV_HTML);
  });

  it('present sidebar の空白 heading は null に正規化し navHtml / topologyRevision は必須にすること', () => {
    const envelope = validateNavigationEnvelope({
      schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
      document: {
        html: '<main>ok</main>',
        title: 'Blank Sidebar Fields',
        description: null,
        renderedKind: 'page',
      },
      shellProjection: {
        header: {
          corpora: [],
          currentCorpusKey: 'all',
          noteLayout: true,
          sidebarEnabled: true,
          sidebarId: 'note-primary',
          tocPresence: 'absent',
          tocRuntimeId: null,
          tocOwnerId: null,
          tocTriggerReserved: false,
        },
        sidebar: {
          present: true,
          sidebarId: 'note-primary',
          stateScopeId: 'note-navigation',
          selectedId: 'notes/example',
          initialExpandedIds: [],
          fixedBreakpoint: 1024,
          presentation: 'auto',
          heading: '   ',
          topologyRevision: 'rev-1',
          navHtml: VALID_SIDEBAR_NAV_HTML,
        },
      },
      hydrationPlan: null,
    });

    expect(envelope.shellProjection?.sidebar?.heading).to.equal(null);
    expect(envelope.shellProjection?.sidebar?.topologyRevision).to.equal('rev-1');
    expect(envelope.shellProjection?.sidebar?.navHtml).to.equal(VALID_SIDEBAR_NAV_HTML);

    expect(() =>
      validateNavigationEnvelope({
        schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
        document: {
          html: '<main>ok</main>',
          title: 'Invalid Sidebar Fields',
          description: null,
          renderedKind: 'page',
        },
        shellProjection: {
          header: {
            corpora: [],
            currentCorpusKey: 'all',
            noteLayout: true,
            sidebarEnabled: true,
            tocPresence: 'absent',
          },
          sidebar: {
            present: true,
            sidebarId: 'note-primary',
            stateScopeId: 'note-navigation',
            selectedId: null,
            initialExpandedIds: [],
            fixedBreakpoint: 1024,
            presentation: 'auto',
            heading: '   ',
            topologyRevision: '  ',
            navHtml: '\n  ',
          },
        },
        hydrationPlan: null,
      }),
    ).to.throw(NavigationEnvelopeContractError);
  });

  it('schemaVersion 不一致は reject すること', () => {
    expect(() =>
      validateNavigationEnvelope({
        schemaVersion: 999,
        document: {
          html: '<main>bad</main>',
          title: 'Bad',
          description: null,
          renderedKind: 'page',
        },
        shellProjection: null,
      }),
    ).to.throw(NavigationEnvelopeContractError);
  });

  it('不正 envelope rejection は router diagnostic reason を保持すること', () => {
    try {
      validateNavigationEnvelope({
        schemaVersion: 999,
        document: {
          html: '<main>bad</main>',
          title: 'Bad',
          description: null,
          renderedKind: 'page',
        },
        shellProjection: null,
      });
      throw new Error('validation should fail');
    } catch (error) {
      expect(error).to.be.instanceOf(NavigationEnvelopeContractError);
      expect((error as Error).cause).to.be.instanceOf(RouterDiagnosticError);
      expect(((error as Error).cause as RouterDiagnosticError).diagnostic.reason).to.equal(
        'navigation-envelope-invalid',
      );
    }
  });
});
