import { expect } from '@open-wc/testing';
import { createLayoutHeaderShellAdapter } from '../../src/components/app/shell/layout-header-shell-adapter.js';
import {
  DocumentContractViolationError,
  DocumentSnapshotFactory,
} from '../../src/router/document-snapshot-factory.js';

const parseDocument = (markup: string): Document => {
  const parser = new DOMParser();
  return parser.parseFromString(markup, 'text/html');
};

describe('DocumentSnapshotFactory', () => {
  it('main#main-content を優先して snapshot を組み立てること', async () => {
    const factory = new DocumentSnapshotFactory();
    const snapshot = await factory.create(
      parseDocument(`
        <!doctype html>
        <html>
          <head>
            <title>Client Routed</title>
            <meta name="description" content="document description">
          </head>
          <body>
            <layout-header
              breadcrumbs-json='[{"label":"Top","href":"/"}]'
              corpora-json='[{"key":"all","label":"すべて","href":"/corpora/"}]'
              current-corpus-key="all"
              note-layout
            ></layout-header>
            <main><h1>Legacy Main</h1></main>
            <main id="main-content"><h1>Preferred Main</h1></main>
          </body>
        </html>
      `),
      createLayoutHeaderShellAdapter(),
    );

    expect(snapshot.kind).to.equal('page');
    expect(snapshot.html).to.contain('Preferred Main');
    expect(snapshot.html).not.to.contain('Legacy Main');
    expect(snapshot.title).to.equal('Client Routed');
    expect(snapshot.metaDescription).to.equal('document description');
    expect(snapshot.shell).to.deep.equal({
      header: {
        breadcrumbs: [{ label: 'Top', href: '/' }],
        corpora: [{ key: 'all', label: 'すべて', href: '/corpora/' }],
        currentCorpusKey: 'all',
        noteLayout: true,
        sidebarEnabled: false,
      },
    });
  });

  it('layout-header が無い文書では shell に null を許容すること', async () => {
    const factory = new DocumentSnapshotFactory();
    const snapshot = await factory.create(
      parseDocument(`
        <!doctype html>
        <html>
          <head><title>Shellless</title></head>
          <body><main id="main-content"><h1>Content</h1></main></body>
        </html>
      `),
      createLayoutHeaderShellAdapter(),
    );

    expect(snapshot.kind).to.equal('page');
    expect(snapshot.shell).to.equal(null);
  });

  it('main を持たない文書は contract violation にすること', async () => {
    const factory = new DocumentSnapshotFactory();

    try {
      await factory.create(
        parseDocument(`
          <!doctype html>
          <html>
            <head><title>Broken</title></head>
            <body><div>main がありません</div></body>
          </html>
        `),
      );
      expect.fail('DocumentContractViolationError が投げられる必要があります。');
    } catch (error) {
      expect(error).to.be.instanceOf(DocumentContractViolationError);
    }
  });
});
