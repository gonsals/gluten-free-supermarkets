import { useEffect, useSyncExternalStore } from 'react';
import { library } from '@/src/data/repositories';

export function useLibrary() {
  const snapshot = useSyncExternalStore(
    library.subscribe,
    library.getSnapshot,
    library.getSnapshot,
  );
  useEffect(() => {
    void library.load();
  }, []);
  return { ...snapshot, repository: library };
}
