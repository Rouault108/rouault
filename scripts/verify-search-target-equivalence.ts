import { readFile, writeFile } from 'node:fs/promises';
import { deepStrictEqual } from 'node:assert';
import { protocolObject } from '../shared/search/lexical-protocol.js';

const referencePath = process.argv[2];
if (!referencePath) throw new Error('Pass the frozen D1 Node report path');
const before = protocolObject(JSON.parse(await readFile(referencePath, 'utf8')));
const after = protocolObject(
  JSON.parse(await readFile('.generated/search-foundation/target-verification.json', 'utf8')),
);
deepStrictEqual(after['identity'], before['identity']);
const rows = after['results'],
  old = before['results'];
if (!Array.isArray(rows) || !Array.isArray(old) || rows.length !== 30 || old.length !== 30)
  throw new Error('Expected 30 queries');
for (const [index, value] of rows.entries()) {
  const row = protocolObject(value),
    original = protocolObject(old[index]);
  deepStrictEqual(row['id'], original['id']);
  deepStrictEqual(row['response'], original['response']);
  deepStrictEqual(row['traces'], original['traces']);
  const result = protocolObject(row['result']),
    expected = protocolObject(original['result']);
  for (const field of ['candidates', 'queryTokens', 'traceSha256'])
    deepStrictEqual(result[field], expected[field]);
}
deepStrictEqual(after['labels'], before['labels']);
const report = {
  status: 'pass',
  queries: 30,
  labels: 6,
  identity: after['identity'],
  referencePath,
  comparison:
    'exact public response, raw native trace, candidates, fusion, both passage IDs, snippet, tokens; resource/cache metrics excluded',
};
await writeFile(
  '.generated/search-foundation/target-equivalence.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report));
