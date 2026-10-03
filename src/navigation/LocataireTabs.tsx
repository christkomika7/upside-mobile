import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClipboardCheck, FileText, Home, KeyRound, LifeBuoy, User } from 'lucide-react-native';

import { AccueilScreen } from '../screens/locataire/AccueilScreen';
import { AttestationScreen } from '../screens/locataire/AttestationScreen';
import { BailDetailScreen } from '../screens/locataire/BailDetailScreen';
import { BailScreen } from '../screens/locataire/BailScreen';
import { BienScreen } from '../screens/locataire/BienScreen';
import { EdlDetailScreen } from '../screens/locataire/EdlDetailScreen';
import { EdlListScreen } from '../screens/locataire/EdlListScreen';
import { FactureDetailScreen } from '../screens/locataire/FactureDetailScreen';
import { FacturesScreen } from '../screens/locataire/FacturesScreen';
import { InterventionCreateScreen } from '../screens/locataire/InterventionCreateScreen';
import { InterventionDetailScreen } from '../screens/locataire/InterventionDetailScreen';
import { InterventionsScreen } from '../screens/locataire/InterventionsScreen';
import { ProfilScreen } from '../screens/locataire/ProfilScreen';
import { colors } from '../theme';
import { FloatingTabBar } from './FloatingTabBar';
import { makeTabIcon, stackScreenOptions, tabNavigatorScreenOptions, sceneAvecDecor } from './tabBar';
import type { LocataireTabsParamList } from './types';

const Tabs = createBottomTabNavigator<LocataireTabsParamList>();

// Chaque onglet enveloppe son écran dans sa propre pile — la barre d'onglets
// reste ainsi visible même quand on navigue vers un écran de détail.

const AccueilStackNav = createNativeStackNavigator();
function AccueilTabStack() {
  return (
    <AccueilStackNav.Navigator screenOptions={stackScreenOptions}>
      <AccueilStackNav.Screen name="AccueilHome" component={AccueilScreen} options={{ headerShown: false }} />
      <AccueilStackNav.Screen name="Bien" component={BienScreen} options={{ title: 'Mon bien' }} />
    </AccueilStackNav.Navigator>
  );
}

const BailStackNav = createNativeStackNavigator();
function BailTabStack() {
  return (
    <BailStackNav.Navigator screenOptions={stackScreenOptions}>
      <BailStackNav.Screen name="BailHome" component={BailScreen} options={{ headerShown: false }} />
      <BailStackNav.Screen name="BailDetail" component={BailDetailScreen} options={{ title: 'Bail' }} />
      <BailStackNav.Screen name="Attestation" component={AttestationScreen} options={{ title: 'Attestation' }} />
    </BailStackNav.Navigator>
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

const EtatsLieuxStackNav = createNativeStackNavigator();
function EtatsLieuxTabStack() {
  return (
    <EtatsLieuxStackNav.Navigator screenOptions={stackScreenOptions}>
      <EtatsLieuxStackNav.Screen name="EdlHome" component={EdlListScreen} options={{ headerShown: false }} />
      <EtatsLieuxStackNav.Screen name="EdlDetail" component={EdlDetailScreen} options={{ title: 'État des lieux' }} />
    </EtatsLieuxStackNav.Navigator>
  );
}

const InterventionsStackNav = createNativeStackNavigator();
function InterventionsTabStack() {
  return (
    <InterventionsStackNav.Navigator screenOptions={stackScreenOptions}>
      <InterventionsStackNav.Screen name="InterventionsHome" component={InterventionsScreen} options={{ headerShown: false }} />
      <InterventionsStackNav.Screen name="InterventionDetail" component={InterventionDetailScreen} options={{ title: 'Intervention' }} />
      <InterventionsStackNav.Screen name="InterventionCreate" component={InterventionCreateScreen} options={{ title: 'Nouvelle demande' }} />
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

export function LocataireTabs() {
  return (
    <Tabs.Navigator
      screenOptions={tabNavigatorScreenOptions}
      screenLayout={sceneAvecDecor}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="Accueil" component={AccueilTabStack} options={{ tabBarIcon: makeTabIcon(Home) }} />
      <Tabs.Screen name="Bail" component={BailTabStack} options={{ tabBarIcon: makeTabIcon(KeyRound) }} />
      <Tabs.Screen name="Factures" component={FacturesTabStack} options={{ tabBarIcon: makeTabIcon(FileText) }} />
      <Tabs.Screen name="EtatsLieux" component={EtatsLieuxTabStack} options={{ tabBarIcon: makeTabIcon(ClipboardCheck), tabBarLabel: 'EDL' }} />
      <Tabs.Screen name="Interventions" component={InterventionsTabStack} options={{ tabBarIcon: makeTabIcon(LifeBuoy) }} />
      <Tabs.Screen name="Profil" component={ProfilTabStack} options={{ tabBarIcon: makeTabIcon(User) }} />
    </Tabs.Navigator>
  );
}

