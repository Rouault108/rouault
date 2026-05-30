import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('search dialog import boundary', () => {
  it('neutral search dialog modules do not depend on old component or Lit rendering', () => {
    for (const path of [
      'src/search/search-dialog-highlight.ts',
      'src/search/search-dialog-search-session.ts',
      'src/search/search-dialog-search-worker.ts',
      'src/search/search-dialog-selection-model.ts',
      'src/search/search-dialog-virtualizer.ts',
      'src/search/search-dialog-types.ts',
      'src/search/search-dialog-events.ts',
      'src/search/search-dialog-constants.ts',
      'src/search/bootstrap.ts',
      'src/client/post-hydrate/search-dialog-enhancer.ts',
      'src/client/post-hydrate/search-dialog-dom-controller.ts',
      'src/client/post-hydrate/search-dialog-dom-utils.ts',
    ]) {
      const source = readSource(path);
      expect(source, path).not.toContain('src/components/ui/search-dialog');
      expect(source, path).not.toContain('UiSearchDialog');
      expect(source, path).not.toContain('SearchDialogElement');
      expect(source, path).not.toMatch(/<\/?ui-search-dialog\b/u);
    }

    const highlight = readSource('src/search/search-dialog-highlight.ts');
    expect(highlight).not.toMatch(/from ['"]lit/u);
    expect(highlight).not.toContain('TemplateResult');
    expect(highlight).not.toContain('nothing');
  });

  it('static dialog events and return-to-reading navigation events are separated', () => {
    const dialogEvents = readSource('src/search/search-dialog-events.ts');
    const navigationEvents = readSource('src/search/search-navigation-events.ts');
    const navigation = readSource('src/search/navigation.ts');

    expect(dialogEvents).toContain('search-dialog:open-request');
    expect(dialogEvents).not.toContain('rouault-search:return-to-reading');
    expect(dialogEvents).not.toContain('rouault-search:open');
    expect(dialogEvents).not.toContain('rouault-search:close');

    expect(navigationEvents).toContain('rouault-search:return-to-reading');
    expect(navigationEvents).not.toContain('search-dialog:open-request');
    expect(navigation).toContain("from './search-navigation-events.js'");
    expect(navigation).not.toContain("from './search-dialog-events.js'");
  });

  it('search dialog events are created only through the static event helper', () => {
    for (const path of [
      'src/search/bootstrap.ts',
      'src/client/post-hydrate/search-dialog-enhancer.ts',
      'src/client/post-hydrate/search-dialog-dom-controller.ts',
    ]) {
      const source = readSource(path);
      expect(source, path).not.toMatch(/new\s+CustomEvent\(['"]search-dialog:/u);
      expect(source, path).toContain('dispatchSearchDialogEvent');
    }
  });

  it('selection model remains DOM independent', () => {
    const selectionModel = readSource('src/search/search-dialog-selection-model.ts');
    expect(selectionModel).not.toContain('SearchDialogVirtualizer');
    expect(selectionModel).not.toMatch(/\b(?:KeyboardEvent|Event|HTMLElement|HTMLInputElement|HTMLButtonElement|ShadowRoot)\b/u);
    expect(selectionModel).not.toContain('composedPath');
    expect(selectionModel).not.toContain('.closest(');
    expect(selectionModel).not.toContain('querySelector');
    expect(selectionModel).not.toContain('getElementById');
    expect(selectionModel).not.toContain('search-option-');
    expect(selectionModel).not.toContain('requestClear');
    expect(selectionModel).not.toContain('requestClose');
  });

  it('event detail types live only in the event module', () => {
    const types = readSource('src/search/search-dialog-types.ts');
    expect(types).not.toContain('SearchDialogSelectedDetail');
    expect(types).not.toContain('SearchDialogOpenedDetail');
    expect(types).not.toContain('SearchDialogClosedDetail');
    expect(types).not.toContain('SearchDialogOpenRequestedDetail');
    expect(types).not.toContain('SearchDialogCloseRequestedDetail');
    expect(types).not.toContain('SearchDialogQueryChangedDetail');
  });
});
