import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
const policy = JSON.parse(await readFile('.security/audit-exceptions.json', 'utf8'));
const release = process.argv.includes('--release');
if (!process.env.npm_execpath)
  throw new Error('Ejecuta este control mediante npm run audit:security.');
let failed = false;
const reports = {};
for (const scope of ['app', 'functions']) {
  const args = [
    process.env.npm_execpath,
    ...(scope === 'functions' ? ['--prefix', 'functions'] : []),
    'audit',
    '--package-lock-only',
    '--json',
  ];
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(`No se ha podido leer la auditoría de ${scope}.`);
  }
  reports[scope] = report;
  if (report.error || !report.metadata) {
    failed = true;
    continue;
  }
  const advisories = new Map();
  for (const value of Object.values(report.vulnerabilities ?? {}))
    for (const via of value.via) if (typeof via === 'object') advisories.set(via.url, via);
  for (const advisory of advisories.values()) {
    const exception = policy.exceptions.find(
      (item) =>
        item.name === advisory.name &&
        item.url === advisory.url &&
        item.severity === advisory.severity,
    );
    if (release || !exception || Date.now() >= Date.parse(policy.reviewBy + 'T23:59:59Z'))
      failed = true;
  }
  process.stdout.write(`${scope}: ${JSON.stringify(report.metadata.vulnerabilities)}\n`);
}
await writeFile(
  'audit.json',
  JSON.stringify(
    { generatedAt: new Date().toISOString(), reviewBy: policy.reviewBy, reports },
    null,
    2,
  ),
);
if (failed) {
  process.stderr.write(
    'La auditoría requiere resolver o revisar avisos no aceptados. Consulta audit.json y docs/DEPENDENCIAS.md.\n',
  );
  process.exitCode = 1;
}
