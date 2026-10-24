const { before: beforeAll, beforeEach, after: afterAll, test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const serverRequire = createRequire(path.resolve('functions/package.json'));
const { initializeApp: initializeAdmin, deleteApp: deleteAdmin } =
  serverRequire('firebase-admin/app');
const { getAuth: adminAuth } = serverRequire('firebase-admin/auth');
const { getFirestore: adminFirestore } = serverRequire('firebase-admin/firestore');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');
const {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  terminate,
} = require('firebase/firestore');
const projectId = 'demo-sin-gluten';
const { synchronizeFavorites, LibraryRepository, normalizeProduct } = require('./generated.cjs');
const password = 'Prueba-local-12345';
let admin;
let adminDb;
let alice;
let unverified;
let moderator;
let anonymous;
async function client(name, email) {
  const app = initializeApp(
    { projectId, apiKey: 'demo-api-key', authDomain: `${projectId}.firebaseapp.com` },
    name,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const functions = getFunctions(app, 'europe-west1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  if (email) await signInWithEmailAndPassword(auth, email, password);
  return { app, auth, functions, db };
}
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST)
    throw new Error('Solo se permite ejecutar contra emuladores.');
  admin = initializeAdmin({ projectId });
  adminDb = adminFirestore(admin);
  for (const [uid, email, verified] of [
    ['alice', 'alice@example.test', true],
    ['unverified', 'unverified@example.test', false],
    ['moderator', 'moderator@example.test', true],
  ]) {
    await adminAuth(admin).createUser({ uid, email, password, emailVerified: verified });
  }
  await adminAuth(admin).setCustomUserClaims('moderator', { admin: true });
  alice = await client('alice', 'alice@example.test');
  unverified = await client('unverified', 'unverified@example.test');
  moderator = await client('moderator', 'moderator@example.test');
  anonymous = await client('anonymous');
});
beforeEach(async () => {
  const result = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!result.ok) throw new Error('No se ha podido limpiar el emulador.');
});
afterAll(async () => {
  for (const item of [alice, unverified, moderator, anonymous])
    if (item) {
      await terminate(item.db);
      await deleteApp(item.app);
    }
  if (admin) await deleteAdmin(admin);
});
function price(id = 'observation-test-001') {
  return {
    id,
    barcode: '3274080005003',
    store: 'Tienda de prueba',
    location: 'Madrid, sucursal de prueba',
    amountMinor: 249,
    currency: 'EUR',
    observedAt: new Date().toISOString(),
    createdAt: 'client-not-trusted',
    quantity: null,
    unit: null,
    offerEndsAt: null,
    notes: '',
  };
}
test('los favoritos se sincronizan entre dispositivos y los borrados no reaparecen', async () => {
  function memory() {
    const values = new Map();
    return {
      async get(key) {
        return values.get(key) ?? null;
      },
      async commit(items, removals = []) {
        Object.entries(items).forEach(([key, value]) => values.set(key, value));
        removals.forEach((key) => values.delete(key));
      },
    };
  }
  const first = new LibraryRepository(memory(), 'production');
  const second = new LibraryRepository(memory(), 'production');
  const product = normalizeProduct(
    {
      product_name: 'Prueba de sincronización',
      labels_tags: ['en:no-gluten'],
      allergens_tags: [],
      traces_tags: [],
    },
    '3274080005003',
    'production',
  );
  await first.saveProduct(product);
  await first.toggleFavorite(product);
  await synchronizeFavorites(alice.db, 'alice', first, () => true);
  await synchronizeFavorites(alice.db, 'alice', second, () => true);
  assert.equal(second.getSnapshot().data.favorites[product.barcode].deleted, false);
  assert.equal((await second.getProduct(product.barcode)).name, product.name);
  await second.toggleFavorite(product);
  await synchronizeFavorites(alice.db, 'alice', second, () => true);
  await synchronizeFavorites(alice.db, 'alice', first, () => true);
  assert.equal(first.getSnapshot().data.favorites[product.barcode].deleted, true);
  await assert.rejects(
    synchronizeFavorites(alice.db, 'alice', first, () => false),
    /sesión ha cambiado/,
  );
});
test('autenticación, verificación y validación se comprueban en el servidor', async () => {
  await assert.rejects(
    httpsCallable(anonymous.functions, 'submitPrice')({ observation: price() }),
    { code: 'functions/unauthenticated' },
  );
  await assert.rejects(
    httpsCallable(unverified.functions, 'submitPrice')({ observation: price() }),
    { code: 'functions/permission-denied' },
  );
  await assert.rejects(
    httpsCallable(alice.functions, 'submitPrice')({ observation: { ...price(), amountMinor: -1 } }),
    { code: 'functions/invalid-argument' },
  );
});
test('el envío es idempotente, el autor se impone y solo un moderador publica', async () => {
  const submit = httpsCallable(alice.functions, 'submitPrice');
  const result = await submit({
    observation: { ...price(), authorId: 'someone-else', status: 'published' },
  });
  await submit({ observation: price() });
  const stored = await adminDb.doc(`priceObservations/${result.data.id}`).get();
  assert.equal(stored.data().authorId, 'alice');
  assert.equal(stored.data().status, 'pending');
  assert.notEqual(stored.data().createdAt, 'client-not-trusted');
  assert.equal((await adminDb.doc('_rateLimits/alice').get()).data().count, 1);
  await assert.rejects(
    httpsCallable(alice.functions, 'moderatePrice')({ id: result.data.id, status: 'published' }),
    { code: 'functions/permission-denied' },
  );
  const moderated = await httpsCallable(
    moderator.functions,
    'moderatePrice',
  )({ id: result.data.id, status: 'published' });
  const publicData = (
    await getDoc(doc(anonymous.db, `publishedPrices/${moderated.data.publishedId}`))
  ).data();
  assert.equal(publicData.status, 'published');
  assert.equal(publicData.authorId, undefined);
  assert.equal(publicData.moderatedBy, undefined);
});
test('el límite diario también se aplica a peticiones directas', async () => {
  const submit = httpsCallable(alice.functions, 'submitPrice');
  for (let n = 0; n < 20; n++)
    await submit({ observation: price(`quota-test-${String(n).padStart(3, '0')}`) });
  await assert.rejects(submit({ observation: price('quota-over-limit') }), {
    code: 'functions/resource-exhausted',
  });
});
test('eliminar cuenta borra favoritos y contribuciones y bloquea el token anterior', async () => {
  await setDoc(doc(alice.db, 'users/alice/favorites/3274080005003'), {
    barcode: '3274080005003',
    name: 'Prueba',
    brands: '',
    updatedAt: Date.now(),
    deleted: false,
    snapshot: '{}',
    receivedAt: serverTimestamp(),
  });
  await httpsCallable(alice.functions, 'submitPrice')({ observation: price() });
  await httpsCallable(alice.functions, 'deleteMyAccount')({});
  assert.equal((await adminDb.collection('users/alice/favorites').get()).empty, true);
  assert.equal(
    (await adminDb.collection('priceObservations').where('authorId', '==', 'alice').get()).empty,
    true,
  );
  await assert.rejects(adminAuth(admin).getUser('alice'), { code: 'auth/user-not-found' });
  await assert.rejects(
    setDoc(doc(alice.db, 'users/alice/favorites/3274080005003'), {
      barcode: '3274080005003',
      name: 'Prueba',
      brands: '',
      updatedAt: Date.now(),
      deleted: false,
      snapshot: '{}',
      receivedAt: serverTimestamp(),
    }),
    { code: 'permission-denied' },
  );
});
