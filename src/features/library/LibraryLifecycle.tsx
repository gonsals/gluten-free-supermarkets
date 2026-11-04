import { useCallback, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { library } from '@/src/data/repositories';

/** One lifecycle subscription for all consumers, including other browser tabs. */
export function LibraryLifecycle() {
  const pathname = usePathname();
  const refresh = useCallback(() => {
    void library.refresh();
  }, []);
  useEffect(refresh, [pathname, refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    if (Platform.OS === 'web') window.addEventListener('focus', refresh);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('focus', refresh);
    };
  }, [refresh]);
  return null;
}
