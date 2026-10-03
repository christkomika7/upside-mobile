import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { AppBackground } from '../components/AppBackground';
import { colors, radius } from '../theme';

/**
 * Enveloppe posee autour de CHAQUE ecran d'onglet.
 *
 * Le decor etait monte une seule fois sous toute la navigation, et le jeton de
 * fond des ecrans rendu transparent pour le laisser voir. Effet de bord grave :
 * React Navigation garde les onglets inactifs montes, et c'etait justement
 * l'aplat opaque de chaque ecran qui les masquait. Sans lui, tous les onglets
 * se superposaient -- deux titres imprimes l'un sur l'autre.
 *
 * En donnant son propre decor a chaque scene, chacune redevient OPAQUE : la
 * scene active recouvre les autres, et le verre reste visible puisque le decor
 * est bien la, derriere le contenu.
 */
export function sceneAvecDecor({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.scene}>
      <AppBackground />
      {children}
    </View>
  );
}

/**
 * Barre d'onglets partagée par les trois espaces (locataire, propriétaire,
 * collaborateur).
 *
 * Ce module ne porte plus que la FABRIQUE D'ICÔNES et les options d'écran :
 * la barre elle-même est dessinée par `FloatingTabBar`, faute d'avoir pu
 * centrer les icônes à travers les options natives (cf. son en-tête).
 *
 * Icônes seules, sans libellé, comme le modèle. Les libellés d'accessibilité
 * restent portés par les noms d'écrans : les lecteurs d'écran continuent
 * d'annoncer chaque onglet.
 */

/** Hauteur réservée sous les écrans : pilule + marge basse confortable. */
export const TAB_BAR_HEIGHT = 92;

export function makeTabIcon(Icon: LucideIcon) {
  return ({ focused }: { color: string; focused: boolean }) => (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon
        size={22}
        color={focused ? colors.primaryDark : 'rgba(255,255,255,0.72)'}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
}

/**
 * Options communes du navigateur d'onglets.
 *
 * `sceneStyle` ajoute sous chaque écran la hauteur de la barre : flottante,
 * elle recouvrirait sinon le bas du contenu — typiquement le dernier élément
 * d'une liste ou un bouton d'action.
 */
/**
 * En-tête des écrans de détail (facture, intervention, état des lieux…).
 *
 * Sans couleur ni ombre : la barre se fond dans le fond de l'application, si
 * bien qu'il ne reste visuellement que le chevron de retour et le titre. Le
 * détail commence alors sur du blanc, comme la liste dont il provient — c'est
 * le parti des maquettes, où aucune barre système ne vient couper la page.
 *
 * Défini ICI et importé par les trois espaces : il y était copié à
 * l'identique trois fois, et commençait à diverger.
 */
export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.bgApp },
  headerTintColor: colors.textDark,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bgApp },
} as const;

export const tabNavigatorScreenOptions = {
  headerShown: false,
  // `sceneStyle` réserve sous chaque écran la place de la barre flottante :
  // sans lui, elle recouvrirait le dernier élément d'une liste.
  sceneStyle: { backgroundColor: colors.bgApp, paddingBottom: TAB_BAR_HEIGHT },
};

const styles = StyleSheet.create({
  scene: { flex: 1 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    // Pastille claire sur fond teal profond — repère immédiat de l'onglet actif.
    backgroundColor: colors.successSoft,
  },
});

