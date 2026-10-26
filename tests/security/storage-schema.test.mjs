import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_GUARD_SQL } from '../../src/data/local/storagePolicy.ts';

test('SQLite bloquea escrituras del cliente v1 y revierte también sus fichas', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');
    db.exec(SCHEMA_GUARD_SQL);
    const put = db.prepare('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)');
    const get = db.prepare('SELECT value FROM kv WHERE key = ?');
    put.run(
      'library:test:v1',
      JSON.stringify({ version: 2, basket: [{ barcode: '3274080005003' }] }),
    );
    const before = get.get('library:test:v1').value;
    db.exec('BEGIN;');
    put.run('library:test:v1:product:3274080005003', 'stale-product');
    assert.throws(
      () => put.run('library:test:v1', '{"version":1}'),
      /unsupported_library_downgrade/,
    );
    db.exec('ROLLBACK;');
    assert.equal(get.get('library:test:v1').value, before);
    assert.equal(get.get('library:test:v1:product:3274080005003'), undefined);
    assert.throws(
      () =>
        db.prepare('UPDATE kv SET value = ? WHERE key = ?').run('{"version":1}', 'library:test:v1'),
      /unsupported_library_downgrade/,
    );
    put.run('library:test:v1', '{"version":2,"basket":[]}');
    assert.deepEqual(JSON.parse(get.get('library:test:v1').value).basket, []);
  } finally {
    db.close();
  }
});
