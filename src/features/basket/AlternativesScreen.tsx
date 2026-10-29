import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useLibrary } from '@/src/features/library/useLibrary';
import { useCachedProduct } from '@/src/features/products/useCachedProduct';
import {
  compareAlternative,
  hasPositiveGlutenEvidence,
  type AlternativeGroup,
  type AlternativeMember,
} from '@/src/domain/alternatives';
import { measureText, perUnitMilli, requiredPackages } from '@/src/domain/measure';
import { privateQuotes, quoteMoney } from '@/src/domain/comparison';
import { glutenCopy } from '@/src/domain/product';
import { missingCopy } from '@/src/domain/basketComparison';
import { sameGtin } from '@/src/domain/barcode';
import { Action, Card, Copy, Heading, Notice, Screen } from '@/src/shared/ui';
import { Confirm } from '@/src/shared/Confirm';
import { AlternativeEditor } from './AlternativeEditor';

function MemberEstimate({
  group,
  member,
  now,
  onChoose,
  busy,
}: {
  group: AlternativeGroup;
  member: AlternativeMember;
  now: number;
  busy: boolean;
  onChoose: (barcode: string, message: string) => void;
}) {
  const { data } = useLibrary(),
    router = useRouter();
  const [limit, setLimit] = useState(10);
  const product = useCachedProduct(
    Object.keys(data.cache).find((code) => sameGtin(code, member.barcode)) ?? member.barcode,
  );
  const requirement = requiredPackages(group.required, member.pack)!;
  const excluded = group.glutenFreeOnly && !hasPositiveGlutenEvidence(product);
  const results = compareAlternative(group, member, data.branches, privateQuotes(data.prices), {
    recentOnly: true,
    includeOffers: false,
    publicSpainOnly: true,
    location: '',
    now,
  });
  const best = results.find((r) => r.quote && r.subtotalMilli !== null);
  const unitMilli = best ? perUnitMilli(best.quote!.amountMilli, member.pack) : null;
  return (
    <Card>
      <Heading>{product?.name ?? member.barcode}</Heading>
      <Copy>
        {measureText(member.pack)} por envase · necesitas {requirement.packages} envases.
      </Copy>
      <Copy>Sobrante: {measureText(requirement.surplus)}.</Copy>
      {product ? (
        <>
          <Copy>{glutenCopy[product.assessment.state].title}</Copy>
          <Copy muted>
            Fuente: Open Food Facts · consultada{' '}
            {new Date(product.source.fetchedAt).toLocaleDateString('es-ES')} · actualizada{' '}
            {product.source.updatedAt
              ? new Date(product.source.updatedAt).toLocaleDateString('es-ES')
              : 'sin fecha'}
            .
          </Copy>
          <Copy muted>
            Trazas declaradas:{' '}
            {product.assessment.traceWarnings.join(', ') ||
              product.tracesText ||
              'sin detalle; no significa ausencia de trazas'}
            .
          </Copy>
        </>
      ) : (
        <Copy muted>Sin ficha guardada: la información sobre gluten es desconocida.</Copy>
      )}
      {excluded ? (
        <Notice>
          Fuera del filtro: falta una declaración sin gluten sin contradicciones. Puedes revisar la
          ficha.
        </Notice>
      ) : null}
      {requirement.packages > 99 ? (
        <Notice>Supera el límite de 99 envases; reduce la cantidad necesaria.</Notice>
      ) : null}
      {!excluded && best ? (
        <Copy>
          Menor desembolso observado: {quoteMoney(best.subtotalMilli!)} en {best.branch.name}.
          Precio por {member.pack.unit === 'unit' ? 'unidad' : member.pack.unit}:{' '}
          {unitMilli ? quoteMoney(unitMilli) : '<0,001 €'}.
        </Copy>
      ) : null}
      {!excluded && requirement.packages <= 99 && !best ? (
        <Notice>Sin precio elegible para calcular el desembolso.</Notice>
      ) : null}
      {!excluded
        ? results.slice(0, limit).map((r) => (
            <Card key={r.branch.id}>
              <Copy>
                {r.branch.name} · {r.branch.address}
              </Copy>
              {r.quote ? (
                <>
                  <Copy>
                    {requirement.packages} × {quoteMoney(r.quote.amountMilli)} ={' '}
                    {quoteMoney(r.subtotalMilli!)}.
                  </Copy>
                  <Copy muted>
                    Anotación privada · {new Date(r.quote.observedAt).toLocaleDateString('es-ES')} ·
                    sin oferta ni notas condicionales.
                  </Copy>
                  {r.lines[0].conflict ? (
                    <Copy muted>
                      Las referencias vinculadas difieren. Se usa la más reciente, no la más barata.
                    </Copy>
                  ) : null}
                  <Action
                    title={`Elegir ${member.barcode} en ${r.branch.name}`}
                    secondary
                    disabled={
                      busy ||
                      !data.basket.some((l) => sameGtin(l.barcode, group.members[0].barcode))
                    }
                    onPress={() =>
                      onChoose(
                        member.barcode,
                        `Sustituirás la línea ${group.members[0].barcode} completa por ${requirement.packages} envases de ${member.barcode}. Necesidad confirmada: ${measureText(group.required)}; sobrante: ${measureText(requirement.surplus)}. Estimación: ${quoteMoney(r.subtotalMilli!)} en ${r.branch.name}, ${r.branch.address}. La cesta guarda productos y envases; no reserva tienda, precio ni existencias.`,
                      )
                    }
                  />
                </>
              ) : (
                <Copy muted>
                  {r.formatConflict
                    ? 'El formato anotado en el precio contradice el del grupo. Corrige el grupo o registra el precio con el formato correcto.'
                    : missingCopy[r.lines[0].reason ?? 'missing']}
                  . No se asigna precio cero.
                </Copy>
              )}
            </Card>
          ))
        : null}
      {!excluded && results.length > limit ? (
        <Action
          title={`Mostrar más sucursales de ${member.barcode}`}
          secondary
          onPress={() => setLimit((v) => v + 10)}
        />
      ) : null}
      <Action
        title={`Consultar ficha y precios de ${member.barcode}`}
        secondary
        onPress={() =>
          router.push({ pathname: '/prices/[barcode]', params: { barcode: member.barcode } })
        }
      />
      {product ? (
        <Action
          title={`Revisar evidencia de ${member.barcode}`}
          secondary
          onPress={() =>
            router.push({ pathname: '/product/[barcode]', params: { barcode: member.barcode } })
          }
        />
      ) : null}
    </Card>
  );
}
export function AlternativesScreen() {
  const { ready, data, error, repository } = useLibrary();
  const router = useRouter();
  const [editor, setEditor] = useState<AlternativeGroup | 'new' | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    locked = useRef(false);
  const [message, setMessage] = useState(''),
    [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState<{
    group: AlternativeGroup;
    barcode?: string;
    message: string;
    revision: number;
  } | null>(null);
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      const timer = setInterval(() => setNow(Date.now()), 60000);
      return () => {
        clearInterval(timer);
        setPending(null);
      };
    }, []),
  );
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    try {
      await action();
      setFailed(false);
      setMessage('Cambios guardados en este dispositivo.');
      setEditor(null);
      setPending(null);
    } catch (e) {
      setFailed(true);
      setMessage(
        e instanceof Error && e.message !== 'storage_error'
          ? e.message
          : 'No se han podido guardar los cambios.',
      );
      setPending(null);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const group = data.groups.find((g) => g.id === selected);
  return (
    <Screen>
      <Heading eyebrow="Planifica tu compra">Formatos y alternativas</Heading>
      <Copy muted>
        Compara productos que tú has confirmado como sustitutos. El precio por unidad y el
        desembolso por envases enteros responden a preguntas distintas. Redondeamos el precio
        unitario a tres decimales; el coste conserva la precisión de las observaciones.
      </Copy>
      <Copy muted>
        Esta vista usa anotaciones privadas de los últimos 7 días, sin ofertas ni notas, en
        sucursales identificadas. No consulta precios públicos automáticamente. El alcance es la
        muestra guardada; no confirma disponibilidad ni ahorro real.
      </Copy>
      <Action title="Volver a mi cesta" secondary onPress={() => router.push('/basket')} />
      {!ready ? (
        <Notice error={Boolean(error)}>{error ?? 'Cargando tu biblioteca…'}</Notice>
      ) : (
        <>
          {message ? <Notice error={failed}>{message}</Notice> : null}
          <Action
            title="Crear grupo de alternativas"
            disabled={busy || data.groups.length >= 20}
            onPress={() => {
              setEditor('new');
              setMessage('');
            }}
          />
          {editor ? (
            <AlternativeEditor
              key={editor === 'new' ? 'new' : JSON.stringify(editor)}
              initial={editor === 'new' ? null : editor}
              busy={busy}
              onCancel={() => setEditor(null)}
              onSave={(g) =>
                void run(async () => {
                  await repository.saveAlternativeGroup(g, editor === 'new' ? null : editor);
                  setSelected(g.id);
                })
              }
            />
          ) : null}
          {!data.groups.length ? (
            <Notice>
              Aún no has confirmado alternativas. Puedes guardar hasta 20 grupos y 10 productos por
              grupo.
            </Notice>
          ) : null}
          {data.groups.map((g) => (
            <Action
              key={g.id}
              title={`Comparar grupo ${g.name}`}
              secondary
              selected={g.id === selected}
              onPress={() => setSelected(g.id)}
            />
          ))}
          {group ? (
            <>
              <Heading>{group.name}</Heading>
              <Copy>Necesidad confirmada: {measureText(group.required)}.</Copy>
              {!data.basket.some((l) => sameGtin(l.barcode, group.members[0].barcode)) ? (
                <Notice>
                  El producto original no está en tu cesta. Puedes revisar el grupo; para aplicar
                  una sustitución debe estar presente.
                </Notice>
              ) : null}
              <Action
                title="Editar formatos y alternativas"
                secondary
                disabled={busy}
                onPress={() => setEditor(group)}
              />
              <Action
                title="Eliminar grupo"
                secondary
                danger
                disabled={busy}
                onPress={() =>
                  setPending({
                    group,
                    revision: data.revision,
                    message: `Se eliminará el grupo ${group.name}. Los productos, precios y cesta se conservarán.`,
                  })
                }
              />
              {group.members.map((member) => (
                <MemberEstimate
                  key={member.barcode}
                  group={group}
                  member={member}
                  now={now}
                  busy={busy}
                  onChoose={(barcode, message) =>
                    setPending({ group, barcode, message, revision: data.revision })
                  }
                />
              ))}
            </>
          ) : null}
        </>
      )}
      <Confirm
        visible={Boolean(pending)}
        title={pending?.barcode ? 'Confirmar sustitución' : 'Eliminar grupo'}
        message={pending?.message ?? ''}
        busy={busy}
        confirmLabel={pending?.barcode ? 'Sustituir en mi cesta' : 'Confirmar eliminación'}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending)
            void run(() =>
              pending.barcode
                ? repository.substituteBasket(pending.group, pending.barcode, pending.revision)
                : repository.deleteAlternativeGroup(pending.group),
            );
        }}
      />
    </Screen>
  );
}
