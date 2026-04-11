import { describe, expect, it } from 'vitest';
import { documentSnapshotToEnvelope } from '../../src/router/document-snapshot-to-envelope.js';
import {
  NavigationEnvelopeValidationError,
  validateNavigationEnvelope,
} from '../../src/router/navigation-envelope-validator.js';
import { NAVIGATION_ENVELOPE_SCHEMA_VERSION } from '../../shared/navigation/navigation-envelope.js';

describe('navigation envelope', () => {
  it('legacy DocumentSnapshot を NavigationEnvelope へ正規化すること', () => {
    const envelope = documentSnapshotToEnvelope({
      kind: 'page',
      html: '<h1>Example</h1>',
      title: 'Example - Rouault',
      metaDescription: 'description',
      shell: {
        header: {
          breadcrumbs: [{ label: 'Top', href: '/' }],
          corpora: [],
          currentCorpusKey: 'all',
          noteLayout: false,
          sidebarEnabled: false,
        },
        sidebar: null,
      },
      announcedTitle: 'Example',
    });

    expect(envelope).to.deep.equal({
      schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
      buildId: undefined,
      generatedAt: undefined,
      document: {
        html: '<h1>Example</h1>',
        title: 'Example - Rouault',
        description: 'description',
        renderedKind: 'page',
        announcedTitle: 'Example',
      },
      shellProjection: {
        header: {
          breadcrumbs: [{ label: 'Top', href: '/' }],
          corpora: [],
          currentCorpusKey: 'all',
          noteLayout: false,
          sidebarEnabled: false,
        },
        sidebar: null,
      },
      hydrationPlan: null,
    });
  });

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
