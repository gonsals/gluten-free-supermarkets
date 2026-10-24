import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLibrary } from '@/src/features/library/useLibrary';
import { ProductRow } from '@/src/features/library/ProductRow';
import { Action, Card, Copy, Field, Heading, Notice, Screen } from '@/src/shared/ui';
import { Confirm } from '@/src/shared/Confirm';
import { usePalette } from '@/src/shared/theme';

export default function LibraryScreen() {
  const { ready, data, error, repository } = useLibrary();
  const c = usePalette();
  const [tab, setTab] = useState<'favorites' | 'history'>('favorites');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const favorites = Object.values(data.favorites)
    .filter((x) => !x.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const entries = tab === 'favorites' ? favorites : data.history;
  const normalized = query.trim().toLocaleLowerCase('es');
  const matches = entries.filter((x) =>
    `${x.name} ${x.brands} ${x.barcode}`.toLocaleLowerCase('es').includes(normalized),
  );
  async function clear() {
    try {
      await repository.clearHistory();
      setConfirm(false);
    } catch {
      setMessage('No se ha podido borrar el historial. Vuelve a intentarlo.');
    }
  }
  return (
    <Screen>
      <Heading eyebrow="Siempre a mano">Tu biblioteca</Heading>
      <Copy muted>
        Favoritos e historial se guardan en este dispositivo y se pueden consultar sin conexión.
      </Copy>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Action
            title={`Favoritos (${favorites.length})`}
            secondary={tab !== 'favorites'}
            onPress={() => {
              setTab('favorites');
              setLimit(20);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Action
            title={`Historial (${data.history.length})`}
            secondary={tab !== 'history'}
            onPress={() => {
              setTab('history');
              setLimit(20);
            }}
          />
        </View>
      </View>
      <Field
        label="Buscar en mi biblioteca"
        placeholder="Nombre, marca o código"
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setLimit(20);
        }}
      />
      {!ready && !error ? <ActivityIndicator color={c.accent} /> : null}
      {error ? <Notice error>{error}</Notice> : null}
      {message ? <Notice error>{message}</Notice> : null}
      <Card>
        {matches.length ? (
          matches
            .slice(0, limit)
            .map((entry) => (
              <ProductRow
                key={'id' in entry ? String(entry.id) : entry.barcode}
                product={entry}
                date={'scannedAt' in entry ? String(entry.scannedAt) : undefined}
              />
            ))
        ) : (
          <>
            <Text style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>
              {query
                ? 'Sin coincidencias'
                : tab === 'favorites'
                  ? 'Aún no tienes favoritos'
                  : 'Tu historial está vacío'}
            </Text>
            <Copy muted>
              {query
                ? 'Prueba con otro nombre, marca o código.'
                : tab === 'favorites'
                  ? 'Abre un producto y pulsa Guardar en favoritos.'
                  : 'Las consultas aparecerán aquí cuando busques tu primer producto.'}
            </Copy>
          </>
        )}
      </Card>
      {matches.length > limit ? (
        <Action title="Mostrar 20 más" secondary onPress={() => setLimit((value) => value + 20)} />
      ) : null}
      {tab === 'history' && data.history.length ? (
        <Action title="Borrar historial" secondary danger onPress={() => setConfirm(true)} />
      ) : null}
      <Confirm
        visible={confirm}
        message="Se borrará el historial de este dispositivo. Tus favoritos y precios se conservarán."
        onCancel={() => setConfirm(false)}
        onConfirm={() => void clear()}
      />
    </Screen>
  );
}
