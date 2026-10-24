const fs = require('node:fs');
const { beforeAll, beforeEach, afterAll, test } = require('@jest/globals');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  serverTimestamp,
} = require('firebase/firestore');
let environment;
const code = '3274080005003';
const favorite = () => ({
  barcode: code,
  name: 'Producto',
  brands: 'Marca',
  updatedAt: Date.now(),
  deleted: false,
  snapshot: '{}',
  receivedAt: serverTimestamp(),
});
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST)
    throw new Error('Las pruebas necesitan el emulador; nunca se ejecutan contra producción.');
  environment = await initializeTestEnvironment({
    projectId: 'demo-sin-gluten',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  });
});
beforeEach(() => environment.clearFirestore());
afterAll(() => environment?.cleanup());
test('el propietario puede guardar y leer sus favoritos, otro usuario no', async () => {
  const alice = environment.authenticatedContext('alice').firestore();
  const bob = environment.authenticatedContext('bob').firestore();
  await assertSucceeds(setDoc(doc(alice, `users/alice/favorites/${code}`), favorite()));
  await assertSucceeds(getDoc(doc(alice, `users/alice/favorites/${code}`)));
  await assertFails(getDoc(doc(bob, `users/alice/favorites/${code}`)));
  await assertFails(setDoc(doc(bob, `users/alice/favorites/${code}`), favorite()));
});
test('sin sesión no puede leer biblioteca ni editar catálogo', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, `users/alice/favorites/${code}`)));
  await assertFails(setDoc(doc(db, `products/${code}`), { glutenFree: true }));
});
test('no admite campos extra, fechas futuras, snapshot excesivo ni autoría inventada', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  const target = doc(db, `users/alice/favorites/${code}`);
  await assertFails(setDoc(target, { ...favorite(), admin: true }));
  await assertFails(setDoc(target, { ...favorite(), updatedAt: Date.now() + 86400000 }));
  await assertFails(setDoc(target, { ...favorite(), snapshot: 'x'.repeat(50001) }));
  await assertFails(
    setDoc(doc(db, 'priceObservations/test'), {
      barcode: code,
      authorId: 'bob',
      status: 'published',
    }),
  );
});
test('las listas privadas requieren propietario y un límite', async () => {
  const db = environment.authenticatedContext('alice').firestore();
  const ref = collection(db, 'users/alice/favorites');
  await assertSucceeds(getDocs(query(ref, limit(20))));
  await assertFails(getDocs(ref));
  await assertFails(getDocs(query(ref, limit(101))));
});
test('solo son públicas las observaciones publicadas y las consultas acotadas', async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'publishedPrices/public'), { barcode: code, status: 'published' });
    await setDoc(doc(db, 'priceObservations/private'), {
      barcode: code,
      status: 'pending',
      authorId: 'alice',
    });
  });
  const db = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, 'publishedPrices/public')));
  await assertFails(getDoc(doc(db, 'priceObservations/private')));
  await assertSucceeds(
    getDocs(query(collection(db, 'publishedPrices'), where('barcode', '==', code), limit(20))),
  );
  await assertFails(getDocs(query(collection(db, 'priceObservations'), limit(20))));
});
test('una cuenta en eliminación no puede reconstruir favoritos con un token anterior', async () => {
  await environment.withSecurityRulesDisabled((context) =>
    setDoc(doc(context.firestore(), '_accountState/alice'), { deleting: true }),
  );
  const db = environment.authenticatedContext('alice').firestore();
  await assertFails(setDoc(doc(db, `users/alice/favorites/${code}`), favorite()));
  await assertFails(setDoc(doc(db, 'users/alice'), { admin: true }));
});
test('moderar requiere una custom claim, no un campo editable en la base de datos', async () => {
  const ownerDb = environment.authenticatedContext('alice').firestore();
  const moderatorDb = environment.authenticatedContext('moderator', { admin: true }).firestore();
  await environment.withSecurityRulesDisabled((context) =>
    setDoc(doc(context.firestore(), 'priceObservations/review'), {
      barcode: code,
      authorId: 'alice',
      status: 'pending',
    }),
  );
  await assertSucceeds(getDoc(doc(ownerDb, 'priceObservations/review')));
  await assertSucceeds(
    getDocs(
      query(
        collection(moderatorDb, 'priceObservations'),
        where('status', '==', 'pending'),
        limit(20),
      ),
    ),
  );
  await assertFails(setDoc(doc(ownerDb, 'users/alice'), { admin: true }));
});
