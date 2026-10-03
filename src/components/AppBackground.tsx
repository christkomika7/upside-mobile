import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Décor de l'application — monté derrière chaque scène.
 *
 * Fond sable de la charte site, UNIFORME sur tout l'écran. On a retiré les
 * halos colorés et l'écran de flou : ils créaient des zones plus claires ou
 * plus fraîches (notamment un halo teal en bas, juste derrière la barre
 * d'onglets), si bien que le fond n'était pas le même partout. Le site, lui,
 * pose un aplat sable homogène — c'est ce qu'on reproduit ici. Un dégradé
 * vertical à peine perceptible évite l'aplat totalement mort, sans jamais
 * introduire de tache localisée.
 */
export function AppBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#F7F3ED', '#F4EFE8', '#F1EADF']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
