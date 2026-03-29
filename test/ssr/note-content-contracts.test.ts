import { describe, expect, it } from 'vitest';

import {
  injectNoteContentProfiles,
  validateNoteContentContracts,
} from '../../lib/content/note-content-contracts.js';

describe('validateNoteContentContracts', () => {
  it('reader note の preview-sandbox を build error にすること', () => {
    expect(() =>
      validateNoteContentContracts(
        'reader',
        '<ui-code-preview><ui-preview-sandbox slot="preview"></ui-preview-sandbox></ui-code-preview>',
        'testing/test',
      ),
    ).toThrow('[note-content:testing/test] reader note では preview-sandbox を使用できません');
  });

  it('reader note の code-preview controls と toolbar を build error にすること', () => {
    expect(() =>
      validateNoteContentContracts(
        'reader',
        '<ui-code-preview controls="viewport"><button slot="toolbar">Open</button></ui-code-preview>',
        'testing/test',
      ),
    ).toThrow('[note-content:testing/test] reader note の code-preview では controls を使用できません');
  });

  it('testing note の sandbox と controls は許可すること', () => {
    expect(() =>
      validateNoteContentContracts(
        'testing',
        '<ui-code-preview controls="viewport"><ui-preview-sandbox slot="preview"></ui-preview-sandbox></ui-code-preview>',
        'testing/test',
        'sandbox',
      ),
    ).not.toThrow();
  });

  it('testing/sandbox 以外の preview-sandbox を build error にすること', () => {
    expect(() =>
      validateNoteContentContracts(
        'testing',
        '<ui-code-preview><ui-preview-sandbox slot="preview" allow-js="true"></ui-preview-sandbox></ui-code-preview>',
        'testing/interactive',
        'interactive',
      ),
    ).toThrow('[note-content:testing/interactive] testing/sandbox 以外では preview-sandbox を使用できません');
  });
});

describe('injectNoteContentProfiles', () => {
  it('reader note の code-preview に reader profile を注入すること', () => {
    expect(
      injectNoteContentProfiles('<ui-code-preview heading="例"></ui-code-preview>', 'reader'),
    ).toContain('preview-profile="reader"');
  });

  it('testing note の code-preview に demo profile を注入すること', () => {
    expect(
      injectNoteContentProfiles('<ui-code-preview heading="例"></ui-code-preview>', 'testing'),
    ).toContain('preview-profile="demo"');
  });
});
