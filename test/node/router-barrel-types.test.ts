import { describe, expect, it } from 'vitest';

import type {
  PayloadDocumentShellSnapshot,
  RuntimeDocumentShellSnapshot,
  ShellUpdatePayload,
  StrictLoadedNavigationEnvelope,
} from '../../src/router/router.js';
import { EMPTY_CORPUS_NAVIGATION_PROJECTION_PAYLOAD } from '../../shared/navigation/corpus-navigation-projection.js';
import { createCanonicalAbsentRuntimeSidebarProjection } from '../../shared/navigation/sidebar-shell-projection-contract.js';

const acceptsPayloadShell = (value: PayloadDocumentShellSnapshot | null): PayloadDocumentShellSnapshot | null => value;
const acceptsRuntimeShell = (value: RuntimeDocumentShellSnapshot | null): RuntimeDocumentShellSnapshot | null => value;
const acceptsStrictEnvelope = (value: StrictLoadedNavigationEnvelope): string => value.buildId;

describe('router barrel shell projection types', () => {
  it('ShellUpdatePayload は payload shell snapshot を受け取り、runtime absent は rollback 側に限定すること', () => {
    const payloadUpdate: ShellUpdatePayload = {
      shell: null,
      navigationUrl: '/notes/example',
    };

    const runtimeShell: RuntimeDocumentShellSnapshot = {
      header: {
        corpora: EMPTY_CORPUS_NAVIGATION_PROJECTION_PAYLOAD,
        currentCorpusKey: 'all',
        noteLayout: false,
        sidebarEnabled: false,
        sidebarId: 'note-primary',
        tocPresence: 'absent',
        tocRuntimeId: null,
        tocOwnerId: null,
        tocTriggerReserved: false,
      },
      sidebar: createCanonicalAbsentRuntimeSidebarProjection(),
    };

    expect(acceptsPayloadShell(payloadUpdate.shell)).to.equal(null);
    const absentRuntimeSidebar = createCanonicalAbsentRuntimeSidebarProjection();
    const runtimeRollbackShell: RuntimeDocumentShellSnapshot = {
      header: runtimeShell.header,
      sidebar: absentRuntimeSidebar,
    };
    const invalidPayloadShell: PayloadDocumentShellSnapshot = {
      header: runtimeShell.header,
      // @ts-expect-error payload shell snapshot must not accept runtime present:false sidebar.
      sidebar: absentRuntimeSidebar,
    };

    expect(acceptsRuntimeShell(runtimeShell)?.sidebar?.present).to.equal(false);
    expect(acceptsRuntimeShell(runtimeRollbackShell)?.sidebar?.present).to.equal(false);
    expect(Boolean(invalidPayloadShell)).to.equal(true);
    expect(
      acceptsStrictEnvelope({
        schemaVersion: 1,
        buildId: 'build-test',
        generatedAt: '2026-04-11T00:00:00.000Z',
        document: {
          html: '<p>Example</p>',
          title: 'Example',
          description: null,
          renderedKind: 'page',
        },
        shellProjection: null,
        hydrationPlan: null,
      }),
    ).to.equal('build-test');
  });
});
