import { STATIC_FIRST_DELETION_TARGETS } from './static-first-deletion-targets.js';
import { STATIC_FIRST_MIGRATION_TARGETS } from './static-first-migration-targets.js';

export const STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS = [
  ...new Set([
    ...STATIC_FIRST_DELETION_TARGETS.map((target) => target.tag),
    ...STATIC_FIRST_MIGRATION_TARGETS.map((target) => target.tag),
  ]),
] as const;

const STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAG_SET = new Set<string>(
  STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS,
);

const normalizeStaticFirstRemovedOrReducedLegacyTag = (tag: string): string =>
  tag.trim().toLowerCase();

export const isStaticFirstRemovedOrReducedLegacyTag = (tag: string): boolean => {
  return STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAG_SET.has(
    normalizeStaticFirstRemovedOrReducedLegacyTag(tag),
  );
};
