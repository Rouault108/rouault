import { layoutTocMobileController } from '../components/layout/layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore } from '../components/layout/layout-toc-runtime-store.js';
import type { TocHydrationSession } from './toc-hydration-session.js';

export const syncLayoutTocControllersForSession = (
  session: TocHydrationSession,
  input: {
    readonly ready: boolean;
    readonly hasVisibleHeadings: boolean;
    readonly activeId: string | null;
  },
): void => {
  layoutTocRuntimeStore.publish(session.runtimeId, {
    ...input,
    hydrationState: session.state,
  });

  if (session.state === 'disposed') {
    layoutTocMobileController.cleanup(session.runtimeId);
  }
};
