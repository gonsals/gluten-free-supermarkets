import {
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Favorite, LibraryRepository } from '@/src/data/local/library';
import { isProduct, record, type Product } from '@/src/domain/product';

interface RemoteFavorite {
  favorite: Favorite;
  product: Product | null;
}
function parseFavorite(id: string, value: unknown): RemoteFavorite {
  if (
    !record(value) ||
    typeof value.snapshot !== 'string' ||
    value.snapshot.length > 50000 ||
    typeof value.updatedAt !== 'number' ||
    !Number.isSafeInteger(value.updatedAt) ||
    value.updatedAt < 0 ||
    value.updatedAt > Date.now() + 300000 ||
    typeof value.deleted !== 'boolean' ||
    !/^\d{8}$|^\d{12,14}$/.test(id) ||
    typeof value.name !== 'string' ||
    typeof value.brands !== 'string'
  )
    throw new Error('No se han podido interpretar los favoritos remotos.');
  let product: unknown = null;
  try {
    product = value.snapshot ? JSON.parse(value.snapshot) : null;
  } catch {
    throw new Error('Ficha remota no válida.');
  }
  if (!value.deleted && (!isProduct(product) || product.barcode !== id))
    throw new Error('Ficha remota no válida.');
  return {
    favorite: {
      barcode: id,
      name: value.name.slice(0, 300),
      brands: value.brands.slice(0, 500),
      state: isProduct(product) ? product.assessment.state : 'unknown',
      fetchedAt: isProduct(product) ? product.source.fetchedAt : '',
      updatedAt: value.updatedAt,
      deleted: value.deleted,
    },
    product: !value.deleted && isProduct(product) ? product : null,
  };
}
export async function synchronizeFavorites(
  db: Firestore,
  uid: string,
  library: LibraryRepository,
  isCurrent: () => boolean,
): Promise<{ count: number }> {
  function checkSession() {
    if (!isCurrent()) throw new Error('La sesión ha cambiado.');
  }
  checkSession();
  await library.load();
  const local = library.getSnapshot().data;
  if (local.cloudOwner && local.cloudOwner !== uid)
    throw new Error(
      'La biblioteca pertenece a otra cuenta. Exporta y borra los datos locales antes de cambiar de cuenta.',
    );
  const ref = collection(db, 'users', uid, 'favorites');
  const remoteValues: RemoteFavorite[] = [];
  let cursor: QueryDocumentSnapshot | undefined;
  for (let page = 0; page < 15; page++) {
    checkSession();
    const result = await getDocs(
      query(ref, orderBy(documentId()), ...(cursor ? [startAfter(cursor)] : []), limit(100)),
    );
    remoteValues.push(...result.docs.map((item) => parseFavorite(item.id, item.data())));
    if (result.size < 100) break;
    if (page === 14)
      throw new Error(
        'La cuenta supera el límite de sincronización. Reduce el número de favoritos antes de continuar.',
      );
    cursor = result.docs.at(-1);
  }
  checkSession();
  await library.importFavorites(
    uid,
    remoteValues.map((x) => x.favorite),
    remoteValues.flatMap((x) => (x.product ? [x.product] : [])),
  );
  const merged = Object.values(library.getSnapshot().data.favorites);
  const concurrent: RemoteFavorite[] = [];
  for (const favorite of merged) {
    checkSession();
    const product = favorite.deleted ? null : await library.getProduct(favorite.barcode);
    if (!favorite.deleted && !product)
      throw new Error('Falta una ficha local. Consulta el producto antes de sincronizar.');
    const snapshot = product ? JSON.stringify(product) : '';
    if (snapshot.length > 50000) throw new Error('La ficha supera el límite de sincronización.');
    const incoming = await runTransaction(db, async (tx) => {
      const target = doc(ref, favorite.barcode);
      const document = await tx.get(target);
      if (document.exists()) {
        const remote = parseFavorite(document.id, document.data());
        if (
          remote.favorite.updatedAt > favorite.updatedAt ||
          (remote.favorite.updatedAt === favorite.updatedAt &&
            (remote.favorite.deleted ||
              (!favorite.deleted &&
                (remote.product?.source.fetchedAt ?? '') > (product?.source.fetchedAt ?? ''))))
        )
          return remote;
        if (
          document.data().updatedAt === favorite.updatedAt &&
          document.data().deleted === favorite.deleted &&
          document.data().snapshot === snapshot
        )
          return undefined;
      }
      checkSession();
      tx.set(target, {
        barcode: favorite.barcode,
        name: favorite.name.slice(0, 300),
        brands: favorite.brands.slice(0, 500),
        updatedAt: favorite.updatedAt,
        deleted: favorite.deleted,
        snapshot,
        receivedAt: serverTimestamp(),
      });
      return undefined;
    });
    if (incoming) concurrent.push(incoming);
  }
  checkSession();
  if (concurrent.length)
    await library.importFavorites(
      uid,
      concurrent.map((x) => x.favorite),
      concurrent.flatMap((x) => (x.product ? [x.product] : [])),
    );
  return {
    count: Object.values(library.getSnapshot().data.favorites).filter((x) => !x.deleted).length,
  };
}
