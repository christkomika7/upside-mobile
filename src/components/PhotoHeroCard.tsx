import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from './Card';
import { CircleAction, GlassBadge } from './DataUI';
import { PhotoBanner } from './PhotoBanner';
import { colors, fontSize, fontWeight, spacing } from '../theme';

/**
 * Carte-photo signature du modèle : image pleine largeur, pastille dépolie de
 * localisation posée dessus, puis un corps blanc — titre en gras, description
 * en gris, et une ligne de pied qui oppose une donnée verte à un bouton rond
 * vert profond.
 *
 * C'est l'élément le plus reconnaissable des maquettes, et il était jusqu'ici
 * recomposé à la main dans chaque écran (Catalogue, Mes biens), avec des
 * écarts de marges à chaque fois. Le factoriser garantit qu'une unité se
 * présente partout de la même manière.
 *
 * Le bouton rond ne fait RIEN de plus que la carte : il mène à la même
 * destination. C'est une affordance visible, pas une action nouvelle — la
 * règle « ne rien changer au comportement » reste tenue.
 */

interface Props {
  photo?: string | null;
  /** Type d'unité — choisit l'icône du repli sans photo. */
  type?: string | null;
  /** Pastille dépolie sur la photo : quartier, immeuble… */
  lieu?: string;
  /** Second badge, à droite de la photo (statut par exemple). */
  badgeDroite?: React.ReactNode;
  titre: string;
  description?: string;
  /** Donnée mise en avant en pied, à gauche (loyer, surface…). */
  pied?: React.ReactNode;
  /** Appui sur la carte ET sur le bouton rond. */
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function PhotoHeroCard({
  photo,
  type,
  lieu,
  badgeDroite,
  titre,
  description,
  pied,
  onPress,
  accessibilityLabel,
}: Props) {
  return (
    <Pressable onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <Card padding="none">
        <PhotoBanner
          uri={photo}
          type={type}
          overlay={
            lieu || badgeDroite ? (
              <>
                {lieu ? <GlassBadge>{lieu}</GlassBadge> : <View />}
                {badgeDroite}
              </>
            ) : undefined
          }
        />

        <View style={styles.corps}>
          <Text style={styles.titre} numberOfLines={2}>{titre}</Text>
          {description ? (
            <Text style={styles.description} numberOfLines={2}>{description}</Text>
          ) : null}

          <View style={styles.pied}>
            <View style={styles.piedGauche}>{pied}</View>
            {onPress ? (
              <CircleAction
                size={52}
                accessibilityLabel={accessibilityLabel ?? `Ouvrir ${titre}`}
                onPress={onPress}
              />
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  corps: { padding: spacing.lg, gap: 6 },
  titre: {
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: fontWeight.bold,
    color: colors.textDark,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.textMuted,
  },
  pied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  piedGauche: { flex: 1 },
});
