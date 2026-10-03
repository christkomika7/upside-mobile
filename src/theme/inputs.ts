/**
 * Petit helper de style partagé — retire l'anneau de focus natif du navigateur
 * (rectangle orange sur Chrome / bleu sur Safari) sur les <TextInput> quand
 * l'app tourne en React Native Web. Sur natif, ces propriétés sont ignorées
 * silencieusement — le style reste sans effet.
 *
 * À appliquer sur TOUT <TextInput> brut (les <TextField> maison le font déjà
 * en interne).
 */
import { Platform, type TextStyle } from 'react-native';

// `outlineStyle` / `outlineWidth` sont des propriétés CSS propres au web : elles
// n'existent pas dans le TextStyle de React Native, d'où le cast. Le rendu web les
// applique, le natif les ignore — comportement inchangé, typage correct.
export const webInputReset: TextStyle | null =
  Platform.OS === 'web'
    ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle)
    : null;
