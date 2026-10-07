import { mkdir, rmdir } from 'node:fs/promises';
import path from 'node:path';
export class PublicationOperationQueue {
  private pending: Promise<void> = Promise.resolve();
  constructor(private readonly privateLockDirectory: string) {}
  async withLock<T>(_operationId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.pending;
    let release: (() => void) | undefined;
    this.pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    let acquired = false;
    try {
      await mkdir(path.dirname(this.privateLockDirectory), { recursive: true });
      // 失効を推測して他processのlockを削除しない。既存lockは実状態照合が必要。
      await mkdir(this.privateLockDirectory);
      acquired = true;
      return await work();
    } finally {
      if (acquired) await rmdir(this.privateLockDirectory);
      release?.();
    }
  }
}
