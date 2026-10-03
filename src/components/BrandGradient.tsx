/**
 * Dégradé de marque UPSide — celui de la carte « MONTANT PRÉLEVÉ » (factures
 * de gestion). Source unique : `gradients.primary` du thème, en diagonale
 * (haut-gauche → bas-droite), points [0, 0.5, 1] comme `GradientCard`.
 *
 * À poser en fond d'une surface (barre d'onglets, tuile KPI…) : par défaut il
 * remplit son parent (`absoluteFill`) ; le parent doit avoir `overflow:'hidden'`
 * et un `borderRadius`.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { gradients } from '../theme';

export function BrandGradient({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={[...gradients.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.5, 1]}
      style={style ?? StyleSheet.absoluteFill}
    />
  );
}
