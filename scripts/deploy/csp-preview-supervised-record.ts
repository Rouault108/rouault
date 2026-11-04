import { open, mkdir, lstat, readFile, realpath, type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { PREVIEW_UUID, previewTimestamp } from './csp-preview-transaction.js';
import { previewDigest } from '../../build/security/csp-preview-artifact.js';

export type SupervisedState =
  | 'prepared'
  | 'confirmed'
  | 'upload-started'
  | 'creation-started'
  | 'posted'
  | 'verified'
  | 'uncertain'
  | 'closed';
export interface SupervisedRecordValue {
  state: SupervisedState;
  deploymentId: string | null;
  before?: { observedAt: string; ids: string[]; digest: string };
}

// 記録は証跡であり再開permitではない。生存中のhandleとメモリー状態だけを一度使う。
export class SupervisedRecord {
  private bytes = Buffer.alloc(0);
  private sequence = 0;
  private head = '0'.repeat(64);
  private claimed = false;
  private closed = false;
  private constructor(
    private readonly file: string,
    private readonly handle: FileHandle,
    private readonly inode: { dev: number; ino: number },
    private readonly planDigest: string,
  ) {}
  static async create(file: string, planDigest: string): Promise<SupervisedRecord> {
    if (!/^[a-f0-9]{64}$/u.test(planDigest)) throw new Error('supervised-record-identity');
    const parent = path.dirname(file);
    await mkdir(parent, { recursive: true, mode: 0o700 });
    if ((await realpath(parent)) !== path.resolve(parent))
      throw new Error('supervised-record-path');
    const handle = await open(file, 'wx+', 0o600);
    const stat = await handle.stat();
    return new SupervisedRecord(file, handle, { dev: stat.dev, ino: stat.ino }, planDigest);
  }
  async assertCurrent(): Promise<void> {
    if (this.closed) throw new Error('supervised-session-closed');
    if ((await realpath(path.dirname(this.file))) !== path.resolve(path.dirname(this.file)))
      throw new Error('supervised-record-path');
    const stat = await lstat(this.file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1 ||
      (stat.mode & 0o077) !== 0 ||
      stat.dev !== this.inode.dev ||
      stat.ino !== this.inode.ino ||
      !(await readFile(this.file)).equals(this.bytes)
    )
      throw new Error('supervised-record-lost-or-restored');
  }
  async append(value: SupervisedRecordValue): Promise<void> {
    await this.assertCurrent();
    const row = {
      schema: 1,
      sequence: this.sequence + 1,
      previous: this.head,
      planDigest: this.planDigest,
      state: value.state,
      deploymentId: value.deploymentId,
      before: value.before ?? null,
    };
    const digest = previewDigest(JSON.stringify(row));
    const next = Buffer.concat([
      this.bytes,
      Buffer.from(JSON.stringify({ ...row, digest }) + '\n'),
    ]);
    if (next.length > 1024 * 1024) throw new Error('supervised-record-limit');
    await this.handle.writeFile(Buffer.from(JSON.stringify({ ...row, digest }) + '\n'));
    await this.handle.sync();
    this.bytes = next;
    this.sequence++;
    this.head = digest;
    await this.assertCurrent();
  }
  claim(): void {
    // awaitより前に消費する。並行呼出しも記録復元も消費済み状態を戻さない。
    if (this.claimed || this.closed) throw new Error('supervised-permit-consumed');
    this.claimed = true;
  }
  async close(): Promise<void> {
    if (!this.closed) {
      this.closed = true;
      await this.handle.close();
    }
  }
}

// 読み戻した記録からpublish機能は返さない。欠損・復元・破損時も新規作成しない。
export const inspectSupervisedRecord = async (file: string, planDigest: string) => {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024)
    throw new Error('supervised-record-unavailable');
  const text = await readFile(file, 'utf8');
  if (!text.endsWith('\n')) throw new Error('supervised-record-incomplete');
  let previous = '0'.repeat(64),
    sequence = 0;
  const events = text
    .trimEnd()
    .split('\n')
    .map((line) => {
      const raw: unknown = JSON.parse(line);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw new Error('supervised-record-schema');
      const { digest, ...row } = raw as Record<string, unknown>;
      if (
        Object.keys(row).sort().join(',') !==
          'before,deploymentId,planDigest,previous,schema,sequence,state' ||
        row['schema'] !== 1 ||
        row['sequence'] !== ++sequence ||
        row['previous'] !== previous ||
        row['planDigest'] !== planDigest ||
        previewDigest(JSON.stringify(row)) !== digest ||
        ![
          'prepared',
          'confirmed',
          'upload-started',
          'creation-started',
          'posted',
          'verified',
          'uncertain',
          'closed',
        ].includes(String(row['state'])) ||
        !(
          row['deploymentId'] === null ||
          (typeof row['deploymentId'] === 'string' && PREVIEW_UUID.test(row['deploymentId']))
        )
      )
        throw new Error('supervised-record-corrupt');
      if (sequence === 1) {
        const before = row['before'];
        if (!before || typeof before !== 'object' || Array.isArray(before))
          throw new Error('supervised-before-missing');
        const b = before as Record<string, unknown>;
        if (
          row['state'] !== 'prepared' ||
          Object.keys(b).sort().join(',') !== 'digest,ids,observedAt' ||
          typeof b['observedAt'] !== 'string' ||
          previewTimestamp(b['observedAt']) !== b['observedAt'] ||
          !Array.isArray(b['ids']) ||
          b['ids'].length > 10000 ||
          new Set(b['ids']).size !== b['ids'].length ||
          b['ids'].some((id: unknown) => typeof id !== 'string' || !PREVIEW_UUID.test(id)) ||
          previewDigest(JSON.stringify({ observedAt: b['observedAt'], ids: b['ids'] })) !==
            b['digest']
        )
          throw new Error('supervised-before-corrupt');
      } else if (row['before'] !== null) throw new Error('supervised-before-replaced');
      previous = digest;
      return {
        state: String(row['state']),
        deploymentId: row['deploymentId'],
        before: row['before'],
      };
    });
  return { planDigest, events, publicationAllowed: false as const, resumeAllowed: false as const };
};
