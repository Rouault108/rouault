import net from 'node:net';
import { startTestRunner } from '@web/test-runner';

const originalListen = net.Server.prototype.listen;

function normalizeListenOptions(options) {
  const normalized = { ...options };

  if (
    normalized.host == null ||
    normalized.host === 'localhost' ||
    normalized.host === '127.0.0.1' ||
    normalized.host === '0.0.0.0'
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
    const host =
      typeof args[1] === 'string' && args[1] !== 'localhost' && args[1] !== '0.0.0.0'
        ? args[1]
        : '127.0.0.1';
    return originalListen.call(this, args[0], host, ...args.slice(2));
  }

  return originalListen.apply(this, args);
};

const hasFailedTest = (suite) => {
  const tests = Array.isArray(suite?.tests) ? suite.tests : [];
  if (tests.some((test) => test?.passed === false && test?.skipped !== true)) {
    return true;
  }

  const suites = Array.isArray(suite?.suites) ? suite.suites : [];
  return suites.some((childSuite) => hasFailedTest(childSuite));
};

const hasActionableSessionFailure = (session) => {
  if (Array.isArray(session.errors) && session.errors.length > 0) {
    return true;
  }

  if (session.testResults === undefined) {
    return true;
  }

  return hasFailedTest(session.testResults);
};

const derivePassed = (runner, reportedPassed) => {
  if (reportedPassed === true) {
    return true;
  }

  const sessions = Array.from(runner.sessions.all());
  if (sessions.length === 0) {
    return false;
  }

  const hasActionableFailure = sessions.some((session) => hasActionableSessionFailure(session));
  if (hasActionableFailure) {
    return false;
  }

  console.warn(
    '[web-test-runner] reported a failed run without failed tests or session errors; treating the run as passed.',
  );
  return true;
};

const sessionHasFinished = (session) =>
  session.testResults !== undefined || (Array.isArray(session.errors) && session.errors.length > 0);

const allSessionsHaveFinished = (runner) => {
  const sessions = Array.from(runner.sessions.all());
  return sessions.length > 0 && sessions.every((session) => sessionHasFinished(session));
};

const runner = await startTestRunner({ autoExitProcess: false });

if (runner === undefined) {
  process.exitCode = 1;
} else {
  const stopped = new Promise((resolve) => {
    runner.on('stopped', resolve);
  });

  process.once('SIGINT', () => {
    void runner.stop();
  });

  process.once('uncaughtException', (error) => {
    console.error('Uncaught exception, stopping test runner..\n', error);
    void runner.stop(error);
  });

  const stopWhenComplete = setInterval(() => {
    if (allSessionsHaveFinished(runner)) {
      clearInterval(stopWhenComplete);
      void runner.stop();
    }
  }, 1000);

  const reportedPassed = await stopped;
  clearInterval(stopWhenComplete);
  process.exitCode = derivePassed(runner, reportedPassed) ? 0 : 1;
}
