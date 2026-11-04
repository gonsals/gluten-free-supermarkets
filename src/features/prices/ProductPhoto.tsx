import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { light, usePalette } from '@/src/shared/theme';
import { useDisclosureVisible } from '@/src/shared/Disclosure';

/** The source photo belongs to this SKU/GTIN; never substitute a similar product. */
export function ProductPhoto({ uri, name }: { uri?: string; name: string }) {
  const c = usePalette();
  const visible = useDisclosureVisible();
  const [failed, setFailed] = useState<string>();
  const [loaded, setLoaded] = useState<string>();
  const available = Boolean(uri && failed !== uri && visible);
  return (
    <View
      style={{
        width: 76,
        minHeight: 84,
        paddingVertical: 8,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: available ? '#FFFFFF' : c.soft,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {!available || loaded !== uri ? (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={available ? `Cargando foto de ${name}` : `Sin foto de ${name}`}
          style={{ alignItems: 'center', gap: 4, maxWidth: 70 }}
        >
          <Ionicons
            name="image-outline"
            size={26}
            color={available ? light.muted : c.muted}
            accessible={false}
          />
          <Text
            style={{
              color: available ? light.muted : c.muted,
              fontSize: 12,
              lineHeight: 16,
              textAlign: 'center',
              maxWidth: 70,
            }}
          >
            {available ? 'Foto' : 'Sin foto'}
          </Text>
        </View>
      ) : null}
      {available ? (
        <Image
          source={{ uri: uri! }}
          accessibilityLabel={`Foto de ${name}`}
          resizeMode="contain"
          style={{ position: 'absolute', width: 76, height: 84, opacity: loaded === uri ? 1 : 0 }}
          onLoad={() => setLoaded(uri)}
          onError={() => setFailed(uri)}
        />
      ) : null}
    </View>
  );
}
