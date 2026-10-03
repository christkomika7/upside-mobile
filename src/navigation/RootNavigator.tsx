import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../auth/store';
import { usePushRegistration } from '../hooks/usePushRegistration';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { colors, fontSize, fontWeight, spacing } from '../theme';
import { AuthStack } from './AuthStack';
import { CollaborateurStack } from './CollaborateurStack';
import { LocataireStack } from './LocataireStack';
import { ProprietaireStack } from './ProprietaireStack';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Splash en attendant le hydrate du store auth. */
function HydratingSplash() {
  return (
    <View style={styles.splash}>
      <Text style={styles.brand}>UPSide</Text>
      <ActivityIndicator color={colors.textInverse} />
    </View>
  );
}

export function RootNavigator() {
  const { hydrating, user, demoSpace } = useAuth();
  // Sync temps réel + push : actifs uniquement quand un user est en session.
  // Les hooks gardent leur propre logique d'inactivité quand user=null.
  useRealtimeSync();
  usePushRegistration();
  if (hydrating) return <HydratingSplash />;

  // Pour les vrais utilisateurs, leur user_type décide. Pour ADMIN, on suit
  // `demoSpace` (toggle dans le Profil) pour permettre d'explorer chaque espace.
  const effectiveSpace =
    user?.user_type === 'ADMIN' ? demoSpace : user?.user_type;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : effectiveSpace === 'PROPRIETAIRE' ? (
        <Stack.Screen name="Proprietaire" component={ProprietaireStack} />
      ) : effectiveSpace === 'COLLABORATEUR' ? (
        <Stack.Screen name="Collaborateur" component={CollaborateurStack} />
      ) : (
        <Stack.Screen name="Locataire" component={LocataireStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  brand: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
    letterSpacing: 2,
  },
});
