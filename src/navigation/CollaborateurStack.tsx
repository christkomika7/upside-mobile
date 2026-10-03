import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { EdlCreateScreen } from '../screens/collaborateur/EdlCreateScreen';
import { EdlEditScreen } from '../screens/collaborateur/EdlEditScreen';
import { InterventionCreateScreen } from '../screens/collaborateur/InterventionCreateScreen';
import { InterventionDetailScreen } from '../screens/collaborateur/InterventionDetailScreen';
import { RdvCreateScreen } from '../screens/collaborateur/RdvCreateScreen';
import { UniteDetailScreen } from '../screens/collaborateur/UniteDetailScreen';
import { stackScreenOptions } from './tabBar';
import { CollaborateurTabs } from './CollaborateurTabs';
import type { CollaborateurStackParamList } from './types';

const Stack = createNativeStackNavigator<CollaborateurStackParamList>();

export function CollaborateurStack() {
  return (
    <Stack.Navigator
      // Options PARTAGÉES : cette pile gardait les siennes en dur, avec un
      // en-tête blanc là où le corps est gris — d'où une couture visible en
      // haut de chaque écran de détail. C'est la divergence que l'en-tête de
      // `tabBar.tsx` annonçait ; elle disparaît en passant par la source
      // commune.
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen name="Tabs" component={CollaborateurTabs} options={{ headerShown: false }} />
      <Stack.Screen name="RdvCreate" component={RdvCreateScreen} options={{ title: 'Nouveau rendez-vous' }} />
      <Stack.Screen name="UniteDetail" component={UniteDetailScreen} options={{ title: 'Unité' }} />
      <Stack.Screen name="InterventionDetail" component={InterventionDetailScreen} options={{ title: 'Intervention' }} />
      <Stack.Screen name="InterventionCreate" component={InterventionCreateScreen} options={{ title: 'Nouvelle intervention' }} />
      <Stack.Screen name="EdlCreate" component={EdlCreateScreen} options={{ title: 'Nouvel état des lieux' }} />
      <Stack.Screen name="EdlEdit" component={EdlEditScreen} options={{ title: 'État des lieux' }} />
    </Stack.Navigator>
  );
}
