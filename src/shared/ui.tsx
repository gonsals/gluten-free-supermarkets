import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { typography, usePalette } from './theme';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const colors = usePalette();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <View style={styles.content}>{children}</View>
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}
export function Heading({
  children,
  eyebrow,
  hero = false,
}: PropsWithChildren<{ eyebrow?: string; hero?: boolean }>) {
  const c = usePalette();
  return (
    <View style={{ gap: 8, marginBottom: 8 }}>
      {eyebrow ? (
        <Text style={{ color: c.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1.4 }}>
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}
      <Text
        accessibilityRole="header"
        style={{
          color: c.ink,
          fontFamily: typography.editorial,
          fontWeight: '400',
          fontSize: hero ? 42 : 32,
          lineHeight: hero ? 48 : 40,
          letterSpacing: -0.6,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
export function Copy({ children, muted = false }: PropsWithChildren<{ muted?: boolean }>) {
  const c = usePalette();
  return (
    <Text style={{ color: muted ? c.muted : c.ink, fontSize: 16, lineHeight: 24 }}>{children}</Text>
  );
}
export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const c = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>
      {children}
    </View>
  );
}
export function Action({
  title,
  onPress,
  icon,
  secondary = false,
  disabled = false,
  busy = false,
  danger = false,
  selected,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  danger?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  const c = usePalette();
  const foreground = secondary ? (danger ? c.danger : c.ink) : c.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{
        disabled: disabled || busy,
        busy,
        ...(Platform.OS === 'web' ? {} : { selected }),
      }}
      {...(Platform.OS === 'web' ? { 'aria-pressed': selected } : {})}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: secondary ? (danger ? c.dangerBg : c.surface) : c.accent,
          borderColor: secondary ? (danger ? c.dangerBorder : c.border) : c.accent,
          opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={21}
          color={foreground}
          accessible={false}
          importantForAccessibility="no"
        />
      ) : null}
      <Text
        style={{
          color: foreground,
          fontSize: 16,
          fontWeight: '700',
          flexShrink: 1,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: boolean }) {
  const c = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.ink, fontWeight: '600', fontSize: 14 }}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={c.muted}
        style={[
          styles.input,
          { color: c.ink, backgroundColor: c.surface, borderColor: error ? c.danger : c.border },
          props.style,
        ]}
      />
    </View>
  );
}
export function Notice({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  const c = usePalette();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: error ? c.warningBorder : c.border,
        backgroundColor: error ? c.warningBg : c.soft,
      }}
    >
      <Text style={{ color: error ? c.warning : c.ink, fontSize: 14, lineHeight: 21 }}>
        {children}
      </Text>
    </View>
  );
}
export const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 22, paddingTop: 28, paddingBottom: 40 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 20 },
  card: { padding: 20, borderRadius: 10, borderWidth: 1, gap: 16 },
  action: {
    minHeight: 50,
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  input: { borderWidth: 1, borderRadius: 6, minHeight: 50, padding: 13, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
});
