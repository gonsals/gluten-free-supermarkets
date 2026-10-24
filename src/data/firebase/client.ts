import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { AppError } from '@/src/domain/errors';
import { config } from '@/src/shared/config';
import { createAuth } from './auth';

let cloud: ReturnType<typeof initialize> | undefined;
function initialize() {
  if (!config.cloudEnabled) throw new AppError('cloud_disabled');
  const app = getApps().length ? getApp() : initializeApp(config.firebase);
  const auth = createAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, 'europe-west1');
  if (config.useEmulators) {
    connectAuthEmulator(auth, `http://${config.emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, config.emulatorHost, 8080);
    connectFunctionsEmulator(functions, config.emulatorHost, 5001);
  }
  return { app, auth, db, functions };
}
export function getCloud() {
  cloud ??= initialize();
  return cloud;
}
