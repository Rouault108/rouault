import { afterEach, describe, expect, it } from 'vitest';

import { enhanceNoteStaticSurface } from '../../src/client/post-hydrate/note-static-surface-enhancer.js';

describe('note-static-surface-enhancer', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('activation root 内の static copy button だけを対象にすること', () => {
    const surface = document.createElement('div');
    surface.id = 'note-content-test';
    surface.className = 'prose';
    surface.dataset['noteStaticSurface'] = 'true';
    surface.innerHTML = `
      <template id="copy-source" data-code-copy-source>const answer = 42;</template>
      <button type="button" data-copy-button data-copy-target-id="copy-source">copy</button>
    `;

    const outside = document.createElement('button');
    outside.type = 'button';
    outside.dataset['copyButton'] = 'true';

    document.body.append(surface, outside);

    enhanceNoteStaticSurface(surface);

    const inside = surface.querySelector<HTMLButtonElement>('[data-copy-button]');
    expect(surface.id).to.equal('note-content-test');
    expect(inside?.dataset['copyEnhanced']).to.equal('true');
    expect(outside.dataset['copyEnhanced']).to.equal(undefined);
  });
});
