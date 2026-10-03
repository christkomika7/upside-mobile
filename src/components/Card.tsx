import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

import { colors, radius, shadow, spacing } from '../theme';

/**
 * Carte de VERRE. Elle était un rectangle blanc opaque : posée sur un aplat
 * gris uni, elle ne pouvait rien laisser voir, et c'est pourquoi la refonte
 * restait invisible. Désormais le décor de l'application (dégradé + halos
 * verts) se devine à travers elle, et se déplace quand on fait défiler.
 *
 * Le flou est encadré par un voile blanc à 72 % : sans lui, le texte perdrait
 * son contraste dès qu'un halo passe derrière la carte — un chiffre illisible
 * une fois sur trois serait un mauvais échange contre l'effet.
 */

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * `'none'` supprime le rembourrage : indispensable aux cartes dont une photo
   * occupe toute la largeur, sinon l'image flotte dans une marge blanche.
   * Les valeurs existantes restent inchangées ; `lg` demeure le défaut.
   */
  padding?: keyof typeof spacing | 'none';
}

export function Card({ children, style, padding = 'lg' }: Props) {
  return (
    <View
      style={[
        styles.base,
        styles.clip,
        { padding: padding === 'none' ? 0 : spacing[padding] },
        style,
      ]}
    >
      {/* Flou et voile sont ABSOLUS, donc hors flux : les enfants restent les
          enfants directs de la carte. Une version intermédiaire les enveloppait
          dans une vue supplémentaire — et cassait du même coup toute carte à qui
          l'appelant passe une mise en page (`flexDirection: 'row'` par exemple),
          puisque cette mise en page s'appliquait alors au flou et au voile, plus
          au contenu. */}
      <BlurView intensity={Platform.OS === 'web' ? 18 : 30} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.voile} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderWidth: 1,
    // Liseré clair : c'est lui qui donne l'arête de verre au bord de la carte.
    borderColor: 'rgba(255,255,255,0.65)',
    ...shadow.card,
  },
  // Le rognage devient systématique : le flou et le voile doivent s'arrêter
  // sur le rayon, sinon ils débordent en angles carrés.
  clip: { overflow: 'hidden' },
  voile: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.72)' },
});
