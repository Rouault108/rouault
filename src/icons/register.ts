import 'iconify-icon';
import { addCollection } from 'iconify-icon';
import { LUCIDE_SUBSET } from '../generated/lucide-subset.js';

const globalRegistry = globalThis as typeof globalThis & {
  __rouaultLucideSubsetRegistered__?: boolean;
};

if (globalRegistry.__rouaultLucideSubsetRegistered__ !== true) {
  addCollection(LUCIDE_SUBSET);
  globalRegistry.__rouaultLucideSubsetRegistered__ = true;
}