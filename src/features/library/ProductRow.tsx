import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { ProductSummary } from '@/src/data/local/library';
import { glutenCopy } from '@/src/domain/product';
import { assessmentColor, usePalette } from '@/src/shared/theme';
import { AddToBasket } from '@/src/features/basket/AddToBasket';

export function ProductRow({
  product,
  date,
  allowBasket = false,
}: {
  product: ProductSummary;
  date?: string;
  allowBasket?: boolean;
}) {
  const router = useRouter();
  const c = usePalette();
  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${product.name}`}
        onPress={() =>
          router.push({
            pathname: '/product/[barcode]',
            params: { barcode: product.barcode, consultedAt: product.fetchedAt },
          })
        }
        style={({ pressed }) => ({
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderColor: c.border,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons
          name={glutenCopy[product.state].icon}
          size={26}
          color={assessmentColor(product.state, c)}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{product.name}</Text>
          <Text style={{ color: c.muted, fontSize: 13 }}>{product.brands || product.barcode}</Text>
          <Text style={{ color: assessmentColor(product.state, c), fontSize: 13 }}>
            {glutenCopy[product.state].title}
          </Text>
          {date ? (
            <Text style={{ color: c.muted, fontSize: 12 }}>
              {new Date(date).toLocaleString('es-ES')}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" color={c.muted} size={19} />
      </Pressable>
      {allowBasket ? <AddToBasket barcode={product.barcode} label={product.name} /> : null}
    </View>
  );
}
