import {
  CSP_BROWSER_VERSIONS,
  CSP_CONTAINER_DIGEST,
  CSP_OBSERVATION_CASES,
  CSP_OBSERVER_VERSION,
  type ObservationReport,
} from '../../../scripts/ci/csp-worker-acceptance.js';
export const observationFixture = (
  engine: ObservationReport['engine'] = 'webkit-csp',
): ObservationReport => ({
  schema: 1,
  kind: 'worker-ro-observation',
  engine,
  browserVersion: CSP_BROWSER_VERSIONS[engine],
  playwrightVersion: '1.63.0',
  observerVersion: CSP_OBSERVER_VERSION,
  locale: 'en-US',
  nodeVersion: '24.14.1',
  pnpmVersion: '11.28.9',
  containerDigest: CSP_CONTAINER_DIGEST,
  sha: 'local',
  run: 'local',
  rows: CSP_OBSERVATION_CASES.map((scenario) => {
    const connect = [
      'ro-connect',
      'ro-both',
      'ro-both-delayed',
      'enforce-connect',
      'enforce-both',
    ].includes(scenario);
    const wasm = ['ro-wasm', 'ro-both', 'ro-both-delayed', 'enforce-wasm', 'enforce-both'].includes(
      scenario,
    );
    const disposition = scenario.startsWith('enforce') ? 'enforce' : 'report';
    return {
      scenario,
      ready: true,
      listenerReady: true,
      consoleAttached: true,
      httpVerified: true,
      fixtureVerified: true,
      lifetimeValid: true,
      operationStarted: scenario !== 'ro-no-operation',
      eventWindowMs: scenario === 'ro-both-delayed' ? 1000 : 250,
      blob:
        scenario === 'ro-no-operation'
          ? 'not-run'
          : scenario === 'aborted-fetch' ||
              scenario === 'enforce-connect' ||
              scenario === 'enforce-both'
            ? 'TypeError'
            : 'allowed',
      wasm:
        scenario === 'ro-no-operation'
          ? 'not-run'
          : scenario === 'invalid-wasm' ||
              scenario === 'enforce-wasm' ||
              scenario === 'enforce-both'
            ? 'CompileError'
            : 'allowed',
      events:
        engine === 'webkit-csp'
          ? []
          : [
              ...(connect ? [{ directive: 'connect-src', blocked: 'blob:', disposition }] : []),
              ...(wasm ? [{ directive: 'script-src', blocked: 'wasm-eval', disposition }] : []),
            ],
      console: [
        { category: 'canary', owner: 'worker' },
        ...(connect && engine === 'webkit-csp'
          ? [
              {
                category:
                  disposition === 'report'
                    ? ('connect-report' as const)
                    : ('connect-enforce' as const),
                owner: 'unknown' as const,
              },
            ]
          : []),
        ...(scenario === 'spoof' || scenario === 'foreign-spoof'
          ? [
              {
                category: 'connect-report' as const,
                owner: scenario === 'spoof' ? ('worker' as const) : ('document' as const),
              },
            ]
          : []),
      ],
    };
  }),
});
