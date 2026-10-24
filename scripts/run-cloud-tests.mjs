import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
const require = createRequire(import.meta.url);
const tools = createRequire(resolve('functions/package.json'));
await tools('esbuild').build({
  entryPoints: ['tests/cloud/entry.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  packages: 'external',
  alias: { '@': process.cwd() },
  outfile: 'tests/cloud/generated.cjs',
});
const cli = join(dirname(require.resolve('firebase-tools/package.json')), 'lib/bin/firebase.js');
const child = spawn(
  process.execPath,
  [
    cli,
    'emulators:exec',
    '--only',
    'auth,firestore,functions',
    '--project',
    'demo-sin-gluten',
    'node --test tests/cloud/functions.test.cjs',
  ],
  { stdio: 'inherit', env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '60' } },
);
child.on('error', () => {
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
