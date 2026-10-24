import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuth from 'firebase/auth';
import type { Persistence } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
// Firebase exposes this helper at runtime under its react-native export condition,
// but its top-level public declaration omits the native-only symbol.
const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};
export function createAuth(app: FirebaseApp) {
  return nativeAuth.initializeAuth(app, {
    persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
  });
}
