import { Image, Text, View } from 'react-native';
import { usePalette } from './theme';

export function Brand() {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <Image
        source={require('../../assets/images/brand-mark.png')}
        accessible={false}
        style={{ width: 30, height: 30 }}
      />
      <Text style={{ color: c.ink, fontWeight: '700', fontSize: 20, letterSpacing: -0.5 }}>
        SinGluten
      </Text>
      <Text style={{ color: c.muted, fontSize: 12, marginLeft: 'auto' }}>Sin cuenta</Text>
    </View>
  );
}
