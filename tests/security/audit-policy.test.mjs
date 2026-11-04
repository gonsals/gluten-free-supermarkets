import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAuditResult, validatePolicy } from '../../scripts/audit-policy.mjs';

const advisory = {
  name: 'example',
  url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc',
  severity: 'high',
};
const policy = {
  reviewBy: '2026-11-22',
  exceptions: [{ ...advisory, scope: 'app', reason: 'Revisión temporal de prueba.' }],
};
const now = Date.parse('2026-10-25T12:00:00Z');
const clean = () => ({
  auditReportVersion: 2,
  vulnerabilities: {},
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } },
});
function affected() {
  const report = clean();
  report.vulnerabilities.example = { severity: 'high', via: [{ ...advisory }] };
  report.metadata.vulnerabilities.high = report.metadata.vulnerabilities.total = 1;
  return report;
}
function evaluate(report, options = {}, processResult = {}) {
  return evaluateAuditResult(
    {
      status: report.metadata?.vulnerabilities?.total ? 1 : 0,
      stdout: JSON.stringify(report),
      ...processResult,
    },
    { policy, scope: 'app', now, ...options },
  ).errors;
}

test('informe limpio y publicación sin avisos pasan', () => {
  assert.deepEqual(evaluate(clean()), []);
  assert.deepEqual(evaluate(clean(), { release: true }), []);
});
test('excepción exacta permite desarrollo, pero bloquea publicación', () => {
  assert.deepEqual(evaluate(affected()), []);
  assert.ok(evaluate(affected(), { release: true }).length);
});
test('una excepción de app no permite vulnerabilidades en functions', () => {
  assert.ok(evaluate(affected(), { scope: 'functions' }).length);
});
for (const [field, value] of [
  ['name', 'another'],
  ['url', 'https://github.com/advisories/GHSA-dddd-eeee-ffff'],
  ['severity', 'critical'],
]) {
  test(`un aviso con ${field} diferente bloquea`, () => {
    const report = affected();
    report.vulnerabilities.example.via[0][field] = value;
    assert.ok(evaluate(report).length);
  });
}
test('conserva avisos de distinta gravedad aunque compartan URL', () => {
  const report = affected();
  report.vulnerabilities.example.via.unshift({ ...advisory, severity: 'critical' });
  assert.ok(evaluate(report).some((error) => error.includes('sin excepción')));
});
test('fecha válida incluye todo el día UTC y vence al empezar el siguiente', () => {
  assert.deepEqual(evaluate(affected(), { now: Date.parse('2026-11-22T23:59:59.999Z') }), []);
  assert.ok(evaluate(affected(), { now: Date.parse('2026-11-23T00:00:00Z') }).length);
});
for (const date of ['invalid', '2026-02-30', '2026-13-01', '2026-2-01', null]) {
  test(`fecha inválida ${String(date)} no permite saltar la caducidad`, () => {
    assert.throws(() => validatePolicy({ ...policy, reviewBy: date }));
  });
}
test('rechaza excepciones incompletas y duplicadas', () => {
  for (const field of ['scope', 'name', 'url', 'severity', 'reason']) {
    const item = { ...policy.exceptions[0] };
    delete item[field];
    assert.throws(() => validatePolicy({ ...policy, exceptions: [item] }));
  }
  assert.throws(() =>
    validatePolicy({ ...policy, exceptions: [...policy.exceptions, ...policy.exceptions] }),
  );
});
for (const processResult of [
  { status: 2 },
  { status: null, signal: 'SIGTERM' },
  { status: 0, error: new Error('timeout') },
  { status: 1 },
]) {
  test(`fallo del proceso ${JSON.stringify(processResult)} bloquea incluso con JSON limpio`, () => {
    assert.ok(evaluate(clean(), {}, processResult).length);
  });
}
test('JSON truncado se rechaza', () => {
  assert.ok(
    evaluateAuditResult({ status: 0, stdout: '{' }, { policy, scope: 'app', now }).errors.length,
  );
});
for (const report of [
  null,
  {},
  { ...clean(), error: { code: 'EAI_AGAIN' } },
  { ...clean(), auditReportVersion: 1 },
  { ...clean(), vulnerabilities: null },
]) {
  test(`informe incompleto ${JSON.stringify(report)} bloquea`, () => {
    assert.ok(
      evaluateAuditResult(
        { status: 0, stdout: JSON.stringify(report) },
        { policy, scope: 'app', now },
      ).errors.length,
    );
  });
}
test('no acepta un recuento de cero que oculte vulnerabilidades', () => {
  const report = affected();
  report.metadata = clean().metadata;
  assert.ok(evaluate(report).length);
});
test('no acepta totales sin los avisos correspondientes ni gravedad incoherente', () => {
  const report = affected();
  delete report.vulnerabilities.example;
  assert.ok(evaluate(report).length);
  report.vulnerabilities.example = { severity: 'moderate', via: [advisory] };
  assert.ok(evaluate(report).length);
});
test('rechaza recuentos malformados', () => {
  for (const value of [-1, '0', null, 0.5]) {
    const report = clean();
    report.metadata.vulnerabilities.low = value;
    assert.ok(evaluate(report).length);
  }
});
test('comprueba los avisos originales de las dependencias propagadas', () => {
  const report = affected();
  report.vulnerabilities.consumer = { severity: 'high', via: ['example'] };
  report.metadata.vulnerabilities.high = report.metadata.vulnerabilities.total = 2;
  assert.deepEqual(evaluate(report), []);
  report.vulnerabilities.consumer.via = ['missing'];
  assert.ok(evaluate(report).length);
});
test('cadenas vacías, malformadas o cíclicas bloquean', () => {
  for (const via of [[], null, ['example'], [null], [{}]]) {
    const report = affected();
    report.vulnerabilities.example.via = via;
    assert.ok(evaluate(report).length);
  }
});
