import { act, renderHook } from '@testing-library/react-native';
import { PermissionStatus, type PermissionResponse } from 'expo';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { useScannerCamera } from '../useScannerCamera';

function response(granted: boolean, canAskAgain = true): PermissionResponse {
  return {
    granted,
    canAskAgain,
    expires: 'never',
    status: granted ? PermissionStatus.GRANTED : PermissionStatus.DENIED,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const mockReadPermission = jest.fn(async () => response(false));
const mockRequestPermission = jest.fn(async () => response(false));
jest.mock('expo-camera', () => ({
  Camera: {
    getCameraPermissionsAsync: () => mockReadPermission(),
    requestCameraPermissionsAsync: () => mockRequestPermission(),
  },
}));
let change: (state: AppStateStatus) => void;
let blur: () => void;
let remove: jest.Mock;
const initialState = AppState.currentState;
beforeEach(() => {
  AppState.currentState = 'active';
  mockReadPermission.mockReset().mockResolvedValue(response(false));
  mockRequestPermission.mockReset().mockResolvedValue(response(true));
  remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, callback) => {
    if (event === 'change') change = callback;
    if (event === 'blur') blur = () => callback('active');
    return { remove };
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  AppState.currentState = initialState;
});
async function state(next: AppStateStatus) {
  await act(() => {
    AppState.currentState = next;
    change(next);
  });
}

test('el permiso inicial nunca activa la cámara sin una acción explícita', async () => {
  mockReadPermission.mockResolvedValue(response(true));
  const { result } = await renderHook(() => useScannerCamera(true));
  expect(result.current.permission?.granted).toBe(true);
  expect(result.current.enabled).toBe(false);
  expect(mockRequestPermission).not.toHaveBeenCalled();
  await act(() => result.current.startCamera());
  expect(result.current.enabled).toBe(true);
});
test('errores al consultar o solicitar permiso permiten seguir en modo manual', async () => {
  mockReadPermission.mockRejectedValue(new Error('native permission failure'));
  mockRequestPermission.mockRejectedValue(new Error('native permission failure'));
  const { result } = await renderHook(() => useScannerCamera(true));
  expect(result.current.error).toMatch(/No se ha podido comprobar/);
  await act(() => result.current.startCamera());
  expect(result.current.enabled).toBe(false);
  expect(result.current.mode).toBe('manual');
  expect(result.current.requesting).toBe(false);
  expect(result.current.error).toMatch(/código manualmente/);
});
test('denegar de forma permanente conserva canAskAgain para ofrecer ajustes', async () => {
  mockRequestPermission.mockResolvedValue(response(false, false));
  const { result } = await renderHook(() => useScannerCamera(true));
  await act(() => result.current.startCamera());
  expect(result.current.permission?.canAskAgain).toBe(false);
  expect(result.current.enabled).toBe(false);
  expect(result.current.error).toMatch(/No se ha concedido acceso/);
});
test('dos pulsaciones rápidas solo abren una solicitud de permisos', async () => {
  const request = deferred<PermissionResponse>();
  mockRequestPermission.mockReturnValue(request.promise);
  const { result } = await renderHook(() => useScannerCamera(true));
  let pending!: Promise<void>;
  await act(() => {
    pending = result.current.startCamera();
    void result.current.startCamera();
  });
  expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  expect(result.current.requesting).toBe(true);
  await act(async () => {
    request.resolve(response(true));
    await pending;
  });
  expect(result.current.enabled).toBe(true);
  expect(result.current.requesting).toBe(false);
});
test('aceptar un permiso después de salir de la pantalla no reactiva la cámara', async () => {
  const request = deferred<PermissionResponse>();
  mockRequestPermission.mockReturnValue(request.promise);
  const { result, rerender } = await renderHook((focused: boolean) => useScannerCamera(focused), {
    initialProps: true,
  });
  let pending!: Promise<void>;
  await act(() => {
    pending = result.current.startCamera();
  });
  await rerender(false);
  await act(async () => {
    request.resolve(response(true));
    await pending;
  });
  await rerender(true);
  expect(result.current.mode).toBe('manual');
  expect(result.current.enabled).toBe(false);
  expect(result.current.requesting).toBe(false);
});
test('segundo plano apaga la linterna y requiere volver a iniciar la cámara', async () => {
  mockReadPermission.mockResolvedValue(response(true));
  const { result } = await renderHook(() => useScannerCamera(true));
  await act(() => result.current.startCamera());
  await act(() => result.current.toggleTorch());
  expect(result.current.torch).toBe(true);
  await state('background');
  expect(result.current.enabled).toBe(false);
  expect(result.current.torch).toBe(false);
  await state('active');
  expect(result.current.enabled).toBe(false);
  expect(mockReadPermission).toHaveBeenCalledTimes(2);
  await act(() => result.current.startCamera());
  expect(result.current.enabled).toBe(true);
  expect(result.current.torch).toBe(false);
});
test('conceder el permiso mientras la app sigue en segundo plano no abre la cámara al retornar', async () => {
  const request = deferred<PermissionResponse>();
  mockRequestPermission.mockReturnValue(request.promise);
  const { result } = await renderHook(() => useScannerCamera(true));
  let pending!: Promise<void>;
  await act(() => {
    pending = result.current.startCamera();
  });
  await state('background');
  await act(async () => {
    request.resolve(response(true));
    await pending;
  });
  await state('active');
  expect(result.current.enabled).toBe(false);
  expect(result.current.mode).toBe('manual');
});
test('volver del diálogo de permiso Android conserva la solicitud explícita', async () => {
  const request = deferred<PermissionResponse>();
  mockRequestPermission.mockReturnValue(request.promise);
  const { result } = await renderHook(() => useScannerCamera(true));
  let pending!: Promise<void>;
  await act(() => {
    pending = result.current.startCamera();
  });
  await state('background');
  await state('active');
  await act(async () => {
    request.resolve(response(true));
    await pending;
  });
  expect(result.current.enabled).toBe(true);
});
test('la pausa transitoria de un permiso iOS no invalida su aceptación al volver', async () => {
  const request = deferred<PermissionResponse>();
  mockRequestPermission.mockReturnValue(request.promise);
  const { result } = await renderHook(() => useScannerCamera(true));
  let pending!: Promise<void>;
  await act(() => {
    pending = result.current.startCamera();
  });
  await state('inactive');
  await state('active');
  await act(async () => {
    request.resolve(response(true));
    await pending;
  });
  expect(result.current.enabled).toBe(true);
});
test('una consulta antigua no sobrescribe el permiso concedido más tarde', async () => {
  const read = deferred<PermissionResponse>();
  mockReadPermission.mockReturnValue(read.promise);
  const { result } = await renderHook(() => useScannerCamera(true));
  await act(() => result.current.startCamera());
  await act(() => read.resolve(response(false)));
  expect(result.current.permission?.granted).toBe(true);
  expect(result.current.enabled).toBe(true);
});
test('volver de ajustes actualiza el permiso y un fallo de cámara permite reintentar', async () => {
  const { result } = await renderHook(() => useScannerCamera(true));
  await state('background');
  mockReadPermission.mockResolvedValue(response(true));
  await state('active');
  expect(result.current.permission?.granted).toBe(true);
  expect(result.current.enabled).toBe(false);
  await act(() => result.current.startCamera());
  await act(() => result.current.mountError());
  expect(result.current.enabled).toBe(false);
  expect(result.current.error).toMatch(/no está disponible/);
  await act(() => result.current.startCamera());
  expect(result.current.enabled).toBe(true);
  expect(result.current.error).toBe('');
});
test('desmontar retira la suscripción y descarta las respuestas pendientes', async () => {
  const request = deferred<PermissionResponse>();
  mockRequestPermission.mockReturnValue(request.promise);
  const { result, unmount } = await renderHook(() => useScannerCamera(true));
  let pending!: Promise<void>;
  await act(() => {
    pending = result.current.startCamera();
  });
  await unmount();
  expect(remove).toHaveBeenCalled();
  await act(async () => {
    request.resolve(response(true));
    await pending;
  });
});
test('abrir el panel de notificaciones Android apaga cámara y linterna sin un cambio de AppState', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  const { result } = await renderHook(() => useScannerCamera(true));
  await act(() => result.current.startCamera());
  await act(() => result.current.toggleTorch());
  await act(() => blur());
  expect(AppState.currentState).toBe('active');
  expect(result.current.enabled).toBe(false);
  expect(result.current.torch).toBe(false);
  expect(result.current.mode).toBe('manual');
});
