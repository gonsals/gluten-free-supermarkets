import { Camera } from 'expo-camera';
import type { PermissionResponse } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

const permissionError =
  'No se ha podido comprobar el acceso a la cámara. Puedes introducir el código manualmente y volver a intentarlo.';

export function useScannerCamera(focused: boolean) {
  const [permission, setPermission] = useState<PermissionResponse | null>(null);
  const [mode, setMode] = useState<'manual' | 'camera'>('manual');
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const alive = useRef(true);
  const generation = useRef(0);
  const pending = useRef(false);

  const invalidate = useCallback(() => {
    generation.current++;
    pending.current = false;
  }, []);
  const enterManual = useCallback(() => {
    invalidate();
    setRequesting(false);
    setMode('manual');
    setTorch(false);
  }, [invalidate]);
  const refreshPermission = useCallback(() => {
    if (pending.current) return;
    const id = ++generation.current;
    return Promise.resolve()
      .then(() => Camera.getCameraPermissionsAsync())
      .then((next) => {
        if (!alive.current || id !== generation.current) return;
        setPermission(next);
        if (!next.granted) {
          setMode('manual');
          setTorch(false);
        }
      })
      .catch(() => {
        if (!alive.current || id !== generation.current) return;
        setPermission(null);
        setMode('manual');
        setTorch(false);
        setError(permissionError);
      });
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      invalidate();
    };
  }, [invalidate]);
  useEffect(() => {
    if (focused) void refreshPermission();
    return () => {
      if (alive.current) {
        enterManual();
        setError('');
      } else invalidate();
    };
  }, [focused, refreshPermission, enterManual, invalidate]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      if (state !== 'active') setTorch(false);
      // System permission screens can temporarily background the app too.
      // Keep that request, but only activate while active when it resolves.
      // An already running camera requires another explicit start on return.
      if (state === 'background' && !pending.current) enterManual();
      else if (state === 'active' && focused) void refreshPermission();
    });
    const blurListener =
      Platform.OS === 'android'
        ? AppState.addEventListener('blur', () => {
            setTorch(false);
            if (!pending.current) enterManual();
          })
        : undefined;
    return () => {
      listener.remove();
      blurListener?.remove();
    };
  }, [focused, refreshPermission, enterManual]);

  const startCamera = useCallback(async () => {
    if (!focused || AppState.currentState !== 'active' || pending.current) return;
    const id = ++generation.current;
    pending.current = true;
    setRequesting(true);
    setError('');
    try {
      const next = await Camera.requestCameraPermissionsAsync();
      if (!alive.current || id !== generation.current) return;
      setPermission(next);
      if (next.granted && AppState.currentState === 'active') setMode('camera');
      else if (!next.granted)
        setError('No se ha concedido acceso. Puedes introducir el código manualmente.');
    } catch {
      if (alive.current && id === generation.current) setError(permissionError);
    } finally {
      if (alive.current && id === generation.current) {
        pending.current = false;
        setRequesting(false);
      }
    }
  }, [focused]);

  return {
    permission,
    mode,
    torch,
    error,
    requesting,
    enabled:
      focused && foreground && mode === 'camera' && Boolean(permission?.granted) && !requesting,
    startCamera,
    enterManual,
    clearError: () => setError(''),
    settingsError: () => setError('Abre los ajustes del dispositivo para permitir la cámara.'),
    turnOffTorch: () => setTorch(false),
    toggleTorch: () => setTorch((value) => !value),
    mountError: () => {
      enterManual();
      setError('La cámara no está disponible. Puedes introducir el código manualmente.');
    },
  };
}
