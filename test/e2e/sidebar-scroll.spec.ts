import { expect, test } from '@playwright/test';

const sourcePath = '/notes/testing/sidebar-scroll/group-01/source';
const targetPath = '/notes/testing/sidebar-scroll/group-16/target';
const targetGroupId = 'testing/sidebar-scroll/group-16';
const targetNoteId = 'testing/sidebar-scroll/group-16/target';

interface ScrollProbeEntry {
  top: number | null;
  behavior: string | null;
}

interface SidebarSnapshot {
  scrollTop: number;
  groupExpanded: string | null;
  targetVisible: boolean;
  targetSelected: boolean;
}

test.describe('Sidebar Selected Item Scroll', () => {
  test('ルート遷移時に現在ノートの親階層を開いて 1 回だけ可視位置へ寄せること', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.goto(`${sourcePath}/`);

    const beforeNavigation = await page.locator('layout-sidebar').evaluate<
      SidebarSnapshot,
      {
        groupId: string;
        noteId: string;
      }
    >(
      (host, ids) => {
        const layoutSidebar = host as HTMLElement;
        const uiSidebar = layoutSidebar.shadowRoot?.querySelector('ui-sidebar');
        const fileTree = uiSidebar?.shadowRoot?.querySelector('ui-file-tree');
        const shell = uiSidebar?.shadowRoot?.querySelector('ui-sidebar-shell');
        const content = shell?.shadowRoot?.querySelector<HTMLElement>('.sidebar-content');
        const targetGroup = fileTree?.shadowRoot?.querySelector<HTMLElement>(
          `ui-tree-item[data-id="${ids.groupId}"]`,
        );
        const targetLeaf = fileTree?.shadowRoot?.querySelector<HTMLElement>(
          `ui-tree-item[data-id="${ids.noteId}"]`,
        );

        return {
          scrollTop: content?.scrollTop ?? -1,
          groupExpanded: targetGroup?.getAttribute('aria-expanded') ?? null,
          targetVisible: targetLeaf !== null,
          targetSelected: targetLeaf?.getAttribute('aria-selected') === 'true',
        };
      },
      { groupId: targetGroupId, noteId: targetNoteId },
    );

    expect(beforeNavigation.scrollTop).toBeLessThanOrEqual(1);
    expect(beforeNavigation.groupExpanded).toBeNull();
    expect(beforeNavigation.targetVisible).toBe(false);
    expect(beforeNavigation.targetSelected).toBe(false);

    await page.evaluate(() => {
      const recorded: ScrollProbeEntry[] = [];
      const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');

      if (!originalDescriptor || typeof originalDescriptor.value !== 'function') {
        return;
      }

      const original = originalDescriptor.value as (...args: unknown[]) => void;

      Object.defineProperty(window, '__sidebarScrollProbe', {
        value: recorded,
        configurable: true,
        writable: false,
      });

      Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
        configurable: true,
        writable: true,
        value: function patchedScrollTo(this: HTMLElement, ...args: unknown[]): void {
          if (this.classList.contains('sidebar-content')) {
            const first = args[0];
            let top: number | null = null;
            let behavior: string | null = null;

            if (typeof first === 'object' && first !== null) {
              const maybeTop = Reflect.get(first, 'top');
              const maybeBehavior = Reflect.get(first, 'behavior');

              top = typeof maybeTop === 'number' ? maybeTop : null;
              behavior = typeof maybeBehavior === 'string' ? maybeBehavior : null;
            }

            recorded.push({ top, behavior });
          }

          original.apply(this, args);
        },
      });
    });

    await page.getByRole('link', { name: 'Sidebar Scroll Target' }).click();

    await expect(page).toHaveURL(targetPath);
    await expect(page.locator('#main-content h1').first()).toHaveText('Sidebar Scroll Target');

    const afterNavigation = await page.locator('layout-sidebar').evaluate<
      SidebarSnapshot,
      {
        groupId: string;
        noteId: string;
      }
    >(
      (host, ids) => {
        const layoutSidebar = host as HTMLElement;
        const uiSidebar = layoutSidebar.shadowRoot?.querySelector('ui-sidebar');
        const fileTree = uiSidebar?.shadowRoot?.querySelector('ui-file-tree');
        const shell = uiSidebar?.shadowRoot?.querySelector('ui-sidebar-shell');
        const content = shell?.shadowRoot?.querySelector<HTMLElement>('.sidebar-content');
        const targetGroup = fileTree?.shadowRoot?.querySelector<HTMLElement>(
          `ui-tree-item[data-id="${ids.groupId}"]`,
        );
        const targetLeaf = fileTree?.shadowRoot?.querySelector<HTMLElement>(
          `ui-tree-item[data-id="${ids.noteId}"]`,
        );

        if (!content || !targetLeaf) {
          return {
            scrollTop: -1,
            groupExpanded: targetGroup?.getAttribute('aria-expanded') ?? null,
            targetVisible: false,
            targetSelected: false,
          };
        }

        const contentRect = content.getBoundingClientRect();
        const targetRect = targetLeaf.getBoundingClientRect();

        return {
          scrollTop: content.scrollTop,
          groupExpanded: targetGroup?.getAttribute('aria-expanded') ?? null,
          targetVisible:
            targetRect.top >= contentRect.top && targetRect.bottom <= contentRect.bottom,
          targetSelected: targetLeaf.getAttribute('aria-selected') === 'true',
        };
      },
      { groupId: targetGroupId, noteId: targetNoteId },
    );

    expect(afterNavigation.scrollTop).toBeGreaterThan(0);
    expect(afterNavigation.groupExpanded).toBe('true');
    expect(afterNavigation.targetVisible).toBe(true);
    expect(afterNavigation.targetSelected).toBe(true);

    const targetScrollCalls = await page.evaluate(() => {
      const probe =
        (
          window as typeof window & {
            __sidebarScrollProbe?: ScrollProbeEntry[];
          }
        ).__sidebarScrollProbe ?? [];

      return probe;
    });

    expect(targetScrollCalls).toHaveLength(1);
    expect(targetScrollCalls[0]?.top).not.toBeNull();
    expect(targetScrollCalls[0]?.behavior).toBe('instant');
  });
});