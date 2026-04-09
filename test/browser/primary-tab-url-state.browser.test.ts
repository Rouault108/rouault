import { expect } from '@open-wc/testing';
import {
  clearTabsUrlSyncStrategy,
  getTabsUrlSyncStrategy,
  registerTabsUrlSyncStrategy,
} from '../../src/components/ui/tabs/tabs-url-sync-strategy.js';
import {
  PRIMARY_TAB_URL_STATE_CHANGE_EVENT,
  dispatchPrimaryTabUrlStateChange,
  isPrimaryTabOnlyNavigation,
  isPrimaryTabStateOnlyScope,
  primaryTabTabsUrlSyncStrategy,
  readDecodedHash,
  readPrimaryTabValue,
  writePrimaryTabValue,
} from '../../src/components/app/navigation/primary-tab-url-state.js';

describe('primary-tab-url-state', () => {
  afterEach(() => {
    clearTabsUrlSyncStrategy();
  });

  it('?tab= の read/write を行えること', () => {
    expect(readPrimaryTabValue('/notes/testing?tab=overview')).to.equal('overview');
    expect(writePrimaryTabValue('/notes/testing?tab=overview#details', 'summary')).to.equal(
      '/notes/testing?tab=summary#details',
    );
    expect(writePrimaryTabValue('/notes/testing?tab=overview', null)).to.equal('/notes/testing');
  });

  it('primary tab のみが変わる場合だけ state-only 判定になること', () => {
    expect(
      isPrimaryTabOnlyNavigation('/notes/testing?tab=overview', '/notes/testing?tab=details'),
    ).to.equal(true);
    expect(
      isPrimaryTabOnlyNavigation(
        '/notes/testing?tag=lit&tab=overview',
        '/notes/testing?tag=lit&tab=details',
      ),
    ).to.equal(true);
    expect(
      isPrimaryTabOnlyNavigation(
        '/notes/testing?tag=lit&tab=overview',
        '/notes/testing?tag=router&tab=details',
      ),
    ).to.equal(false);
    expect(
      isPrimaryTabOnlyNavigation(
        '/notes/testing?tab=overview&tab=details',
        '/notes/testing?tab=details',
      ),
    ).to.equal(false);
    expect(isPrimaryTabStateOnlyScope('/notes/testing?tab=overview')).to.equal(true);
    expect(isPrimaryTabStateOnlyScope('/archives/abc123?tab=overview')).to.equal(false);
    expect(isPrimaryTabStateOnlyScope('/search?tab=overview')).to.equal(false);
  });

  it('hash を decode し URL state change event を dispatch すること', async () => {
    let detail:
      | {
          previousUrl: string;
          url: string;
        }
      | undefined;

    const eventPromise = new Promise<void>((resolve) => {
      const listener = (event: Event) => {
        const customEvent = event as CustomEvent<{ previousUrl: string; url: string }>;
        detail = customEvent.detail;
        window.removeEventListener(PRIMARY_TAB_URL_STATE_CHANGE_EVENT, listener);
        resolve();
      };
      window.addEventListener(PRIMARY_TAB_URL_STATE_CHANGE_EVENT, listener);
    });

    dispatchPrimaryTabUrlStateChange('/notes/testing?tab=overview', '/notes/testing?tab=details');
    await eventPromise;

    expect(detail).to.deep.equal({
      previousUrl: '/notes/testing?tab=overview',
      url: '/notes/testing?tab=details',
    });
    expect(readDecodedHash('/notes/testing#details%20section')).to.equal('details section');
  });

  it('tabs strategy registry に primary tab 実装を登録できること', () => {
    registerTabsUrlSyncStrategy(primaryTabTabsUrlSyncStrategy);

    const strategy = getTabsUrlSyncStrategy();

    expect(strategy?.changeEventName).to.equal(PRIMARY_TAB_URL_STATE_CHANGE_EVENT);
    expect(strategy?.readValue('/notes/testing?tab=overview')).to.equal('overview');
    expect(strategy?.writeValue('/notes/testing?tab=overview', 'details')).to.equal(
      '/notes/testing?tab=details',
    );
    expect(strategy?.readHash('/notes/testing#details%20section')).to.equal('details section');
  });
});
