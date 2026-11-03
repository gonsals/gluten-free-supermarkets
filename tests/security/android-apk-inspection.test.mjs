import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('inspector APK: diez casos sintéticos de permisos, metadatos, integridad y credenciales sin SDK ni dispositivo', () => {
  const result = spawnSync(
    process.platform === 'win32' ? 'python' : 'python3',
    ['-B', fileURLToPath(new URL('./android-apk-inspection.py', import.meta.url))],
    { encoding: 'utf8', timeout: 30000 },
  );
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Ran 10 tests/);
  assert.match(result.stderr, /\bOK\b/);
});
