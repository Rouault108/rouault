export const CODE_GROUP_SYNC_SCOPE_MAX_LENGTH = 64;

export const CODE_GROUP_SYNC_SCOPE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

export const isValidCodeGroupSyncScope = (value: string): boolean =>
  value.length <= CODE_GROUP_SYNC_SCOPE_MAX_LENGTH && CODE_GROUP_SYNC_SCOPE_PATTERN.test(value);
