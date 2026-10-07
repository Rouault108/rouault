declare module 'js-yaml' {
  export const JSON_SCHEMA: unknown;
  export function load(source: string, options?: { schema?: unknown; json?: boolean }): unknown;
  export function dump(
    value: unknown,
    options?: { noRefs?: boolean; sortKeys?: boolean; lineWidth?: number },
  ): string;
}
