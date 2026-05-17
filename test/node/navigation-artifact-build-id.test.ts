import { describe, expect, it } from 'vitest';

import { createNavigationEnvelopeFromHtml } from '../../build/navigation/emit-navigation-artifacts.js';
import { EMPTY_CORPUS_NAVIGATION_PROJECTION_PAYLOAD } from '../../shared/navigation/corpus-navigation-projection.js';

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const emptyCorpusPayloadJson = JSON.stringify(EMPTY_CORPUS_NAVIGATION_PROJECTION_PAYLOAD);

const createHtml = (options: {
  buildIdMeta?: string | null;
  generatedAtMeta?: string | null;
} = {}): string => {
  const buildIdMeta = hasOwn(options, 'buildIdMeta') ? options.buildIdMeta : 'build-current';
  const generatedAtMeta = hasOwn(options, 'generatedAtMeta')
    ? options.generatedAtMeta
    : '2026-04-11T00:00:00.000Z';

  return [
    '<!doctype html>',
    '<html lang="ja">',
    '<head>',
    '  <title>Example - Rouault</title>',
    buildIdMeta === null ? '' : `  <meta name="rouault-build-id" content="${buildIdMeta}">`,
    generatedAtMeta === null
      ? ''
      : `  <meta name="rouault-generated-at" content="${generatedAtMeta}">`,
    '</head>',
    '<body>',
    `  <layout-header current-corpus-key="all" toc-presence="absent" sidebar-id="note-primary" corpora-json='${emptyCorpusPayloadJson}'></layout-header>`,
    '  <app-router><main id="main-content"><p>body</p></main></app-router>',
    '</body>',
    '</html>',
  ].join('\n');
};

describe('navigation artifact build metadata contract', () => {
  it('strict-artifact mode では embedded buildId / generatedAt と injected metadata の一致を必須にすること', () => {
    const envelope = createNavigationEnvelopeFromHtml(createHtml(), '/tmp/example/index.html', {
      mode: 'strict-artifact',
      buildId: 'build-current',
      generatedAt: '2026-04-11T00:00:00.000Z',
    });

    expect(envelope.buildId).toBe('build-current');
    expect(envelope.generatedAt).toBe('2026-04-11T00:00:00.000Z');
  });

  it('strict-artifact mode では embedded buildId mismatch を拒否すること', () => {
    expect(() =>
      createNavigationEnvelopeFromHtml(
        createHtml({ buildIdMeta: 'build-stale' }),
        '/tmp/example/index.html',
        {
          mode: 'strict-artifact',
          buildId: 'build-current',
          generatedAt: '2026-04-11T00:00:00.000Z',
        },
      ),
    ).toThrow(/embedded buildId does not match strict-artifact buildId/u);
  });

  it('strict-artifact mode では embedded generatedAt mismatch を拒否すること', () => {
    expect(() =>
      createNavigationEnvelopeFromHtml(
        createHtml({ generatedAtMeta: '2026-04-11T00:00:01.000Z' }),
        '/tmp/example/index.html',
        {
          mode: 'strict-artifact',
          buildId: 'build-current',
          generatedAt: '2026-04-11T00:00:00.000Z',
        },
      ),
    ).toThrow(/embedded generatedAt does not match strict-artifact generatedAt/u);
  });

  it('strict-artifact mode では meta buildId / generatedAt の片側欠落を拒否すること', () => {
    for (const html of [
      createHtml({ buildIdMeta: null }),
      createHtml({ generatedAtMeta: null }),
    ]) {
      expect(() =>
        createNavigationEnvelopeFromHtml(html, '/tmp/example/index.html', {
          mode: 'strict-artifact',
          buildId: 'build-current',
          generatedAt: '2026-04-11T00:00:00.000Z',
        }),
      ).toThrow(/strict-artifact mode requires embedded buildId and generatedAt meta/u);
    }
  });


  it('strict-artifact mode では injected buildId / generatedAt の欠落・不正値を拒否すること', () => {
    const cases: {
      buildId: unknown;
      generatedAt: unknown;
      message: RegExp;
    }[] = [
      { buildId: undefined, generatedAt: '2026-04-11T00:00:00.000Z', message: /buildId/u },
      { buildId: '', generatedAt: '2026-04-11T00:00:00.000Z', message: /buildId/u },
      { buildId: 'build current', generatedAt: '2026-04-11T00:00:00.000Z', message: /buildId/u },
      { buildId: 'build-current', generatedAt: undefined, message: /generatedAt/u },
      { buildId: 'build-current', generatedAt: '', message: /generatedAt/u },
      { buildId: 'build-current', generatedAt: 'not-a-date', message: /generatedAt/u },
    ];

    for (const testCase of cases) {
      expect(() =>
        createNavigationEnvelopeFromHtml(createHtml(), '/tmp/example/index.html', {
          mode: 'strict-artifact',
          buildId: testCase.buildId,
          generatedAt: testCase.generatedAt,
        } as never),
      ).toThrow(testCase.message);
    }
  });

});
