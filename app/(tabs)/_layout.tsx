import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette } from '@/src/shared/theme';

const routes: { name: string; title: string; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { name: 'index', title: 'Inicio', icon: 'home-outline' },
  { name: 'prices', title: 'Comparar', icon: 'pricetags-outline' },
  { name: 'scan', title: 'Escanear', icon: 'scan-outline' },
  { name: 'library', title: 'Biblioteca', icon: 'heart-outline' },
  { name: 'settings', title: 'Ajustes', icon: 'options-outline' },
];
export default function TabLayout() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { fontScale, width } = useWindowDimensions();
  const itemWidth = Math.max(1, (width - insets.left - insets.right) / routes.length - 4);
  // Reserve room for wrapped labels as both text scale and available width change.
  const labelLines = Math.max(1, Math.ceil((72 * fontScale) / itemWidth));
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarActiveBackgroundColor: c.soft,
        tabBarLabelPosition: 'below-icon',
        tabBarItemStyle: { borderRadius: 12, marginHorizontal: 2 },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: Math.max(68, 40 + 16 * fontScale * labelLines) + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(8, insets.bottom),
        },
      }}
    >
      {routes.map((route) => (
        <Tabs.Screen
          key={route.name}
          name={route.name}
          options={{
            title: route.title,
            tabBarAccessibilityLabel: route.title,
            tabBarLabel: ({ color, focused }) => (
              <Text
                accessible={false}
                importantForAccessibility="no"
                style={{
                  color: typeof color === 'string' ? color : c.muted,
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: focused ? '600' : '500',
                  textAlign: 'center',
                  // Use the full touch target rather than the navigator's padded label slot.
                  width: itemWidth,
                }}
              >
                {route.title}
              </Text>
            ),
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                accessible={false}
                importantForAccessibility="no"
                name={route.icon}
                size={size}
                color={typeof color === 'string' ? color : c.accent}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
