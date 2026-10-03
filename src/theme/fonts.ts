import type { TextStyle } from 'react-native';

/**
 * ULM Grotesk — la police du site vitrine, embarquée dans l'app.
 *
 * React Native ne synthétise pas les graisses depuis un seul fichier : chaque
 * graisse est un fichier `.otf` distinct, enregistré sous sa propre clé. On
 * choisit ensuite le bon fichier à partir du `fontWeight` demandé par l'écran,
 * ce qui permet d'appliquer la police PARTOUT sans toucher aux 377 `fontWeight`
 * déjà écrits (cf. `applyGlobalFont`).
 */
export const ulmFonts = {
  'UlmGrotesk-Light': require('../../assets/fonts/UlmGrotesk-Light.otf'),
  'UlmGrotesk-Regular': require('../../assets/fonts/UlmGrotesk-Regular.otf'),
  'UlmGrotesk-Medium': require('../../assets/fonts/UlmGrotesk-Medium.otf'),
  'UlmGrotesk-Bold': require('../../assets/fonts/UlmGrotesk-Bold.otf'),
  'UlmGrotesk-Extrabold': require('../../assets/fonts/UlmGrotesk-Extrabold.otf'),
} as const;

/** Renvoie la famille ULM Grotesk correspondant au poids demandé. */
export function fontFamilyForWeight(weight?: TextStyle['fontWeight']): string {
  switch (String(weight ?? '400')) {
    case '100':
    case '200':
    case '300':
    case 'thin':
    case 'ultralight':
    case 'light':
      return 'UlmGrotesk-Light';
    case '500':
    case 'medium':
      return 'UlmGrotesk-Medium';
    case '600':
    case '700':
    case 'bold':
    case 'semibold':
      return 'UlmGrotesk-Bold';
    case '800':
    case '900':
    case 'heavy':
    case 'black':
      return 'UlmGrotesk-Extrabold';
    case '400':
    case 'normal':
    default:
      return 'UlmGrotesk-Regular';
  }
}
