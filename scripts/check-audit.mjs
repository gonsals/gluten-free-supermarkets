import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { evaluateAuditResult, validatePolicy } from './audit-policy.mjs';
const policy = JSON.parse(await readFile('.security/audit-exceptions.json', 'utf8'));
validatePolicy(policy);
const release = process.argv.includes('--release');
if (!process.env.npm_execpath)
  throw new Error('Ejecuta este control mediante npm run audit:security.');
let failed = false;
const reports = {};
const errors = {};
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
    timeout: 120_000,
  });
  const { report, errors: issues } = evaluateAuditResult(result, { policy, scope, release });
  reports[scope] = report;
  errors[scope] = issues;
  if (issues.length) {
    failed = true;
    for (const issue of issues) process.stderr.write(`${scope}: ${issue}\n`);
  }
  if (report?.metadata?.vulnerabilities)
    process.stdout.write(`${scope}: ${JSON.stringify(report.metadata.vulnerabilities)}\n`);
}
await writeFile(
  'audit.json',
  JSON.stringify(
    { generatedAt: new Date().toISOString(), reviewBy: policy.reviewBy, release, errors, reports },
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
