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
  it('SidebarNavHtmlPresenceError constructor は object API で reason/sourceLabel を保持すること', () => {
    const error = new SidebarNavHtmlPresenceError({
      sourceLabel: 'presence-test',
      reason: 'missing',
    });

    expect(error.reason).toBe('missing');
    expect(error.sourceLabel).toBe('presence-test');
  });

  it('absent sidebar では navHtml を検証せず no-op とすること', () => {
    expect(
      assertRuntimeSidebarNavHtmlPresence({
        sidebarPresent: false,
        navHtml: undefined,
        sourceLabel: 'presence-test',
      }),
    ).toBeUndefined();
  });

  it('SidebarNavHtmlPresenceError は canonical message を持つこと', () => {
    const error = new SidebarNavHtmlPresenceError({ sourceLabel: 'presence-test', reason: 'empty' });

    expect(error.message).toBe('[sidebar-nav-html-presence] presence-test: empty');
  });

  it('present sidebar の raw navHtml 欠落理由を区別すること', () => {
    expectPresenceError(undefined, 'missing');
    expectPresenceError(null, 'missing');
    expectPresenceError(1, 'invalid-type');
    expectPresenceError('   ', 'empty');
  });

  it('present sidebar の raw navHtml が string かつ trim 後非空なら構造検証せず許可すること', () => {
    expect(
      assertRuntimeSidebarNavHtmlPresence({
        sidebarPresent: true,
        navHtml: '<div></div>',
        sourceLabel: 'presence-test',
      }),
    ).toBeUndefined();
  });
});
