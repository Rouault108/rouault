import { describe, expect, it } from 'vitest';

import { buildE2ENoteFixtureManifest } from '../../build/testing/e2e-note-fixture-manifest.js';

describe('buildE2ENoteFixtureManifest', () => {
  it('e2e fixture id から permalink と content root id を引けること', () => {
    const manifest = buildE2ENoteFixtureManifest([
      {
        title: 'JavaScriptの配列',
        slug: 'program/sample-javascript',
        permalink: '/notes/program/sample-javascript',
        e2eFixtureId: 'note.sample-javascript',
      },
    ]);

    expect(manifest['note.sample-javascript']).toEqual({
      fixtureId: 'note.sample-javascript',
      title: 'JavaScriptの配列',
      slug: 'program/sample-javascript',
      permalink: '/notes/program/sample-javascript',
      contentRootId: 'note-content-program-sample-javascript',
    });
  });

  it('fixture id の重複を reject すること', () => {
    expect(() =>
      buildE2ENoteFixtureManifest([
        {
          title: 'first',
          slug: 'testing/first',
          permalink: '/notes/testing/first',
          e2eFixtureId: 'note.duplicate',
        },
        {
          title: 'second',
          slug: 'testing/second',
          permalink: '/notes/testing/second',
          e2eFixtureId: 'note.duplicate',
        },
      ]),
    ).toThrowError('Duplicate e2e fixture id detected: "note.duplicate".');
  });
});