import { useState } from 'react';
import { View } from 'react-native';
import { operationId } from '@/src/data/local/library';
import { normalizeBarcode } from '@/src/domain/barcode';
import { isAlternativeGroups, type AlternativeGroup } from '@/src/domain/alternatives';
import { parseMeasure, SCALE, type InputUnit } from '@/src/domain/measure';
import { Action, Card, Copy, Field } from '@/src/shared/ui';

export function MeasureFields({
  prefix,
  amount,
  unit,
  count,
  onAmount,
  onUnit,
  onCount,
}: {
  prefix: string;
  amount: string;
  unit: InputUnit;
  count?: string;
  onAmount: (s: string) => void;
  onUnit: (u: InputUnit) => void;
  onCount?: (s: string) => void;
}) {
  return (
    <>
      <Field
        label={prefix}
        value={amount}
        onChangeText={onAmount}
        keyboardType="decimal-pad"
        maxLength={16}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['kg', 'g', 'l', 'ml', 'unit'] as const).map((u) => (
          <Action
            key={u}
            title={u === 'unit' ? 'unidades' : u}
            accessibilityLabel={`${prefix}: ${u}`}
            selected={u === unit}
            secondary={u !== unit}
            onPress={() => onUnit(u)}
          />
        ))}
      </View>
      {onCount ? (
        <Field
          label={`${prefix}: componentes del pack`}
          value={count}
          onChangeText={onCount}
          keyboardType="number-pad"
          maxLength={2}
        />
      ) : null}
    </>
  );
}
export function AlternativeEditor({
  initial,
  onSave,
  onCancel,
  busy,
}: {
  initial: AlternativeGroup | null;
  onSave: (group: AlternativeGroup) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [need, setNeed] = useState(String((initial?.required.quantity ?? SCALE) / SCALE));
  const [unit, setUnit] = useState<InputUnit>(initial?.required.unit ?? 'kg');
  const [gluten, setGluten] = useState(initial?.glutenFreeOnly ?? false);
  const [members, setMembers] = useState(
    () =>
      initial?.members.map((m) => ({
        barcode: m.barcode,
        amount: String(m.pack.quantity / SCALE),
        unit: m.pack.unit as InputUnit,
        count: '1',
      })) ?? [{ barcode: '', amount: '', unit: 'g' as InputUnit, count: '1' }],
  );
  const [invalid, setInvalid] = useState('');
  function update(i: number, value: Partial<(typeof members)[number]>) {
    setMembers((items) => items.map((item, index) => (index === i ? { ...item, ...value } : item)));
  }
  function save() {
    try {
      const group: AlternativeGroup = {
        id: initial?.id ?? operationId(),
        name: name.trim(),
        required: parseMeasure(need, unit),
        glutenFreeOnly: gluten,
        members: members.map((m) => ({
          barcode: normalizeBarcode(m.barcode),
          pack: parseMeasure(m.amount, m.unit, m.count),
        })),
      };
      if (!isAlternativeGroups([group]))
        throw new Error('Revisa el nombre, códigos distintos y unidades compatibles.');
      setInvalid('');
      onSave(group);
    } catch (e) {
      setInvalid(
        e instanceof Error && e.message !== 'invalid_barcode'
          ? e.message
          : 'Revisa los códigos de barras.',
      );
    }
  }
  return (
    <Card>
      <Copy>{initial ? 'Editar grupo' : 'Nuevo grupo de alternativas'}</Copy>
      <Copy muted>
        Confirma qué productos puedes sustituir entre sí y el contenido total de cada envase. El
        primero corresponde a la línea original de tu cesta. La cantidad necesaria es tu decisión;
        no se deduce del nombre ni de la receta.
      </Copy>
      <Field label="Nombre del grupo" value={name} onChangeText={setName} maxLength={100} />
      <MeasureFields
        prefix="Cantidad que necesito"
        amount={need}
        unit={unit}
        onAmount={setNeed}
        onUnit={setUnit}
      />
      <Action
        title="Solo con declaración sin gluten"
        selected={gluten}
        secondary={!gluten}
        onPress={() => setGluten((v) => !v)}
      />
      <Copy muted>
        Este filtro exige una declaración en la ficha guardada y excluye contradicciones. Consulta
        siempre las trazas, fuente y fecha; no confirma aptitud.
      </Copy>
      {members.map((m, i) => (
        <Card key={i}>
          <Copy>{i === 0 ? 'Producto original' : `Alternativa ${i}`}</Copy>
          <Field
            label={`Código del producto ${i + 1}`}
            value={m.barcode}
            onChangeText={(barcode) => update(i, { barcode })}
            keyboardType="number-pad"
            maxLength={24}
          />
          <MeasureFields
            prefix={`Contenido del producto ${i + 1}`}
            amount={m.amount}
            unit={m.unit}
            count={m.count}
            onAmount={(amount) => update(i, { amount })}
            onUnit={(unit) => update(i, { unit })}
            onCount={(count) => update(i, { count })}
          />
          {i > 0 ? (
            <Action
              title={`Quitar alternativa ${i}`}
              secondary
              onPress={() => setMembers((items) => items.filter((_, n) => n !== i))}
            />
          ) : null}
        </Card>
      ))}
      {members.length < 10 ? (
        <Action
          title="Añadir alternativa al grupo"
          secondary
          onPress={() =>
            setMembers((items) => [...items, { barcode: '', amount: '', unit: 'g', count: '1' }])
          }
        />
      ) : null}
      {invalid ? <Copy>{invalid}</Copy> : null}
      <Action title="Confirmar y guardar grupo" busy={busy} onPress={save} />
      <Action title="Cancelar edición" secondary disabled={busy} onPress={onCancel} />
    </Card>
  );
}
