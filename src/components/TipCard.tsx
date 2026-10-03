import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';

import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

/**
 * Encart d'information à fond vert pâle : icône et titre, un court texte, un
 * chiffre mis en avant suivi d'un lien, et une vignette à droite.
 *
 * Repris tel quel du modèle (« Tip of the Day »). Contrairement aux cartes de
 * données, il ne porte PAS d'ombre : posé à plat sur le fond, il se lit comme
 * une note en marge plutôt que comme un élément de la liste — c'est ce qui
 * l'empêche d'entrer en concurrence avec les chiffres de la page.
 */

interface Props {
  icone: LucideIcon;
  titre: string;
  texte: string;
  /** Chiffre mis en avant sous le texte (« 12 % », « 3 mois »…). */
  valeur?: string;
  /** Lien à droite du chiffre. Sans `onPress`, il n'est pas rendu. */
  lien?: string;
  onPress?: () => void;
  /** Vignette à droite. */
  image?: string | null;
}

export function TipCard({ icone: Icone, titre, texte, valeur, lien, onPress, image }: Props) {
  const contenu = (
    <View style={styles.carte}>
      <View style={styles.texteCol}>
        <View style={styles.enTete}>
          <Icone size={17} color={colors.primary} strokeWidth={2} />
          <Text style={styles.titre} numberOfLines={1}>{titre}</Text>
        </View>

        <Text style={styles.texte}>{texte}</Text>

        {valeur || (lien && onPress) ? (
          <View style={styles.ligneBasse}>
            {valeur ? <Text style={styles.valeur}>{valeur}</Text> : null}
            {lien && onPress ? (
              <View style={styles.lienWrap}>
                <Text style={styles.lien}>{lien}</Text>
                <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {image ? <Image source={{ uri: image }} style={styles.vignette} resizeMode="cover" /> : null}
    </View>
  );

  if (!onPress) return contenu;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {contenu}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  carte: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  texteCol: { flex: 1, gap: 6 },
  enTete: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titre: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  texte: { fontSize: fontSize.sm, lineHeight: 19, color: colors.textMuted },
  ligneBasse: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: 2,
  },
  // Le chiffre porte l'encart : nettement plus gros que le texte qui l'amène.
  valeur: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textDark,
    letterSpacing: -0.4,
  },
  lienWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  lien: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  vignette: {
    width: 88,
    borderRadius: radius.md,
    backgroundColor: colors.bgMuted,
  },
});
