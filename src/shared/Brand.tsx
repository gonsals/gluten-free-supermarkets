import { Image, Text, View } from 'react-native';
import { usePalette } from './theme';

export function Brand() {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <Image
        source={require('../../assets/images/brand-mark.png')}
        accessible={false}
        style={{ width: 38, height: 38 }}
      />
      <Text style={{ color: c.ink, fontWeight: '700', fontSize: 23, letterSpacing: -0.7 }}>
        SinGluten
      </Text>
      <Text style={{ color: c.muted, fontSize: 12, marginLeft: 'auto' }}>Sin cuenta</Text>
    </View>
  );
}
