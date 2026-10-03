import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandGradient } from '../components/BrandGradient';
import { colors, radius, spacing } from '../theme';

/**
 * Barre d'onglets flottante, dessinée intégralement à la main.
 *
 * Pourquoi ne pas styler la barre native : React Navigation insère l'inset de
 * zone sûre À L'INTÉRIEUR de la barre. Avec une hauteur imposée, la boîte de
 * contenu devient plus haute que le fond dessiné et les icônes se collent en
 * haut — c'est le défaut visible sur les captures. Deux tentatives de réglage
 * par les options n'y ont rien changé, l'une cassant même la répartition
 * horizontale. En fournissant notre propre composant, la hauteur, le centrage
 * et l'inset redeviennent des décisions explicites.
 *
 * Le comportement de navigation est celui d'origine : on ré-émet `tabPress` et
 * `tabLongPress`, et on respecte `preventDefault()`. Un appui sur l'onglet
 * courant ne renavigue pas.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      // L'inset est appliqué ICI, sous la barre, au lieu d'être absorbé par
      // elle : la pilule garde donc exactement la hauteur qu'on lui donne.
      style={[styles.zone, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
      pointerEvents="box-none"
    >
      <View style={styles.barre}>
        {/* Le dégradé de marque (celui de la carte « montant prélevé ») remplit
            la pilule : la barre d'onglets porte exactement la même couleur. */}
        <BrandGradient />
        <View style={styles.voile}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? route.name}
                style={styles.item}
              >
                {options.tabBarIcon?.({
                  focused,
                  color: focused ? colors.primaryDark : 'rgba(255,255,255,0.72)',
                  size: 22,
                })}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Hauteur de la pilule seule — l'inset s'ajoute en dessous. */
export const TAB_BAR_PILL_HEIGHT = 62;

const styles = StyleSheet.create({
  zone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
  },
  barre: {
    height: TAB_BAR_PILL_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
    shadowColor: '#046A63',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  voile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // Fond transparent : c'est le dégradé de marque, dessous, qui colore la barre.
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.xs,
  },
  // `flex: 1` répartit les onglets sur la largeur ; le centrage vertical joue
  // sur toute la hauteur de la pilule, sans inset parasite.
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
