import { library } from '@/src/data/repositories';
import { getCloud } from './client';
import { synchronizeFavorites } from './sync';
export async function syncFavorites() {
  const { auth, db } = getCloud();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Inicia sesión para sincronizar.');
  return synchronizeFavorites(db, uid, library, () => auth.currentUser?.uid === uid);
}
