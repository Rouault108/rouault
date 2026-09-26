export interface LexicalPerformanceEvent {
  phase: string;
  milliseconds: number;
  counters?: Readonly<Record<string, number>>;
}
let observer: ((event: LexicalPerformanceEvent) => void) | undefined;

/** 隔離diagnostic Workerだけが設定する。検索の入力・結果・cache policyは所有しない。 */
export function observeLexicalPerformance(next: typeof observer): void {
  observer = next;
}
export function beginLexicalPhase(): number {
  return observer ? performance.now() : 0;
}
export function endLexicalPhase(
  phase: string,
  start: number,
  counters?: Readonly<Record<string, number>>,
): void {
  if (observer)
    observer({ phase, milliseconds: performance.now() - start, ...(counters ? { counters } : {}) });
}
