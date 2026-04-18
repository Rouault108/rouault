import { describe, expect, it } from 'vitest';
import {
  NavigationEnvelopeValidationError,
  validateNavigationEnvelope,
} from '../../src/router/navigation-envelope-validator.js';
import { NAVIGATION_ENVELOPE_SCHEMA_VERSION } from '../../shared/navigation/navigation-envelope.js';

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

  it('sidebar.heading = null を含む shellProjection を受理して null へ正規化すること', () => {
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
          breadcrumbs: [],
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
          selectedId: 'notes/example',
          fixedBreakpoint: 1024,
          presentation: 'auto',
          heading: null,
        },
      },
      hydrationPlan: null,
    });

    expect(envelope.shellProjection?.sidebar?.heading).to.equal(null);
    expect(envelope.shellProjection?.sidebar?.initialExpandedIds).to.deep.equal([]);
    expect(envelope.shellProjection?.sidebar?.topologyRevision).to.equal(null);
    expect(envelope.shellProjection?.sidebar?.navHtml).to.equal(null);
  });

  it('sidebar の空白 heading / topologyRevision / navHtml を null へ正規化すること', () => {
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
          breadcrumbs: [],
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
          fixedBreakpoint: 1024,
          presentation: 'auto',
          heading: '   ',
          topologyRevision: '  ',
          navHtml: '\n  ',
        },
      },
      hydrationPlan: null,
    });

    expect(envelope.shellProjection?.sidebar?.heading).to.equal(null);
    expect(envelope.shellProjection?.sidebar?.topologyRevision).to.equal(null);
    expect(envelope.shellProjection?.sidebar?.navHtml).to.equal(null);
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
    ).to.throw(NavigationEnvelopeValidationError);
  });
});
