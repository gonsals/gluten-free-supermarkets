import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, Linking, Text, View } from 'react-native';
import { glutenCopy, type Product } from '@/src/domain/product';
import { displayTag, traceDescription } from '@/src/domain/display';
import { AppError, errorCopy } from '@/src/domain/errors';
import { useLibrary } from '@/src/features/library/useLibrary';
import { Action, Card, Copy, Notice } from '@/src/shared/ui';
import { assessmentColor, usePalette } from '@/src/shared/theme';

export function ProductCard({
  product,
  cached = false,
  onRefresh,
  refreshing = false,
  refreshError,
  onPrices,
}: {
  product: Product;
  cached?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshError?: string;
  onPrices?: () => void;
}) {
  const c = usePalette();
  const { data, repository, ready } = useLibrary();
  const favorite = data.favorites[product.barcode] && !data.favorites[product.barcode].deleted;
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const copy = glutenCopy[product.assessment.state];
  const traces = traceDescription(product.assessment.traceWarnings, product.tracesText);
  const date = (value: string) => new Date(value).toLocaleString('es-ES');
  async function toggle() {
    setSaving(true);
    setMessage('');
    try {
      await repository.toggleFavorite(product);
    } catch (error) {
      setMessage(
        error instanceof AppError
          ? errorCopy[error.code]
          : error instanceof Error
            ? error.message
            : errorCopy.storage_error,
      );
    } finally {
      setSaving(false);
    }
  }
  async function openSource() {
    try {
      await Linking.openURL(product.source.url);
    } catch {
      setMessage('No se ha podido abrir la fuente. Inténtalo de nuevo.');
    }
  }
  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          {product.imageUrl ? (
            <Image
              accessibilityLabel={`Imagen de ${product.name ?? 'producto'}`}
              source={{ uri: product.imageUrl }}
              style={{ width: 80, height: 100, borderRadius: 10 }}
              resizeMode="contain"
            />
          ) : (
            <Ionicons name="basket-outline" size={42} color={c.muted} />
          )}
          <View style={{ flex: 1, gap: 5 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 23, lineHeight: 29, fontWeight: '800', color: c.ink }}
            >
              {product.name ?? 'Nombre no disponible'}
            </Text>
            <Copy muted>{product.brands.join(', ') || 'Marca no disponible'}</Copy>
            <Text selectable style={{ color: c.muted, fontSize: 13 }}>
              {product.barcode}
            </Text>
          </View>
        </View>
        <View style={{ padding: 16, backgroundColor: c.soft, borderRadius: 14, gap: 8 }}>
          <Ionicons
            name={copy.icon}
            size={28}
            color={assessmentColor(product.assessment.state, c)}
          />
          <Text
            accessibilityRole="header"
            style={{
              color: assessmentColor(product.assessment.state, c),
              fontSize: 20,
              fontWeight: '700',
            }}
          >
            {copy.title}
          </Text>
          <Copy>{copy.description}</Copy>
          {product.assessment.reasons.map((reason) => (
            <Text key={reason} style={{ color: c.muted, lineHeight: 21 }}>
              • {reason}
            </Text>
          ))}
        </View>
        {traces ? (
          <Notice error>
            La fuente declara trazas: {traces}. Esta información se conserva aunque figure una
            declaración sin gluten.
          </Notice>
        ) : null}
        <Action
          title={favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          icon={favorite ? 'heart' : 'heart-outline'}
          onPress={() => void toggle()}
          secondary
          disabled={!ready}
          busy={saving}
        />
        {onPrices ? (
          <Action
            title="Ver y anotar precios"
            onPress={onPrices}
            secondary
            icon="pricetags-outline"
          />
        ) : null}
        {message ? <Notice error>{message}</Notice> : null}
      </Card>
      <Card>
        <Text accessibilityRole="header" style={{ fontSize: 19, color: c.ink, fontWeight: '700' }}>
          Lo que dice la fuente
        </Text>
        <Copy muted>Ingredientes</Copy>
        <Copy>
          {product.ingredientsText ??
            'No disponibles. La ausencia de datos no confirma que el producto sea sin gluten.'}
        </Copy>
        <Copy muted>Alérgenos declarados</Copy>
        <Copy>
          {product.allergens.map(displayTag).join(', ') ||
            product.allergensText ||
            'Sin información concluyente'}
        </Copy>
        <Copy muted>Etiquetas</Copy>
        <Copy>{product.labels.map(displayTag).join(', ') || 'No hay etiquetas disponibles'}</Copy>
      </Card>
      <Card>
        <Copy>Datos de Open Food Facts</Copy>
        <Copy muted>
          {cached ? 'Ficha guardada en este dispositivo. ' : ''}Última consulta:{' '}
          {date(product.source.fetchedAt)}.
        </Copy>
        {product.source.updatedAt ? (
          <Copy muted>
            Modificación en la fuente: {date(product.source.updatedAt)}. No es una fecha de
            certificación.
          </Copy>
        ) : null}
        {product.source.environment === 'staging' ? (
          <Notice error>Datos del entorno de pruebas.</Notice>
        ) : null}
        <Copy muted>
          El etiquetado puede cambiar. Comprueba el envase; esta consulta describe información de la
          fuente.
        </Copy>
        <Action
          title="Consultar o corregir datos en la fuente"
          onPress={() => void openSource()}
          secondary
          icon="open-outline"
        />
        {refreshError ? <Notice error>{refreshError}</Notice> : null}
        {onRefresh ? (
          <Action
            title="Actualizar información"
            onPress={onRefresh}
            secondary
            busy={refreshing}
            icon="refresh"
          />
        ) : null}
      </Card>
    </>
  );
}
