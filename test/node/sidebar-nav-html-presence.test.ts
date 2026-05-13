import { describe, expect, it } from 'vitest';

import {
  SidebarNavHtmlPresenceError,
  assertRuntimeSidebarNavHtmlPresence,
} from '../../shared/navigation/sidebar-nav-html-presence.js';

const expectPresenceError = (value: unknown, reason: SidebarNavHtmlPresenceError['reason']): void => {
  try {
    assertRuntimeSidebarNavHtmlPresence({
      sidebarPresent: true,
      navHtml: value,
      sourceLabel: 'presence-test',
    });
    throw new Error('expected SidebarNavHtmlPresenceError');
  } catch (error) {
    expect(error).toBeInstanceOf(SidebarNavHtmlPresenceError);
    expect((error as SidebarNavHtmlPresenceError).reason).toBe(reason);
    expect((error as SidebarNavHtmlPresenceError).sourceLabel).toBe('presence-test');
  }
};

describe('sidebar nav html presence contract', () => {
  it('absent sidebar では navHtml を null に正規化すること', () => {
    expect(
      assertRuntimeSidebarNavHtmlPresence({
        sidebarPresent: false,
        navHtml: undefined,
        sourceLabel: 'presence-test',
      }),
    ).toBeNull();
  });

  it('present sidebar の raw navHtml 欠落理由を区別すること', () => {
    expectPresenceError(undefined, 'missing');
    expectPresenceError(null, 'null');
    expectPresenceError(1, 'invalid-type');
    expectPresenceError('   ', 'empty');
  });

  it('present sidebar は nav[data-sidebar-nav] をちょうど 1 個だけ要求すること', () => {
    expectPresenceError('<div></div>', 'missing-nav');
    expectPresenceError('<nav data-sidebar-nav></nav><nav data-sidebar-nav></nav>', 'multiple-nav');

    expect(
      assertRuntimeSidebarNavHtmlPresence({
        sidebarPresent: true,
        navHtml: '<nav data-sidebar-nav><ul><li></li></ul></nav>',
        sourceLabel: 'presence-test',
      }),
    ).toBe('<nav data-sidebar-nav><ul><li></li></ul></nav>');
  });
});
