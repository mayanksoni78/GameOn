import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { 
  useFonts, 
  PressStart2P_400Regular 
} from '@expo-google-fonts/press-start-2p';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '../src/theme/colors';

// Prevent splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync().catch(() => {});

const GameOnDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#09080E',
    card: '#0E0D16',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#F4F4F5',
    notification: '#8B5CF6',
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PressStart2P_400Regular,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Instant dark background on web DOM to prevent any white flash
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = '#09080E';
      document.body.style.backgroundColor = '#09080E';
    }

    // Maximum 1.2s timeout to ensure the app NEVER hangs on startup
    const timer = setTimeout(() => {
      setIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 1200);

    if (loaded || error) {
      setIsReady(true);
      SplashScreen.hideAsync().catch(() => {});
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [loaded, error]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09080E', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.accent.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#09080E' }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#09080E' }}>
        <ThemeProvider value={GameOnDarkTheme}>
          <StatusBar style="light" />
          {/* Opaque dark baseline ensuring zero white flash across any transitions */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#09080E' }]} pointerEvents="none" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#09080E' },
              animation: 'fade',
              animationDuration: 180,
            }}
          />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}