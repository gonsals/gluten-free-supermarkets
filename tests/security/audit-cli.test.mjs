import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const runner = resolve('scripts/check-audit.mjs');
const advisory = {
  name: 'example',
  url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc',
  severity: 'high',
};
const clean = {
  auditReportVersion: 2,
  vulnerabilities: {},
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } },
};
const affected = {
  auditReportVersion: 2,
  vulnerabilities: { example: { severity: 'high', via: [advisory] } },
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0, total: 1 } },
};

async function runFixture({
  app = clean,
  functions = clean,
  args = [],
  reviewBy = '2100-01-01',
} = {}) {
  const folder = await mkdtemp(join(tmpdir(), 'singluten-audit-test-'));
  try {
    await mkdir(join(folder, '.security'));
    await writeFile(
      join(folder, '.security/audit-exceptions.json'),
      JSON.stringify({
        reviewBy,
        exceptions: [{ ...advisory, scope: 'app', reason: 'Prueba aislada.' }],
      }),
    );
    const fakeNpm = join(folder, 'npm-fixture.cjs');
    await writeFile(
      fakeNpm,
      `const report = process.argv.includes('--prefix') ? ${JSON.stringify(functions)} : ${JSON.stringify(app)};
process.stdout.write(typeof report === 'string' ? report : JSON.stringify(report));
process.exitCode = report.metadata?.vulnerabilities?.total ? 1 : 0;`,
    );
    const result = spawnSync(process.execPath, [runner, ...args], {
      cwd: folder,
      env: { ...process.env, npm_execpath: fakeNpm },
      encoding: 'utf8',
      timeout: 10_000,
    });
    assert.equal(result.error, undefined);
    let saved;
    try {
      saved = JSON.parse(await readFile(join(folder, 'audit.json'), 'utf8'));
    } catch {
      /* Invalid policy fails before npm. */
    }
    return { ...result, saved };
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}

test('CLI completo: consulta ambos ámbitos y guarda el informe limpio', async () => {
  const result = await runFixture();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.saved.errors, { app: [], functions: [] });
  assert.deepEqual(result.saved.reports.functions, clean);
});
test('CLI completo: aviso permitido en desarrollo queda bloqueado en release', async () => {
  assert.equal((await runFixture({ app: affected })).status, 0);
  const result = await runFixture({ app: affected, args: ['--release'] });
  assert.equal(result.status, 1);
  assert.equal(result.saved.release, true);
  assert.ok(result.saved.errors.app.length);
});
test('CLI completo: excepción de app no se reutiliza en servidor', async () => {
  const result = await runFixture({ functions: affected });
  assert.equal(result.status, 1);
  assert.ok(result.saved.errors.functions.length);
});
test('CLI completo: JSON roto no evita auditar el segundo ámbito ni guardar el error', async () => {
  const result = await runFixture({ app: '{truncated' });
  assert.equal(result.status, 1);
  assert.equal(result.saved.reports.app, null);
  assert.deepEqual(result.saved.reports.functions, clean);
  assert.ok(result.saved.errors.app.length);
});
test('CLI completo: fecha inválida y fecha vencida fallan', async () => {
  assert.equal((await runFixture({ reviewBy: 'invalid' })).status, 1);
  const result = await runFixture({ reviewBy: '2000-01-01' });
  assert.equal(result.status, 1);
  assert.ok(result.saved.errors.app.length);
});
