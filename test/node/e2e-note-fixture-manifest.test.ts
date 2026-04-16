import { describe, expect, it } from 'vitest';

import {
  REQUIRED_E2E_NOTE_FIXTURE_IDS,
  buildE2ENoteFixtureManifest,
} from '../../build/testing/e2e-note-fixture-manifest.js';

describe('buildE2ENoteFixtureManifest', () => {
  it('e2e fixture id から permalink と content root id を引けること', () => {
    const manifest = buildE2ENoteFixtureManifest(
      [
        {
          title: 'Layout Rich',
          slug: 'e2e/layout-rich',
          permalink: '/notes/e2e/layout-rich',
          e2eFixtureId: 'note.layout-rich',
        },
      ],
      {
        requiredFixtureIds: [],
      },
    );

    expect(manifest['note.layout-rich']).toEqual({
      fixtureId: 'note.layout-rich',
      title: 'Layout Rich',
      slug: 'e2e/layout-rich',
      permalink: '/notes/e2e/layout-rich',
      contentRootId: 'note-content-e2e-layout-rich',
    });
  });

  it('fixture id の重複を reject すること', () => {
    expect(() =>
      buildE2ENoteFixtureManifest(
        [
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
        ],
        {
          requiredFixtureIds: [],
        },
      ),
    ).toThrowError('Duplicate e2e fixture id detected: "note.duplicate".');
  });

  it('required fixture id が欠けている場合は失敗すること', () => {
    expect(() =>
      buildE2ENoteFixtureManifest([
        {
          title: 'Layout Rich',
          slug: 'e2e/layout-rich',
          permalink: '/notes/e2e/layout-rich',
          e2eFixtureId: 'note.layout-rich',
        },
      ]),
    ).toThrowError(
      `Missing required e2e fixture ids: ${REQUIRED_E2E_NOTE_FIXTURE_IDS.filter((fixtureId) => fixtureId !== 'note.layout-rich')
        .sort()
        .join(', ')}.`,
    );
  });
});