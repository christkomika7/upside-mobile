import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Calendar, ClipboardCheck, Home, LifeBuoy, User } from 'lucide-react-native';

import { CatalogueScreen } from '../screens/collaborateur/CatalogueScreen';
import { EdlListScreen } from '../screens/collaborateur/EdlListScreen';
import { InterventionsScreen } from '../screens/collaborateur/InterventionsScreen';
import { ProfilScreen } from '../screens/collaborateur/ProfilScreen';
import { RendezVousScreen } from '../screens/collaborateur/RendezVousScreen';
import { colors } from '../theme';
import { FloatingTabBar } from './FloatingTabBar';
import { makeTabIcon, stackScreenOptions, tabNavigatorScreenOptions, sceneAvecDecor } from './tabBar';
import type { CollaborateurTabsParamList } from './types';

const Tabs = createBottomTabNavigator<CollaborateurTabsParamList>();

export function CollaborateurTabs() {
  return (
    <Tabs.Navigator
      screenOptions={tabNavigatorScreenOptions}
      screenLayout={sceneAvecDecor}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="RendezVous" component={RendezVousScreen} options={{ tabBarIcon: makeTabIcon(Calendar), tabBarLabel: 'RDV' }} />
      <Tabs.Screen name="Catalogue" component={CatalogueScreen} options={{ tabBarIcon: makeTabIcon(Home) }} />
      <Tabs.Screen name="EtatsLieux" component={EdlListScreen} options={{ tabBarIcon: makeTabIcon(ClipboardCheck), tabBarLabel: 'EDL' }} />
      <Tabs.Screen name="Interventions" component={InterventionsScreen} options={{ tabBarIcon: makeTabIcon(LifeBuoy) }} />
      <Tabs.Screen name="Profil" component={ProfilScreen} options={{ tabBarIcon: makeTabIcon(User) }} />
    </Tabs.Navigator>
  );
}

