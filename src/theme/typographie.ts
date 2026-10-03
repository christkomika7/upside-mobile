import type { TextStyle } from 'react-native';

import { colors } from './colors';
import { fontSize, fontWeight } from './spacing';

/**
 * Titres de page et de document — définition UNIQUE.
 *
 * Cinq écrans dessinaient encore leur propre titre, sur trois tailles
 * différentes (18 et 22 px) alors que la page de référence est à 30. C'était un
 * troisième système d'en-tête, à côté de `ScreenHero` et `DetailHero`, et rien
 * ne le rattachait aux deux autres : chaque nouvel écran repartait de zéro et
 * l'ensemble dérivait.
 *
 * Deux échelles seulement, et elles ont un sens distinct :
 *
 *  • `titreEcran` — un écran atteint depuis un onglet. Il porte la page à lui
 *    seul, d'où sa taille. C'est celle de `ScreenHero`.
 *
 *  • `titreDocument` — l'identité d'un document DANS un écran de détail. Plus
 *    petit à dessein : la barre de navigation affiche déjà un titre au-dessus,
 *    et deux titres de même poids se disputeraient l'attention. C'est celle de
 *    `DetailHero`.
 *
 * Tout écart d'un écran à l'autre doit désormais passer par une modification
 * ici, donc être un choix explicite.
 */

export const titreEcran: TextStyle = {
  fontSize: 30,
  lineHeight: 34,
  fontWeight: fontWeight.bold,
  color: colors.textDark,
  letterSpacing: -0.5,
};

export const titreDocument: TextStyle = {
  fontSize: 26,
  lineHeight: 30,
  fontWeight: fontWeight.bold,
  color: colors.textDark,
  letterSpacing: -0.4,
};

/** Sous-titre gris accompagnant l'un ou l'autre. */
export const sousTitre: TextStyle = {
  fontSize: fontSize.sm,
  color: colors.textMuted,
  marginTop: 4,
};
