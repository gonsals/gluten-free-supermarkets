import { fireEvent, render, screen } from '@testing-library/react-native';
import { Confirm } from '../Confirm';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

test('cancelar y confirmar son acciones distintas y el diálogo tiene título', async () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  await render(
    <Confirm
      visible
      title="Borrar historial"
      message="Solo se borrará el historial."
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
  expect(screen.getByRole('header', { name: 'Borrar historial' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar eliminación' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('durante el borrado bloquea pulsaciones repetidas y cierre con Atrás/Escape', async () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  const view = await render(
    <Confirm
      visible
      busy
      title="Borrar historial"
      message="Solo se borrará el historial."
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Confirmar eliminación' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar eliminación' }));
  await fireEvent(screen.getByLabelText('Borrar historial'), 'requestClose');
  expect(onConfirm).not.toHaveBeenCalled();
  expect(onCancel).not.toHaveBeenCalled();
  await view.rerender(
    <Confirm
      visible
      title="Borrar historial"
      message="Solo se borrará el historial."
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
  await fireEvent(screen.getByLabelText('Borrar historial'), 'requestClose');
  expect(onCancel).toHaveBeenCalledTimes(1);
});
