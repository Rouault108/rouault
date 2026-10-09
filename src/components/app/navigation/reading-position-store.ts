export interface ReadingPosition {
  readonly version: 1;
  readonly url: string;
  readonly x: number;
  readonly y: number;
}
export const validateReadingPosition = (value: unknown, url: string): ReadingPosition | null => {
  if (value === null || typeof value !== 'object') return null;
  if (
    !('version' in value) ||
    value.version !== 1 ||
    !('url' in value) ||
    value.url !== url ||
    !('x' in value) ||
    typeof value.x !== 'number' ||
    !Number.isFinite(value.x) ||
    value.x < 0 ||
    !('y' in value) ||
    typeof value.y !== 'number' ||
    !Number.isFinite(value.y) ||
    value.y < 0
  )
    return null;
  return { version: 1, url, x: value.x, y: value.y };
};
export const clampReadingPosition = (
  position: ReadingPosition,
  maxX: number,
  maxY: number,
): ReadingPosition => ({
  ...position,
  x: Math.min(position.x, Math.max(0, maxX)),
  y: Math.min(position.y, Math.max(0, maxY)),
});
export class ReadingPositionStore {
  private readonly records = new Map<string, ReadingPosition>();
  read(entryId: string | null, url: string): ReadingPosition | null {
    return entryId === null ? null : validateReadingPosition(this.records.get(entryId), url);
  }
  write(entryId: string | null, record: ReadingPosition): void {
    if (entryId !== null && validateReadingPosition(record, record.url))
      this.records.set(entryId, { ...record });
  }
  rebind(entryId: string | null, previousUrl: string, url: string): void {
    const record = this.read(entryId, previousUrl);
    if (record) this.write(entryId, { ...record, url });
  }
}
