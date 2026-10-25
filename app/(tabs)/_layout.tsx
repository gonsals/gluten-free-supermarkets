import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePalette } from '@/src/shared/theme';

const routes: { name: string; title: string; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { name: 'index', title: 'Inicio', icon: 'home-outline' },
  { name: 'scan', title: 'Consultar', icon: 'scan-outline' },
  { name: 'library', title: 'Biblioteca', icon: 'heart-outline' },
  { name: 'prices', title: 'Precios', icon: 'pricetags-outline' },
  { name: 'settings', title: 'Ajustes', icon: 'options-outline' },
];
export default function TabLayout() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarActiveBackgroundColor: c.soft,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: Math.max(64, 40 + 16 * fontScale) + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(8, insets.bottom),
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      {routes.map((route) => (
        <Tabs.Screen
          key={route.name}
          name={route.name}
          options={{
            title: route.title,
            tabBarAccessibilityLabel: route.title,
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
