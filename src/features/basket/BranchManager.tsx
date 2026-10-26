import { useRef, useState } from 'react';
import type { PriceQuote } from '@/src/domain/comparison';
import {
  referenceOf,
  referenceLabel,
  type BranchReference,
  type StoreBranch,
} from '@/src/domain/branches';
import { operationId } from '@/src/data/local/library';
import { useLibrary } from '@/src/features/library/useLibrary';
import { Action, Card, Copy, Field, Heading, Notice } from '@/src/shared/ui';
import { Confirm } from '@/src/shared/Confirm';

export function BranchManager({ quotes }: { quotes: PriceQuote[] }) {
  const locked = useRef(false);
  const { data, ready, repository } = useLibrary();
  const [selected, setSelected] = useState<BranchReference | null>(null);
  const [editing, setEditing] = useState<StoreBranch | null>(null);
  const [name, setName] = useState(''),
    [address, setAddress] = useState('');
  const [scope, setScope] = useState(false),
    [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''),
    [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const refs = new Map<string, BranchReference>();
  quotes.forEach((quote) => refs.set(quote.branchKey, referenceOf(quote)));
  data.branches.forEach((branch) => branch.references.forEach((ref) => refs.set(ref.key, ref)));
  const filtered = [...refs.values()].filter((ref) =>
    referenceLabel(ref).toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')),
  );
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    try {
      await action();
      setPending(null);
      setSelected(null);
      setEditing(null);
      setScope(false);
      setFailed(false);
      setMessage('Sucursales guardadas en este dispositivo.');
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : 'No se ha podido guardar la sucursal.');
      setPending(null);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function confirmLink(branch: StoreBranch) {
    if (!selected) return;
    const reference = selected;
    const previous =
      data.branches.find((item) => item.references.some((ref) => ref.key === reference.key))?.id ??
      null;
    setPending({
      title: 'Confirmar sucursal de la referencia',
      message: `${referenceLabel(reference)} se vinculará a ${branch.name}, ${branch.address}. Confirma que corresponde a esta sucursal física; una cadena o localidad por sí solas no bastan. Si tenía otro vínculo se sustituirá.`,
      action: () => repository.assignReference(reference, branch.id, previous),
    });
  }
  return (
    <>
      <Heading>Identificar establecimientos</Heading>
      <Copy muted>
        Indica la sucursal física que corresponde a cada referencia. No agrupamos automáticamente
        cadenas o localidades. Las referencias sin confirmar no completan una cesta. Confirma que
        todas las anotaciones de esa referencia corresponden a la misma sucursal. Si mezclan tiendas
        de una localidad, corrige su localización o déjalas sin vincular.
      </Copy>
      {message ? <Notice error={failed}>{message}</Notice> : null}
      <Field
        label="Buscar referencia de tienda"
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setLimit(20);
        }}
      />
      {filtered.slice(0, limit).map((ref) => {
        const assigned = data.branches.find((branch) =>
          branch.references.some((item) => item.key === ref.key),
        );
        const quote = quotes.find((q) => q.branchKey === ref.key);
        return (
          <Card key={ref.key}>
            <Copy>{referenceLabel(ref)}</Copy>
            {quote?.source === 'open_prices' ? (
              <Copy muted>
                {quote.store} · {quote.location}
              </Copy>
            ) : null}
            <Copy muted>
              {assigned
                ? `Confirmada por ti: ${assigned.name} · ${assigned.address}`
                : 'Sin sucursal confirmada'}
            </Copy>
            <Action
              title={`Identificar ${referenceLabel(ref)}`}
              secondary
              disabled={!ready || busy}
              onPress={() => {
                setSelected(ref);
                setEditing(null);
                setName('');
                setAddress('');
                setScope(false);
              }}
            />
            {assigned ? (
              <Action
                title={`Desvincular ${referenceLabel(ref)}`}
                secondary
                danger
                disabled={busy}
                onPress={() =>
                  setPending({
                    title: 'Desvincular referencia',
                    message:
                      'Esta referencia dejará de contar para la sucursal. No se borrarán sus precios.',
                    action: () => repository.assignReference(ref, null, assigned.id),
                  })
                }
              />
            ) : null}
          </Card>
        );
      })}
      {filtered.length > limit ? (
        <Action
          title="Mostrar 20 referencias más"
          secondary
          onPress={() => setLimit((value) => value + 20)}
        />
      ) : null}
      {selected || editing ? (
        <Card>
          <Copy>
            {selected ? `Referencia: ${referenceLabel(selected)}` : `Editar ${editing!.name}`}
          </Copy>
          <Field
            label="Nombre de la sucursal"
            value={name}
            maxLength={100}
            onChangeText={setName}
          />
          <Field
            label="Dirección concreta de la sucursal"
            value={address}
            maxLength={200}
            onChangeText={setAddress}
            placeholder="Calle, número y localidad"
          />
          <Action
            title="Confirmo que es una sucursal física concreta"
            selected={scope}
            secondary={!scope}
            onPress={() => setScope((value) => !value)}
          />
          <Action
            title={editing ? 'Guardar sucursal' : 'Crear sucursal con esta referencia'}
            disabled={!ready || busy || !scope || !name.trim() || !address.trim()}
            onPress={() =>
              void run(() =>
                repository.saveBranch(
                  {
                    id: editing?.id ?? operationId(),
                    name: name.trim(),
                    address: address.trim(),
                    references: editing?.references ?? (selected ? [selected] : []),
                  },
                  editing,
                ),
              )
            }
          />
          {selected
            ? data.branches.map((branch) => (
                <Action
                  key={branch.id}
                  title={`Vincular a ${branch.name} · ${branch.address}`}
                  secondary
                  disabled={busy}
                  onPress={() => confirmLink(branch)}
                />
              ))
            : null}
          <Action
            title="Cancelar edición de sucursal"
            secondary
            disabled={busy}
            onPress={() => {
              setSelected(null);
              setEditing(null);
            }}
          />
        </Card>
      ) : null}
      <Heading>Tus sucursales</Heading>
      {!data.branches.length ? (
        <Notice>
          Aún no has confirmado ninguna sucursal. Anota un precio o consulta precios públicos para
          identificar su referencia.
        </Notice>
      ) : null}
      {data.branches.map((branch) => (
        <Card key={branch.id}>
          <Copy>
            {branch.name} · {branch.address}
          </Copy>
          <Copy muted>Referencias vinculadas por ti: {branch.references.length}.</Copy>
          <Action
            title={`Editar ${branch.name}`}
            secondary
            disabled={busy}
            onPress={() => {
              setEditing(branch);
              setSelected(null);
              setName(branch.name);
              setAddress(branch.address);
              setScope(false);
            }}
          />
          <Action
            title={`Eliminar sucursal ${branch.name}`}
            secondary
            danger
            disabled={busy}
            onPress={() =>
              setPending({
                title: 'Eliminar sucursal',
                message:
                  'Se eliminará esta identificación y sus vínculos. Los precios originales y la cesta se conservarán.',
                action: () => repository.deleteBranch(branch),
              })
            }
          />
        </Card>
      ))}
      <Copy muted>
        Hasta 50 sucursales y 20 referencias por sucursal. Las identificaciones y vínculos se
        incluyen en tus copias; no se guardan los precios públicos.
      </Copy>
      <Confirm
        visible={pending !== null}
        title={pending?.title ?? 'Confirmar vínculo'}
        message={pending?.message ?? ''}
        confirmLabel="Confirmar cambio"
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void run(pending.action);
        }}
      />
    </>
  );
}
