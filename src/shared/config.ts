const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const offEnv = process.env.EXPO_PUBLIC_OFF_ENV ?? 'production';
if (!['development', 'beta', 'production', 'test'].includes(appEnv))
  throw new Error('EXPO_PUBLIC_APP_ENV no válido');
if (!['staging', 'production'].includes(offEnv)) throw new Error('EXPO_PUBLIC_OFF_ENV no válido');
const emulatorHost = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? '127.0.0.1';
if (!/^[a-zA-Z0-9.:-]+$/.test(emulatorHost)) throw new Error('Host de emulador no válido');
const projectId = process.env.EXPO_PUBLIC_PROJECT_ID ?? '';
const useEmulators = process.env.EXPO_PUBLIC_USE_EMULATORS === 'true';
if (useEmulators && (appEnv === 'production' || !projectId.startsWith('demo-')))
  throw new Error('Los emuladores requieren un proyecto demo- y un entorno no productivo');
export const config = {
  appEnv,
  offEnvironment: offEnv as 'staging' | 'production',
  cloudEnabled:
    process.env.EXPO_PUBLIC_CLOUD_ENABLED === 'true' &&
    Boolean(projectId && process.env.EXPO_PUBLIC_API_KEY),
  firebase: {
    projectId,
    apiKey: process.env.EXPO_PUBLIC_API_KEY ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
    authDomain: `${projectId}.firebaseapp.com`,
  },
  useEmulators,
  emulatorHost,
  telemetryUrl: process.env.EXPO_PUBLIC_TELEMETRY_URL ?? '',
  version: '1.0.0',
};
