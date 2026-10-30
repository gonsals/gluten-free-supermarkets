import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { summarize, readJson } = require('../../scripts/measure-price-coverage.cjs');
const { loadDomain } = require('../../scripts/lib/load-domain.cjs');
const filename = new URL(
  '../../docs/datos/cobertura-madrid-2026-10-30.snapshot.json',
  import.meta.url,
);
const snapshot = () => readJson(filename, 5 * 1024 * 1024);
test('replay real sin red reproduce 33 observaciones, siete vacíos y cero cestas elegibles', () => {
  const s = summarize(snapshot());
  const published = readJson(
    new URL('../../docs/datos/cobertura-madrid-2026-10-30.summary.json', import.meta.url),
    5 * 1024 * 1024,
  );
  assert.deepEqual(s, published);
  assert.equal(s.basket_page_1.loaded, 33);
  assert.equal(s.basket_page_1.productsWithoutProviderRows, 7);
  assert.equal(s.basket_page_1.providerErrors, 0);
  assert.equal(s.basket_page_1.completeCandidateBaskets, 0);
  assert.equal(s.nearby_recent_page_1.loaded, 0);
  const output = execFileSync(
    process.execPath,
    ['scripts/measure-price-coverage.cjs', '--replay'],
    { encoding: 'utf8' },
  );
  assert.deepEqual(JSON.parse(output), s);
});
test('un plan alterado o una página duplicada no produce un informe válido', () => {
  const s = snapshot();
  s.plan.basket[0].quantity = 2;
  assert.throws(() => summarize(s), /identity/);
  const t = snapshot();
  t.profiles.basket_page_1.push(t.profiles.basket_page_1[0]);
  assert.throws(() => summarize(t), /Duplicate/);
});
test('rechaza observaciones privadas y campos de autor/prueba en las páginas reproducidas', () => {
  for (const field of ['source', 'owner', 'proof']) {
    const s = snapshot(),
      q = s.profiles.basket_page_1.find((p) => p.quotes.length).quotes[0];
    if (field === 'source') q.source = 'private';
    else q[field] = 'must-not-publish';
    assert.throws(() => summarize(s), /public page/);
  }
});
test('el compilador de medición no permite ejecutar módulos de almacenamiento ni configuración', () => {
  assert.throws(() => loadDomain('src/data/local/library.ts'), /Only pure/);
  assert.throws(() => loadDomain('package.json'), /Only pure/);
});
function mockCollection(mode) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coverage-cli-'));
  const preload = path.join(dir, 'mock.cjs'),
    stats = path.join(dir, 'stats.json');
  const source = `const fs=require('node:fs');const stats={preflight:0,production:0};
 let clock=Date.now();Date.now=()=>clock+=10000;
 global.fetch=async(input)=>{const u=new URL(input);if(!['prices.openfoodfacts.org','prices.openfoodfacts.net'].includes(u.hostname))throw Error('unexpected destination');
 const pre=u.hostname.endsWith('.net');stats[pre?'preflight':'production']++;fs.writeFileSync(${JSON.stringify(stats)},JSON.stringify(stats));
 if(${JSON.stringify(mode)}==='preflight-error'&&pre)return new Response('{}',{status:503});
 if(${JSON.stringify(mode)}==='rate-limit'&&!pre)return new Response('{}',{status:429});
 const page=+u.searchParams.get('page'),code=u.searchParams.get('product_code');
 const items=Array.from({length:50},(_,i)=>({id:page*100+i+1,product_code:code,type:'PRODUCT',price:1,currency:'EUR',price_per:null,price_is_discounted:false,duplicate_of:null,date:'2020-01-01',created:'2020-01-01T00:00:00Z',location:{id:1,type:'OSM',osm_name:'Mock shop',osm_display_name:'Madrid, Spain',osm_address_country_code:'ES'}}));
 return new Response(JSON.stringify({items,page,size:50,pages:3,total:150}),{status:200,headers:{'Content-Type':'application/json'}});};`;
  fs.writeFileSync(preload, source);
  try {
    const result = spawnSync(
      process.execPath,
      ['--require', preload, 'scripts/measure-price-coverage.cjs', '--collect'],
      { encoding: 'utf8', timeout: 15000 },
    );
    assert.equal(result.error, undefined);
    return { result, stats: JSON.parse(fs.readFileSync(stats, 'utf8')) };
  } finally {
    for (const file of [preload, stats]) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
}
test('colector simulado limita toda la muestra a 40 peticiones de producción y una previa; no hace red real', () => {
  const { result, stats } = mockCollection('full');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(stats, { preflight: 1, production: 40 });
  const last = JSON.parse(result.stdout.trim().split('\n').at(-1));
  assert.equal(last.requests, 40);
});
test('429 detiene también perfiles posteriores; deja pendientes diferenciados del vacío', () => {
  const { result, stats } = mockCollection('rate-limit');
  assert.equal(result.status, 2, result.stderr);
  assert.deepEqual(stats, { preflight: 1, production: 1 });
  const last = JSON.parse(result.stdout.trim().split('\n').at(-1));
  assert.equal(last.summary.basket_page_1.errors, 1);
  const saved = JSON.parse(fs.readFileSync(path.join(last.folder, 'summary.json'), 'utf8'));
  assert.equal(saved.basket_page_1.notAttempted, 9);
  assert.equal(saved.basket_page_1.productsWithoutProviderRows, 0);
});
test('fallo de contrato en preproducción impide iniciar consultas de producción', () => {
  const { result, stats } = mockCollection('preflight-error');
  assert.equal(result.status, 1);
  assert.deepEqual(stats, { preflight: 1, production: 0 });
});
