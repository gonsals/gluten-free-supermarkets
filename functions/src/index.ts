import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { normalizeBarcode } from '../../src/domain/barcode';
import { validatePrice, type PriceObservation } from '../../src/domain/price';

initializeApp();
const db = getFirestore();
const enforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true';
const options = { region: 'europe-west1', maxInstances: 5, timeoutSeconds: 120, enforceAppCheck };
function publishedId(id: string) {
  return createHash('sha256').update(id).digest('hex').slice(0, 40);
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parsePrice(value: unknown): PriceObservation {
  if (
    !object(value) ||
    typeof value.id !== 'string' ||
    !/^[a-zA-Z0-9-]{8,100}$/.test(value.id) ||
    typeof value.barcode !== 'string' ||
    typeof value.store !== 'string' ||
    typeof value.location !== 'string' ||
    typeof value.amountMinor !== 'number' ||
    value.currency !== 'EUR' ||
    typeof value.observedAt !== 'string' ||
    typeof value.notes !== 'string' ||
    !(value.quantity === null || typeof value.quantity === 'number') ||
    ![null, 'kg', 'l', 'unit'].includes(value.unit as string | null) ||
    !(value.offerEndsAt === null || typeof value.offerEndsAt === 'string')
  )
    throw new HttpsError('invalid-argument', 'Observación de precio no válida.');
  const price: PriceObservation = {
    id: value.id,
    barcode: normalizeBarcode(value.barcode),
    store: value.store.trim(),
    location: value.location.trim(),
    amountMinor: value.amountMinor,
    currency: 'EUR',
    observedAt: value.observedAt,
    notes: value.notes.trim(),
    quantity: value.quantity,
    unit: value.unit as PriceObservation['unit'],
    offerEndsAt: value.offerEndsAt,
    createdAt: new Date().toISOString(),
  };
  validatePrice(price);
  return price;
}
export const submitPrice = onCall(options, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (request.auth?.token.email_verified !== true)
    throw new HttpsError('permission-denied', 'Verifica tu correo antes de compartir.');
  let price: PriceObservation;
  try {
    price = parsePrice(object(request.data) ? request.data.observation : null);
  } catch (error) {
    throw error instanceof HttpsError
      ? error
      : new HttpsError(
          'invalid-argument',
          error instanceof Error ? error.message : 'Datos no válidos.',
        );
  }
  const target = db.doc(`priceObservations/${uid}_${price.id}`);
  const rate = db.doc(`_rateLimits/${uid}`);
  const account = db.doc(`_accountState/${uid}`);
  await db.runTransaction(async (tx) => {
    const [existing, rateState, accountState] = await Promise.all([
      tx.get(target),
      tx.get(rate),
      tx.get(account),
    ]);
    if (accountState.data()?.deleting)
      throw new HttpsError('permission-denied', 'La cuenta está en proceso de eliminación.');
    if (existing.exists) return; // Retrying the same operation never consumes another quota or duplicates data.
    const today = new Date().toISOString().slice(0, 10);
    const count = rateState.data()?.day === today ? Number(rateState.data()?.count) : 0;
    if (count >= 20)
      throw new HttpsError('resource-exhausted', 'Límite de 20 observaciones diarias alcanzado.');
    tx.set(rate, { day: today, count: count + 1, receivedAt: FieldValue.serverTimestamp() });
    tx.create(target, {
      ...price,
      id: target.id,
      authorId: uid,
      status: 'pending',
      receivedAt: FieldValue.serverTimestamp(),
    });
  });
  return { id: target.id, status: 'pending' };
});
export const moderatePrice = onCall(options, async (request) => {
  if (request.auth?.token.admin !== true)
    throw new HttpsError('permission-denied', 'Requiere moderación autorizada.');
  const data: unknown = request.data;
  if (
    !object(data) ||
    typeof data.id !== 'string' ||
    !/^[a-zA-Z0-9_-]{8,250}$/.test(data.id) ||
    !['published', 'rejected'].includes(String(data.status))
  )
    throw new HttpsError('invalid-argument', 'Datos no válidos.');
  const ref = db.doc(`priceObservations/${data.id}`);
  const publicId = publishedId(data.id);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (!existing.exists) throw new HttpsError('not-found', 'Observación inexistente.');
    const value = existing.data()!;
    const author = value.authorId;
    if (
      typeof author === 'string' &&
      (await tx.get(db.doc(`_accountState/${author}`))).data()?.deleting
    )
      throw new HttpsError('failed-precondition', 'Cuenta en eliminación.');
    tx.update(ref, {
      status: data.status,
      moderatedAt: FieldValue.serverTimestamp(),
      moderatedBy: request.auth!.uid,
    });
    const publicRef = db.doc(`publishedPrices/${publicId}`);
    if (data.status === 'published') {
      // Explicit public contract: new private fields must never leak through a spread.
      tx.set(publicRef, {
        id: publicId,
        status: 'published',
        barcode: value.barcode,
        store: value.store,
        location: value.location,
        amountMinor: value.amountMinor,
        currency: value.currency,
        observedAt: value.observedAt,
        createdAt: value.createdAt,
        quantity: value.quantity,
        unit: value.unit,
        offerEndsAt: value.offerEndsAt,
        notes: value.notes,
      });
    } else tx.delete(publicRef);
  });
  return { status: data.status, publishedId: publicId };
});
export const deleteMyAccount = onCall(options, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (Date.now() / 1000 - Number(request.auth?.token.auth_time ?? 0) > 300)
    throw new HttpsError(
      'failed-precondition',
      'Vuelve a autenticarte antes de eliminar tu cuenta.',
    );
  const account = db.doc(`_accountState/${uid}`);
  await account.set({
    deleting: true,
    startedAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 86400000),
  });
  // Block new contributions first. Retrying after a partial failure is safe.
  for (;;) {
    const result = await db
      .collection('priceObservations')
      .where('authorId', '==', uid)
      .limit(100)
      .get();
    if (result.empty) break;
    const batch = db.batch();
    result.docs.forEach((doc) => {
      batch.delete(doc.ref);
      batch.delete(db.doc(`publishedPrices/${publishedId(doc.id)}`));
    });
    await batch.commit();
  }
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await db.doc(`_rateLimits/${uid}`).delete();
  await getAuth().revokeRefreshTokens(uid);
  await getAuth().deleteUser(uid);
  // Keep an inaccessible tombstone so a still-valid ID token cannot recreate data.
  await account.set({
    deleting: true,
    completedAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 86400000),
  });
  return { deleted: true };
});
