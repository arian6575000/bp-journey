import React from 'react';
import { Text } from 'react-native';
import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../i18n/I18nContext';

function icon(symbol: string) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return (
      <Text style={{ color, fontSize: 21 }} importantForAccessibility="no">
        {symbol}
      </Text>
    );
  };
}

export default function TabsLayout() {
  const { t, colors } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab_home'), tabBarIcon: icon('⌂') }} />
      <Tabs.Screen name="history" options={{ title: t('tab_history'), tabBarIcon: icon('☰') }} />
      <Tabs.Screen name="trends" options={{ title: t('tab_trends'), tabBarIcon: icon('↗') }} />
      <Tabs.Screen name="settings" options={{ title: t('tab_settings'), tabBarIcon: icon('⚙') }} />
    </Tabs>
  );
}
