import { describe, expect, it } from 'vitest';
import { PrimaryTabNavigationPolicy } from '../../src/components/app/navigation/primary-tab-navigation-policy.js';

describe('PrimaryTabNavigationPolicy', () => {
  const outlet = {} as HTMLElement;

  it('?tab= だけが変わる場合は state-only を返すこと', () => {
    const policy = new PrimaryTabNavigationPolicy();

    const result = policy.evaluate({
      currentUrl: '/notes/testing?tab=overview',
      requestedUrl: '/notes/testing?tab=details',
      normalizedUrl: '/notes/testing?tab=details',
      historyMode: 'push',
      outlet,
    });

    expect(result).to.deep.equal({
      kind: 'state-only',
      scrollToHash: true,
    });
  });

  it('pathname または他の query が変わる場合は full を返すこと', () => {
    const policy = new PrimaryTabNavigationPolicy();

    const result = policy.evaluate({
      currentUrl: '/notes/testing?tab=overview',
      requestedUrl: '/notes/testing?tag=router&tab=details',
      normalizedUrl: '/notes/testing?tag=router&tab=details',
      historyMode: 'push',
      outlet,
    });

    expect(result).to.deep.equal({ kind: 'full' });
  });

  it('/archives 配下では tab のみ変更でも full を返すこと', () => {
    const policy = new PrimaryTabNavigationPolicy();

    const result = policy.evaluate({
      currentUrl: '/archives/abcdef?tab=overview',
      requestedUrl: '/archives/abcdef?tab=details',
      normalizedUrl: '/archives/abcdef?tab=details',
      historyMode: 'push',
      outlet,
    });

    expect(result).to.deep.equal({ kind: 'full' });
  });

  it('/notes 以外では tab のみ変更でも full を返すこと', () => {
    const policy = new PrimaryTabNavigationPolicy();

    const result = policy.evaluate({
      currentUrl: '/search?tab=overview',
      requestedUrl: '/search?tab=details',
      normalizedUrl: '/search?tab=details',
      historyMode: 'push',
      outlet,
    });

    expect(result).to.deep.equal({ kind: 'full' });
  });
});
