import net from 'node:net';
import { startTestRunner } from '@web/test-runner';

const originalListen = net.Server.prototype.listen;

function normalizeListenOptions(options) {
  const normalized = { ...options };

  if (
    normalized.host == null ||
    normalized.host === 'localhost' ||
    normalized.host === '127.0.0.1'
  ) {
    // sandbox とローカル実行の両方で確実に loopback に bind する。
    normalized.host = '127.0.0.1';
  }

  return normalized;
}

net.Server.prototype.listen = function patchedListen(...args) {
  if (args[0] != null && typeof args[0] === 'object') {
    return originalListen.call(this, normalizeListenOptions(args[0]), ...args.slice(1));
  }

  if (typeof args[0] === 'number') {
    const host = typeof args[1] === 'string' && args[1] !== 'localhost' ? args[1] : '127.0.0.1';
    return originalListen.call(this, args[0], host, ...args.slice(2));
  }

  return originalListen.apply(this, args);
};

await startTestRunner();
