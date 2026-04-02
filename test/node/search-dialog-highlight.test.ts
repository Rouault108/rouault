import { describe, expect, it } from 'vitest';
import {
  renderSearchDialogHighlightedText,
  resolveSearchDialogItemPath,
  splitSearchDialogHighlightParts,
} from '../../src/components/ui/search-dialog/internals/search-dialog-highlight.js';

describe('search-dialog-highlight', () => {
  it('path が明示されている場合はそれを優先する', () => {
    const resolved = resolveSearchDialogItemPath(
      {
        id: 'alpha',
        title: 'Alpha',
        url: 'https://example.com/docs/alpha',
        path: '/custom/alpha',
      },
      'https://example.com/base',
    );

    expect(resolved).to.equal('/custom/alpha');
  });

  it('path がない場合は url から pathname/search/hash を解決する', () => {
    const resolved = resolveSearchDialogItemPath(
      {
        id: 'alpha',
        title: 'Alpha',
        url: 'https://example.com/docs/alpha?q=1#top',
      },
      'https://example.com/base',
    );

    expect(resolved).to.equal('/docs/alpha?q=1#top');
  });

  it('クエリ一致箇所を matched=true で分割する', () => {
    const parts = splitSearchDialogHighlightParts('Alpha Guide', 'gui');

    expect(parts).to.deep.equal([
      { text: 'Alpha ', matched: false },
      { text: 'Gui', matched: true },
      { text: 'de', matched: false },
    ]);
  });

  it('一致がない場合はそのまま 1 パートで返す', () => {
    const parts = splitSearchDialogHighlightParts('Alpha Guide', 'zzz');

    expect(parts).to.deep.equal([{ text: 'Alpha Guide', matched: false }]);
  });

  it('ハイライト不要なら文字列をそのまま返す', () => {
    const rendered = renderSearchDialogHighlightedText('Alpha Guide', 'zzz');

    expect(rendered).to.equal('Alpha Guide');
  });
});