import { spawn } from 'node:child_process';
export interface PrivateCommandOptions {
  environment: NodeJS.ProcessEnv;
  timeoutMs: number;
  maxOutputBytes: number;
}
export type PrivateCommand = (
  command: 'git' | 'gh',
  args: readonly string[],
  input?: Uint8Array,
  environment?: NodeJS.ProcessEnv,
) => Promise<Buffer>;
export const createPrivateCommand = (options: PrivateCommandOptions): PrivateCommand => {
  if (
    ![options.timeoutMs, options.maxOutputBytes].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    )
  )
    throw new Error('[transport] command resource limits required');
  return (command, args, input, environment) =>
    new Promise((resolve, reject) => {
      const child = spawn(command, [...args], {
        env: { ...options.environment, ...environment, GIT_TERMINAL_PROMPT: '0' },
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      const chunks: Buffer[] = [];
      let size = 0;
      let excessive = false;
      child.stdout.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > options.maxOutputBytes) {
          excessive = true;
          child.kill();
        } else chunks.push(chunk);
      });
      // private path、remote URL、credential helperの診断を公開logへ転送しない。
      child.stderr.resume();
      child.stdin.on('error', () => {
        child.kill();
      });
      child.once('error', () => {
        reject(new Error('[transport] command unavailable or timed out'));
      });
      child.once('close', (code) => {
        if (code === 0 && !excessive) resolve(Buffer.concat(chunks));
        else reject(new Error('[transport] command failed or output limit exceeded'));
      });
      child.stdin.end(input);
    });
};
