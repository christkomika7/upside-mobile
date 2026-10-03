// `react-native-gesture-handler` doit être importé en TOUT PREMIER (cf. doc SDK 56).
import 'react-native-gesture-handler';

import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';

import { useAuth } from './src/auth/store';
import { queryClient, wireQueryToAppLifecycle } from './src/hooks/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
// Galerie de contrôle — importée à la demande, cf. commentaire dans le rendu.
import { AppBackground } from './src/components/AppBackground';
import { ulmFonts } from './src/theme/fonts';
import { applyGlobalFont } from './src/theme/applyGlobalFont';

// ULM Grotesk (la police du site) posée sur TOUT le texte, une fois pour toutes.
applyGlobalFont();

// Sans cela, React Navigation peint son propre fond blanc par-dessus le décor.
const themeTransparent = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  const [fontsLoaded] = useFonts(ulmFonts);

  useEffect(() => {
    wireQueryToAppLifecycle();
    hydrate();
  }, [hydrate]);

  // Tant que ULM Grotesk n'est pas chargée, on ne peint que le décor sable :
  // évite un flash de texte en police système avant la bascule.
  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppBackground />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Le décor est peint ICI, une fois, sous toute la navigation. */}
          <AppBackground />
          <NavigationContainer theme={themeTransparent}>
            <RootNavigator />
          </NavigationContainer>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
