import { spawnSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Read-only checks. An explicit project prevents using a global CLI default by mistake.
const args = process.argv.slice(2);
const project = args[0] === '--project' && args.length === 2 ? args[1] : '';
if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project) || project.startsWith('demo-'))
  throw new Error('Uso: npm run firebase:verify -- --project ID_REAL_EXPLICITO');
const root = fileURLToPath(new URL('../', import.meta.url));
function firebase(command) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'),
      ...command,
      '--project',
      project,
      '--non-interactive',
      '--json',
    ],
    { cwd: root, encoding: 'utf8', timeout: 90_000, maxBuffer: 5 * 1024 * 1024 },
  );
  if (result.error) throw new Error(`Firebase ${command[0]}: ${result.error.message}`);
  let response;
  try {
    response = JSON.parse(result.stdout);
  } catch {
    throw new Error(`Firebase ${command[0]} no devolvió JSON válido.`);
  }
  if (result.status !== 0 || response.status !== 'success')
    throw new Error(`Firebase ${command[0]}: ${response.error ?? 'consulta fallida'}`);
  return response.result;
}
const database = firebase(['firestore:databases:get', '(default)']);
const deployed = firebase(['firestore:indexes']);
const expected = JSON.parse(await readFile(path.join(root, 'firestore.indexes.json'), 'utf8'));
const signature = (index) =>
  JSON.stringify([
    index.collectionGroup,
    index.queryScope,
    index.fields
      .filter((field) => field.fieldPath !== '__name__')
      .map((field) => [field.fieldPath, field.order ?? field.arrayConfig ?? field.vectorConfig]),
  ]);
const missingIndexes = expected.indexes
  .filter((index) => !deployed.indexes.some((remote) => signature(index) === signature(remote)))
  .map((index) => index.collectionGroup + ':' + index.fields.map((f) => f.fieldPath).join(','));
const probes = {};
for (const [name, document] of Object.entries({
  privateFavorites: 'users/deployment-probe/favorites/3274080005003',
  privatePrices: 'priceObservations/deployment-probe',
  privateAccountState: '_accountState/deployment-probe',
  publicProduct: 'products/3274080005003',
})) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${document}`,
    { signal: AbortSignal.timeout(20_000) },
  );
  probes[name] = response.status;
  await response.body?.cancel();
}
const ttlEnabled = deployed.fieldOverrides.some(
  (field) =>
    field.collectionGroup === '_accountState' && field.fieldPath === 'expiresAt' && field.ttl,
);
const report = {
  checkedAt: new Date().toISOString(),
  project,
  scope: 'Firestore foundation; does not certify Functions, App Check or a complete account flow',
  region: database.locationId,
  deletionProtection: database.deleteProtectionState,
  missingIndexes,
  ttlEnabled,
  anonymousReadStatus: probes,
  passed:
    database.locationId === 'europe-west1' &&
    database.deleteProtectionState === 'DELETE_PROTECTION_ENABLED' &&
    missingIndexes.length === 0 &&
    ['privateFavorites', 'privatePrices', 'privateAccountState'].every(
      (key) => probes[key] === 403,
    ) &&
    [200, 404].includes(probes.publicProduct),
};
await mkdir(path.join(root, 'artifacts'), { recursive: true });
await writeFile(
  path.join(root, 'artifacts/firebase-foundation-report.json'),
  JSON.stringify(report, null, 2) + '\n',
);
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
if (!report.passed) process.exitCode = 1;
