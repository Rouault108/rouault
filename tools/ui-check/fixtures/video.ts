import { HydrationScheduler } from '../../../src/client/hydration/scheduler.js';

// UI-checkでも初回起動はproduction registryとschedulerに委譲する。
const scheduler = new HydrationScheduler();
void scheduler.hydrateContent(document);
