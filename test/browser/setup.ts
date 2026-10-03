import { fixtureCleanup } from './harness/browser-fixture.js';
import { afterEach } from 'vitest';

afterEach(() => {
  fixtureCleanup();
});
