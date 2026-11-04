// Run the same pure TypeScript modules as the app without a second normalization implementation.
// Only trusted repository modules are compiled; report/plan JSON is never executed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.dirname(require.resolve('../../package.json'));
const cache = new Map();
function loadDomain(filename) {
  const absolute = fs.realpathSync(path.resolve(root, filename));
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  if (!relative.startsWith('src/domain/') && relative !== 'src/data/open-prices/client.ts')
    throw new Error('Only pure domain modules and the read-only price client are allowed.');
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  cache.set(absolute, module);
  const localRequire = (name) => {
    if (name.startsWith('@/')) return loadDomain(name.slice(2) + '.ts');
    if (name.startsWith('.')) return loadDomain(path.resolve(path.dirname(absolute), name) + '.ts');
    throw new Error('External imports are not allowed in the measurement domain.');
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: absolute })(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
module.exports = { loadDomain };
