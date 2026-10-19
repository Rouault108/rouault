import { afterEach, expect, it, vi } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import {
  commitShellGeneration,
  readValidatedShellProof,
  recordValidatedShellProof,
  resetShellLifecycleForTest,
  restoreShellGeneration,
  subscribeValidatedShellProof,
} from '../../src/components/app/shell/app-shell-lifecycle.js';
import type { AppShellValidatedDetail } from '../../src/components/app/shell/app-shell-events.js';

afterEach(() => resetShellLifecycleForTest());

const detailFor = (header: HTMLElement, shellCommitId = 0): AppShellValidatedDetail => ({
  header,
  shellCommitId,
  navigationUrl: '/',
  shell: { headerHtml: header.outerHTML, sidebarProjection: null },
  linkValidationContext: {
    siteUrlContext: { siteOrigin: location.origin, basePath: '' },
    currentAbsoluteUrl: `${location.origin}/`,
    normalizedNavigationUrl: '/',
    routeManifestState: {
      status: 'loaded',
      manifest: {
        version: 1,
        buildId: 'shell-proof-test',
        buildLabel: 'test',
        generatedAt: '2026-10-19T00:00:00.000Z',
        siteOrigin: location.origin,
        basePath: '',
        routes: ['/'],
      },
      routeSet: { routes: ['/'], has: (path) => path === '/' },
    },
  },
});

it('shell証明は実Document/header identityと現行世代へ結び付き、置換されたheaderでは再利用しない', async () => {
  const header = await fixture('<header data-layout-header>header</header>');
  recordValidatedShellProof(detailFor(header), document);
  expect(readValidatedShellProof()).toMatchObject({ document, header, shellCommitId: 0 });
  commitShellGeneration(1);
  expect(readValidatedShellProof()).toBeNull();
  restoreShellGeneration(0);
  expect(readValidatedShellProof()?.header).toBe(header);
  const replacement = header.cloneNode(true);
  header.replaceWith(replacement);
  expect(readValidatedShellProof()).toBeNull();
});

it('直近の証明だけを保持し、旧世代へ戻しても以前の証明を復活させない', async () => {
  const header = await fixture('<header data-layout-header>header</header>');
  recordValidatedShellProof(detailFor(header), document);
  commitShellGeneration(1);
  recordValidatedShellProof(detailFor(header, 1), document);
  expect(readValidatedShellProof()?.shellCommitId).toBe(1);
  restoreShellGeneration(0);
  expect(readValidatedShellProof()).toBeNull();
});

it('証明通知の例外を隔離し、購読解除は自分の登録だけを解放する', async () => {
  const header = await fixture('<header data-layout-header>header</header>');
  const stopFault = subscribeValidatedShellProof(() => {
    throw new Error('proof listener');
  });
  const listener = vi.fn(() => expect(readValidatedShellProof()?.header).toBe(header));
  const stop = subscribeValidatedShellProof(listener);
  expect(() => recordValidatedShellProof(detailFor(header), document)).not.toThrow();
  expect(listener).toHaveBeenCalledTimes(1);
  stop();
  recordValidatedShellProof(detailFor(header), document);
  expect(listener).toHaveBeenCalledTimes(1);
  stopFault();
});
