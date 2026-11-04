const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validatePolicy(policy) {
  if (!isObject(policy) || !/^\d{4}-\d{2}-\d{2}$/.test(policy.reviewBy ?? ''))
    throw new Error('La política necesita una fecha reviewBy válida (AAAA-MM-DD).');
  const day = Date.parse(`${policy.reviewBy}T00:00:00.000Z`);
  if (!Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== policy.reviewBy)
    throw new Error('La fecha reviewBy no existe.');
  if (!Array.isArray(policy.exceptions)) throw new Error('Falta la lista de excepciones.');
  const keys = new Set();
  for (const item of policy.exceptions) {
    if (
      !isObject(item) ||
      !['app', 'functions'].includes(item.scope) ||
      typeof item.name !== 'string' ||
      !item.name.trim() ||
      typeof item.url !== 'string' ||
      !/^https:\/\/github\.com\/advisories\/GHSA-[a-z0-9-]+$/.test(item.url) ||
      !severities.includes(item.severity) ||
      typeof item.reason !== 'string' ||
      !item.reason.trim()
    )
      throw new Error('Excepción incompleta o inválida.');
    const key = JSON.stringify([item.scope, item.name, item.url]);
    if (keys.has(key)) throw new Error('Excepción duplicada.');
    keys.add(key);
  }
  return day + 24 * 60 * 60 * 1000;
}

// Reject incomplete audit responses as well as unapproved advisories.
export function evaluateAuditResult(result, { policy, scope, release = false, now = Date.now() }) {
  const expiresAt = validatePolicy(policy);
  const errors = [];
  if (now >= expiresAt) errors.push('La revisión de excepciones ha vencido.');
  if (result.error || result.signal || ![0, 1].includes(result.status))
    errors.push('La consulta npm no terminó correctamente.');
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return { errors: [...errors, 'La respuesta npm no es JSON válido.'], report: null };
  }
  if (
    !isObject(report) ||
    report.error ||
    report.auditReportVersion !== 2 ||
    !isObject(report.metadata?.vulnerabilities) ||
    !isObject(report.vulnerabilities)
  )
    return { errors: [...errors, 'Informe npm incompleto o no compatible.'], report };
  const counts = report.metadata.vulnerabilities;
  const entries = Object.entries(report.vulnerabilities);
  if (
    [...severities, 'total'].some((key) => !Number.isSafeInteger(counts[key]) || counts[key] < 0) ||
    severities.reduce((sum, key) => sum + counts[key], 0) !== counts.total ||
    entries.length !== counts.total ||
    severities.some(
      (severity) =>
        entries.filter(([, value]) => value?.severity === severity).length !== counts[severity],
    ) ||
    result.status !== (counts.total ? 1 : 0)
  )
    errors.push('Recuentos o código de salida npm incoherentes.');
  if (release && entries.length)
    errors.push('Publicación bloqueada: quedan dependencias vulnerables.');
  const advisories = new Map();
  const resolve = (name, parents = new Set()) => {
    const value = report.vulnerabilities[name];
    if (parents.has(name)) return false;
    if (
      !isObject(value) ||
      !severities.includes(value.severity) ||
      !Array.isArray(value.via) ||
      !value.via.length
    )
      return false;
    let valid = true;
    for (const via of value.via) {
      if (typeof via === 'string') {
        if (!resolve(via, new Set([...parents, name]))) valid = false;
      } else if (
        isObject(via) &&
        typeof via.name === 'string' &&
        via.name.trim() &&
        typeof via.url === 'string' &&
        via.url.startsWith('https://') &&
        severities.includes(via.severity)
      )
        advisories.set(JSON.stringify([via.name, via.url, via.severity]), via);
      else valid = false;
    }
    return valid;
  };
  for (const [name] of entries)
    if (!resolve(name)) errors.push(`Cadena de avisos incompleta: ${name}.`);
  for (const advisory of advisories.values()) {
    const exception = policy.exceptions.find(
      (item) =>
        item.scope === scope &&
        item.name === advisory.name &&
        item.url === advisory.url &&
        item.severity === advisory.severity,
    );
    if (!exception)
      errors.push(`Aviso sin excepción en ${scope}: ${advisory.name} (${advisory.url}).`);
  }
  return { errors, report };
}
