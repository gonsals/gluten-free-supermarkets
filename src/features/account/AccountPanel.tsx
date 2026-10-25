import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import type { User } from 'firebase/auth';
import { config } from '@/src/shared/config';
import { library } from '@/src/data/repositories';
import { Action, Card, Copy, Field, Notice } from '@/src/shared/ui';
import { Confirm } from '@/src/shared/Confirm';

export function AccountPanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!config.cloudEnabled) return;
    let disposed = false;
    let stop: (() => void) | undefined;
    void Promise.all([import('firebase/auth'), import('@/src/data/firebase/client')])
      .then(([authModule, client]) => {
        if (!disposed)
          stop = authModule.onAuthStateChanged(client.getCloud().auth, (current) => {
            setUser(current);
            setAdmin(false);
            if (current)
              void current
                .getIdTokenResult()
                .then((result) => {
                  if (!disposed && client.getCloud().auth.currentUser?.uid === current.uid)
                    setAdmin(result.claims.admin === true);
                })
                .catch(() => undefined);
          });
      })
      .catch(() => {
        if (!disposed)
          setMessage('No se ha podido conectar la cuenta. La biblioteca local sigue disponible.');
      });
    return () => {
      disposed = true;
      stop?.();
    };
  }, []);
  async function run(action: 'login' | 'register' | 'reset' | 'logout' | 'sync' | 'delete') {
    setBusy(true);
    setMessage('');
    try {
      const authModule = await import('firebase/auth');
      const { getCloud } = await import('@/src/data/firebase/client');
      const { auth, functions } = getCloud();
      if (action === 'login' || action === 'register') {
        await library.load();
        if (!library.getSnapshot().ready)
          throw new Error('Abre o recupera tu biblioteca local antes de vincular una cuenta.');
        if (action === 'register' && password.length < 12)
          throw new Error('Utiliza una contraseña de al menos 12 caracteres.');
        const credential =
          action === 'login'
            ? await authModule.signInWithEmailAndPassword(auth, email.trim(), password)
            : await authModule.createUserWithEmailAndPassword(auth, email.trim(), password);
        const owner = library.getSnapshot().data.cloudOwner;
        if (owner && owner !== credential.user.uid) {
          await authModule.signOut(auth);
          throw new Error(
            'Esta biblioteca está vinculada a otra cuenta. Exporta y borra los datos locales antes de cambiar de cuenta.',
          );
        }
        if (action === 'register') await authModule.sendEmailVerification(credential.user);
        setPassword('');
        setMessage(
          action === 'register'
            ? 'Cuenta creada. Revisa tu correo para verificarla.'
            : 'Sesión iniciada. Sincronizar favoritos requiere pulsar el botón correspondiente.',
        );
      }
      if (action === 'reset') {
        await authModule.sendPasswordResetEmail(auth, email.trim());
        setMessage(
          'Si existe una cuenta con ese correo, recibirás las instrucciones de recuperación.',
        );
      }
      if (action === 'logout') {
        await authModule.signOut(auth);
        setMessage('Sesión cerrada. Los datos locales permanecen en este dispositivo.');
      }
      if (action === 'sync') {
        const { syncFavorites } = await import('@/src/data/firebase/favorites');
        const result = await syncFavorites();
        setMessage(
          `${result.count} favoritos sincronizados. No se ha subido tu historial de consultas.`,
        );
      }
      if (action === 'delete') {
        if (!auth.currentUser || !password)
          throw new Error('Escribe tu contraseña actual para confirmar la eliminación.');
        await authModule.reauthenticateWithCredential(
          auth.currentUser,
          authModule.EmailAuthProvider.credential(auth.currentUser.email ?? '', password),
        );
        const { httpsCallable } = await import('firebase/functions');
        await httpsCallable(functions, 'deleteMyAccount')({});
        await authModule.signOut(auth);
        await library.clearAll();
        setPassword('');
        setConfirm(false);
        setMessage('Cuenta y datos locales eliminados.');
      }
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      setMessage(
        code.startsWith('auth/')
          ? 'No se ha podido completar la operación. Comprueba tus credenciales, conexión y configuración de autenticación.'
          : code.startsWith('functions/')
            ? 'El servicio remoto no ha completado la operación. Comprueba que está desplegado y vuelve a intentarlo.'
            : error instanceof Error
              ? error.message
              : 'No se ha podido completar la operación.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (!config.cloudEnabled)
    return (
      <Card>
        <Copy>Sincronización opcional</Copy>
        <Copy muted>
          La nube está desactivada en esta instalación. No necesitas una cuenta para consultar
          productos, guardar favoritos o anotar precios.
        </Copy>
      </Card>
    );
  return (
    <Card>
      <Copy>{user ? `Cuenta: ${user.email}` : 'Cuenta y sincronización opcional'}</Copy>
      <Copy muted>
        Solo se sincronizan tus favoritos cuando lo solicitas. El historial y las anotaciones
        privadas se quedan en este dispositivo.
      </Copy>
      {user ? (
        <>
          <Action title="Sincronizar favoritos" onPress={() => void run('sync')} busy={busy} />
          {admin ? (
            <Action
              title="Revisar contribuciones de precios"
              secondary
              onPress={() => router.push('/moderation')}
              disabled={busy}
            />
          ) : null}
          <Action
            title="Cerrar sesión"
            secondary
            onPress={() => void run('logout')}
            disabled={busy}
          />
          <Field
            label="Contraseña actual para eliminar cuenta"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoComplete="current-password"
          />
          <Action
            title="Eliminar cuenta y sus datos"
            secondary
            danger
            onPress={() => setConfirm(true)}
            disabled={busy}
          />
        </>
      ) : (
        <>
          <Field
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            maxLength={254}
          />
          <Field
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            maxLength={128}
          />
          <Action title="Iniciar sesión" onPress={() => void run('login')} busy={busy} />
          <Action
            title="Crear cuenta"
            secondary
            onPress={() => void run('register')}
            disabled={busy}
          />
          <Action
            title="Recuperar contraseña"
            secondary
            onPress={() => void run('reset')}
            disabled={busy || !email.trim()}
          />
        </>
      )}
      {message ? <Notice>{message}</Notice> : null}
      <Confirm
        title="Eliminar cuenta"
        visible={confirm}
        message="Se eliminarán tu cuenta, favoritos remotos, contribuciones asociadas y los datos de este dispositivo. Esta operación no puede deshacerse."
        onCancel={() => setConfirm(false)}
        onConfirm={() => void run('delete')}
        busy={busy}
      />
    </Card>
  );
}
