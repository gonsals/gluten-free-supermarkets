import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type PropsWithChildren } from 'react';
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
import { usePalette } from './theme';

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
  compact = false,
}: PropsWithChildren<{ eyebrow?: string; hero?: boolean; compact?: boolean }>) {
  const c = usePalette();
  return (
    <View style={{ gap: 6 }}>
      {eyebrow ? (
        <Text style={{ color: c.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1.4 }}>
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}
      <Text
        accessibilityRole="header"
        style={{
          color: c.ink,
          fontWeight: '700',
          fontSize: compact ? 20 : hero ? 34 : 28,
          lineHeight: compact ? 28 : hero ? 42 : 36,
          letterSpacing: -0.4,
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
  keepFocusWhileBusy = false,
  danger = false,
  selected,
  expanded,
  accessibilityLabel,
  quiet = false,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  secondary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  keepFocusWhileBusy?: boolean;
  danger?: boolean;
  selected?: boolean;
  expanded?: boolean;
  accessibilityLabel?: string;
  quiet?: boolean;
  style?: ViewStyle;
}) {
  const c = usePalette();
  const [focused, setFocused] = useState(false);
  const foreground = quiet ? c.accent : secondary ? (danger ? c.danger : c.ink) : c.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityState={{
        disabled: disabled || busy,
        busy,
        ...(expanded === undefined ? {} : { expanded }),
        ...(Platform.OS === 'web' ? {} : { selected }),
      }}
      {...(Platform.OS === 'web'
        ? { 'aria-pressed': selected, 'aria-expanded': expanded, 'aria-busy': busy }
        : {})}
      // Quantity steppers stay focusable during a write; the handler still blocks re-entry.
      disabled={disabled || (busy && !keepFocusWhileBusy)}
      onPress={() => {
        if (!disabled && !busy) onPress();
      }}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: quiet
            ? 'transparent'
            : secondary
              ? danger
                ? c.dangerBg
                : c.surface
              : c.accent,
          borderColor: quiet
            ? 'transparent'
            : secondary
              ? danger
                ? c.dangerBorder
                : c.border
              : c.accent,
          opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1,
        },
        quiet ? { paddingHorizontal: 4, paddingVertical: 8, justifyContent: 'flex-start' } : null,
        focused
          ? { outlineColor: c.accent, outlineWidth: 3, outlineStyle: 'solid', outlineOffset: 2 }
          : null,
        style,
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
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.ink, fontWeight: '600', fontSize: 14 }}>{label}</Text>
      <TextInput
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        accessibilityLabel={props.accessibilityLabel ?? label}
        {...(Platform.OS === 'web' ? { 'aria-invalid': error || undefined } : {})}
        placeholderTextColor={c.muted}
        style={[
          styles.input,
          {
            color: c.ink,
            backgroundColor: c.surface,
            borderColor: error ? c.danger : focused ? c.accent : c.muted,
          },
          focused
            ? { outlineColor: c.accent, outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 }
            : null,
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
  page: { flexGrow: 1, padding: 16, paddingTop: 20, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 16 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  action: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 54, padding: 14, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
});
