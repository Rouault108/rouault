export interface StaticFirstUnknownUiAllowlistEntry {
  readonly tag: string;
  readonly owner: string;
  readonly reason: string;
  readonly expiresAfter?: string;
}

export const STATIC_FIRST_UNKNOWN_UI_ALLOWLIST =
  [] as const satisfies readonly StaticFirstUnknownUiAllowlistEntry[];
