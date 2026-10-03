import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FileText, Home, LifeBuoy, User, Wallet } from 'lucide-react-native';

import { BienDetailScreen } from '../screens/proprietaire/BienDetailScreen';
import { BiensScreen } from '../screens/proprietaire/BiensScreen';
import { DecompteScreen } from '../screens/proprietaire/DecompteScreen';
import { DevisDecisionScreen } from '../screens/proprietaire/DevisDecisionScreen';
import { FactureDetailScreen } from '../screens/proprietaire/FactureDetailScreen';
import { FacturesScreen } from '../screens/proprietaire/FacturesScreen';
import { InterventionDetailScreen } from '../screens/proprietaire/InterventionDetailScreen';
import { InterventionsScreen } from '../screens/proprietaire/InterventionsScreen';
import { ProfilScreen } from '../screens/proprietaire/ProfilScreen';
import { TransactionsScreen } from '../screens/proprietaire/TransactionsScreen';
import { colors } from '../theme';
import { FloatingTabBar } from './FloatingTabBar';
import { makeTabIcon, stackScreenOptions, tabNavigatorScreenOptions, sceneAvecDecor } from './tabBar';
import type { ProprietaireTabsParamList } from './types';

const Tabs = createBottomTabNavigator<ProprietaireTabsParamList>();

// Options communes à chaque pile locale (header vert, icône retour cohérente).
// Chaque onglet est enveloppé dans sa propre pile — ainsi la barre d'onglets
// reste visible même quand on navigue vers un écran de détail depuis un onglet.
const DecompteStackNav = createNativeStackNavigator();
function DecompteTabStack() {
  return (
    <DecompteStackNav.Navigator screenOptions={stackScreenOptions}>
      <DecompteStackNav.Screen name="DecompteHome" component={DecompteScreen} options={{ headerShown: false }} />
      <DecompteStackNav.Screen name="Transactions" component={TransactionsScreen} options={{ title: 'Transactions' }} />
    </DecompteStackNav.Navigator>
  );
}

const BiensStackNav = createNativeStackNavigator();
function BiensTabStack() {
  return (
    <BiensStackNav.Navigator screenOptions={stackScreenOptions}>
      <BiensStackNav.Screen name="BiensHome" component={BiensScreen} options={{ headerShown: false }} />
      <BiensStackNav.Screen name="BienDetail" component={BienDetailScreen} options={{ title: 'Mon bien' }} />
    </BiensStackNav.Navigator>
  );
}

const FacturesStackNav = createNativeStackNavigator();
function FacturesTabStack() {
  return (
    <FacturesStackNav.Navigator screenOptions={stackScreenOptions}>
      <FacturesStackNav.Screen name="FacturesHome" component={FacturesScreen} options={{ headerShown: false }} />
      <FacturesStackNav.Screen name="FactureDetail" component={FactureDetailScreen} options={{ title: 'Facture' }} />
    </FacturesStackNav.Navigator>
  );
}

const InterventionsStackNav = createNativeStackNavigator();
function InterventionsTabStack() {
  return (
    <InterventionsStackNav.Navigator screenOptions={stackScreenOptions}>
      <InterventionsStackNav.Screen name="InterventionsHome" component={InterventionsScreen} options={{ headerShown: false }} />
      <InterventionsStackNav.Screen name="InterventionDetail" component={InterventionDetailScreen} options={{ title: 'Intervention' }} />
      <InterventionsStackNav.Screen name="DevisDecision" component={DevisDecisionScreen} options={{ title: 'Décision devis' }} />
    </InterventionsStackNav.Navigator>
  );
}

const ProfilStackNav = createNativeStackNavigator();
function ProfilTabStack() {
  return (
    <ProfilStackNav.Navigator screenOptions={stackScreenOptions}>
      <ProfilStackNav.Screen name="ProfilHome" component={ProfilScreen} options={{ headerShown: false }} />
    </ProfilStackNav.Navigator>
  );
}

export function ProprietaireTabs() {
  return (
    <Tabs.Navigator
      screenOptions={tabNavigatorScreenOptions}
      screenLayout={sceneAvecDecor}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="Decompte" component={DecompteTabStack} options={{ tabBarIcon: makeTabIcon(Wallet), tabBarLabel: 'Décompte' }} />
      <Tabs.Screen name="Biens" component={BiensTabStack} options={{ tabBarIcon: makeTabIcon(Home), tabBarLabel: 'Mes biens' }} />
      <Tabs.Screen name="Factures" component={FacturesTabStack} options={{ tabBarIcon: makeTabIcon(FileText) }} />
      <Tabs.Screen name="Interventions" component={InterventionsTabStack} options={{ tabBarIcon: makeTabIcon(LifeBuoy) }} />
      <Tabs.Screen name="Profil" component={ProfilTabStack} options={{ tabBarIcon: makeTabIcon(User) }} />
    </Tabs.Navigator>
  );
}

