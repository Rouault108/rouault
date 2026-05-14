import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createNavigationEnvelopeFromHtml,
  emitNavigationArtifacts,
} from '../../build/navigation/emit-navigation-artifacts.js';
import { validateTocOwnerCandidates } from '../../build/navigation/validate-toc-owner-candidates.js';
import {
  createSidebarGroupId,
  createSidebarGroupIdPrefixFromSidebarIdentity,
} from '../../shared/navigation/sidebar-group-id.js';
import {
  createTocSourceSideEffect,
  tocSideEffectDirectives,
} from '../../src/toc/toc-source-side-effects.js';

describe('navigation artifacts', () => {
  const notesGroupId = createSidebarGroupId(
    createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', 'note-primary'),
    'notes',
  );
  it('TOC owner candidate validation は complete-validation mode で valid owner を受理すること', () => {
    expect(
      validateTocOwnerCandidates([
        {
          ownerId: 'toc-owner-example',
          targetPath: '/notes/example/',
          scopeId: 'note-toc',
        },
      ]),
    ).to.deep.equal({
      mode: 'complete-validation',
      issues: [],
      accepted: [
        {
          accepted: true,
          mode: 'complete-validation',
          ownerId: 'toc-owner-example',
        },
      ],
    });
  });

  it('TOC source side-effect directive は artifact 生成から独立した契約語彙を持つこと', () => {
    expect(tocSideEffectDirectives).to.deep.equal([
      'none',
      'cleanup-stale-source',
      'refresh-panel-content',
      'assert-css-artifact',
    ]);
    expect(createTocSourceSideEffect('toc-source-example', 'cleanup-stale-source')).to.deep.equal({
      directive: 'cleanup-stale-source',
      sourceId: 'toc-source-example',
      allowedDuringHydration: true,
    });
  });

  it('heading attribute が無い HTML からも NavigationEnvelope を抽出できること', () => {
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <title>Example - Rouault</title>
  <meta name="description" content="静かな説明">
</head>
<body>
  <ui-skip-link data-hydration-scope="skip-link" data-hydration-capability="interactive" data-hydration-trigger="initial"></ui-skip-link>
  <div id="app" data-hydration-scope="app-shell" data-hydration-marker="reading-shell" data-hydration-owner-id="app-shell">
    <layout-header
      note-layout
      sidebar-enabled
      sidebar-id="note-primary"
      toc-presence="present"
      toc-trigger-reserved="true"
      corpora-json='[{"key":"all","label":"All","href":"/corpora/"}]'
      current-corpus-key="all"
      toc-runtime-id="toc-source-example"
      data-toc-owner-id="toc-owner-test"
    ></layout-header>
    <app-router data-sidebar-presence="present">
      <div data-app-router-announcement="" aria-live="polite" aria-atomic="true" class="sr-only"></div>
      <aside data-app-shell-sidebar-host>
        <layout-sidebar
          state-scope-id="note-navigation"
          selected-id="notes/example"
          initial-expanded-ids='["notes"]'
          topology-revision="topology:example"
          fixed-breakpoint="1024"
          sidebar-id="note-primary"
          presentation="auto"
        ><nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="topology:example"><ul><li data-node-id="notes" data-node-kind="branch" data-node-depth="0" data-current-branch="true"><button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="true" aria-controls="${notesGroupId}"><span data-sidebar-nav-label>Notes</span><span data-sidebar-nav-disclosure aria-hidden="true"></span></button><ul id="${notesGroupId}"><li data-node-id="notes/example" data-node-kind="leaf" data-node-depth="1"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/example" aria-current="page"><span data-sidebar-nav-label>Example</span></a></li></ul></li></ul></nav></layout-sidebar>
      </aside>
      <main id="main-content"><article data-hydration-scope="note-content"><h1>Example</h1></article></main>
    </app-router>
  </div>
</body>
</html>
    `.trim();

    const envelope = createNavigationEnvelopeFromHtml(html, '/tmp/example/index.html', {
      mode: 'legacy-fixture',
      buildId: 'build-abcdef1',
      generatedAt: '2026-04-11T00:00:00.000Z',
    });

    expect(envelope.buildId).to.equal('build-abcdef1');
    expect(envelope.generatedAt).to.equal('2026-04-11T00:00:00.000Z');
    expect(envelope.document.title).to.equal('Example - Rouault');
    expect(envelope.document.description).to.equal('静かな説明');
    expect(envelope.document.renderedKind).to.equal('page');
    expect(envelope.document.html).to.contain('<article data-hydration-scope="note-content">');
    expect(envelope.shellProjection?.header.currentCorpusKey).to.equal('all');
    expect(envelope.shellProjection?.header.tocPresence).to.equal('present');
    expect(envelope.shellProjection?.header.tocRuntimeId).to.equal('toc-source-example');
    expect(envelope.shellProjection?.header.tocOwnerId).to.equal('toc-owner-test');
    expect(envelope.shellProjection?.header.tocTriggerReserved).to.equal(true);
    expect(envelope.shellProjection?.sidebar?.selectedId).to.equal('notes/example');
    expect(envelope.shellProjection?.sidebar?.initialExpandedIds).to.deep.equal(['notes']);
    expect(envelope.shellProjection?.sidebar?.topologyRevision).to.equal('topology:example');
    expect(envelope.shellProjection?.sidebar?.navHtml).to.contain('data-sidebar-nav');
    expect(envelope.shellProjection?.sidebar?.navHtml).to.contain('data-current-branch="true"');
    expect(envelope.shellProjection?.sidebar?.heading).to.equal(null);
    expect(envelope.hydrationPlan?.scopes).to.deep.equal([
      {
        scope: 'skip-link',
        capability: 'interactive',
        trigger: 'initial',
      },
      {
        scope: 'app-shell',
        marker: 'reading-shell',
        ownerId: 'app-shell',
      },
      {
        scope: 'note-content',
      },
    ]);
  });

  it('空白 heading attribute は artifact 抽出時に null へ正規化すること', () => {
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <title>Whitespace Heading - Rouault</title>
</head>
<body>
  <div id="app">
    <layout-header
      note-layout
      sidebar-enabled
      sidebar-id="note-primary"
      toc-presence="absent"
      corpora-json="[]"
      current-corpus-key="all"
      toc-trigger-reserved="false"
    ></layout-header>
    <app-router data-sidebar-presence="present">
      <aside data-app-shell-sidebar-host>
        <layout-sidebar
          state-scope-id="note-navigation"
          selected-id="notes/example"
          initial-expanded-ids="[]"
          topology-revision="topology:heading"
          heading="   "
          fixed-breakpoint="1024"
          sidebar-id="note-primary"
          presentation="auto"
        ><nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="topology:heading"><ul><li data-node-id="notes/example" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/example" aria-current="page"><span data-sidebar-nav-label>Example</span></a></li></ul></nav></layout-sidebar>
      </aside>
      <main id="main-content"><p>body</p></main>
    </app-router>
  </div>
</body>
</html>
    `.trim();

    const envelope = createNavigationEnvelopeFromHtml(html, '/tmp/example/index.html', {
      mode: 'legacy-fixture',
      buildId: 'build-heading',
      generatedAt: '2026-04-11T00:00:00.000Z',
    });

    expect(envelope.shellProjection?.sidebar?.heading).to.equal(null);
  });

  it('dist 配下の HTML に対応する router artifact を出力すること', async () => {
    const outputDir = await mkdtemp(path.join(tmpdir(), 'rouault-navigation-artifacts-'));

    try {
      const routeDir = path.join(outputDir, 'notes', 'example');
      await mkdir(routeDir, { recursive: true });
      await writeFile(
        path.join(routeDir, 'index.html'),
        `
<!DOCTYPE html>
<html>
<head>
  <title>Example - Rouault</title>
  <meta name="description" content="description">
  <meta name="rouault-build-id" content="build-1234567">
  <meta name="rouault-generated-at" content="2026-04-11T00:00:00.000Z">
</head>
<body>
  <layout-header current-corpus-key="all" toc-presence="absent" toc-runtime-id="" sidebar-id="note-primary" corpora-json="[]"></layout-header>
  <app-router>
    <div data-app-router-announcement="" aria-live="polite" aria-atomic="true" class="sr-only"></div>
    <main id="main-content"><p>body</p></main>
  </app-router>
</body>
</html>
        `.trim(),
        'utf8',
      );

      await emitNavigationArtifacts({
        outputDir,
        buildId: 'build-1234567',
        generatedAt: '2026-04-11T00:00:00.000Z',
      });

      const artifact = JSON.parse(
        await readFile(
          path.join(outputDir, '__router', 'notes', 'example', 'index.router.json'),
          'utf8',
        ),
      ) as {
        buildId: string;
        document: { html: string; title: string };
        shellProjection: { header: { currentCorpusKey: string; tocPresence: string } } | null;
      };

      expect(artifact.buildId).to.equal('build-1234567');
      expect(artifact.document.title).to.equal('Example - Rouault');
      expect(artifact.document.html).to.equal('<p>body</p>');
      expect(artifact.shellProjection?.header.currentCorpusKey).to.equal('all');
      expect(artifact.shellProjection?.header.tocPresence).to.equal('absent');
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });



  it('absent sidebar artifact では layout-header[sidebar-id] を default に固定すること', () => {
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <title>Absent Sidebar - Rouault</title>
</head>
<body>
  <layout-header current-corpus-key="all" toc-presence="absent" sidebar-id="note-secondary" corpora-json="[]"></layout-header>
  <app-router>
    <main id="main-content"><p>body</p></main>
  </app-router>
</body>
</html>
    `.trim();

    expect(() =>
      createNavigationEnvelopeFromHtml(html, '/tmp/absent/index.html', {
        mode: 'legacy-fixture',
        buildId: 'build-absent',
        generatedAt: '2026-04-11T00:00:00.000Z',
      }),
    ).toThrow(/default sidebar id/);
  });

  it('main#main-content を持たない HTML は artifact 化を失敗させること', () => {
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head><title>Broken</title></head>
<body>
  <app-router>
    <main><p>body</p></main>
  </app-router>
</body>
</html>
    `.trim();

    expect(() =>
      createNavigationEnvelopeFromHtml(html, '/tmp/broken/index.html', {
        mode: 'legacy-fixture',
        buildId: 'build-broken',
        generatedAt: '2026-04-11T00:00:00.000Z',
      }),
    ).toThrow(
      /main#main-content/,
    );
  });
});
