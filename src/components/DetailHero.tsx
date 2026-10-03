import { View, Text, StyleSheet } from 'react-native';

import { colors, fontSize, fontWeight, radius, shadow, spacing, titreDocument } from '../theme';

/**
 * En-tête d'un écran de détail — version CLAIRE.
 *
 * Même correction que `ScreenHero` : plus de carte en dégradé vert. Le
 * document s'annonce en texte sombre sur le fond de l'application, et le
 * chiffre clé est porté par une carte blanche isolée. La hiérarchie vient de
 * la TAILLE et du BLANC, pas d'un aplat de couleur.
 *
 * API inchangée par rapport à la v1.
 */

interface MetaItem {
  label: string;
  value: string;
}

interface Props {
  /** Nature du document — « Facture », « Intervention »… */
  overline: string;
  /** Identifiant lisible : numéro, référence, titre. */
  title: string;
  /** État, rendu en pastille à droite du sur-titre. */
  statut?: string;
  /** Chiffre clé mis en avant. */
  amount?: string;
  amountLabel?: string;
  /** Informations secondaires, en colonnes. */
  meta?: MetaItem[];
}

export function DetailHero({ overline, title, statut, amount, amountLabel, meta }: Props) {
  return (
    <View style={styles.bloc}>
      <View style={styles.ligneHaute}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>{overline.toUpperCase()}</Text>
          <Text style={styles.titre} numberOfLines={2}>{title}</Text>
        </View>
        {statut ? (
          <View style={styles.pastille}>
            <Text style={styles.pastilleTexte} numberOfLines={1}>{statut}</Text>
          </View>
        ) : null}
      </View>

      {amount || meta?.length ? (
        <View style={styles.carte}>
          {amount ? (
            <View style={styles.blocMontant}>
              {amountLabel ? <Text style={styles.montantLabel}>{amountLabel}</Text> : null}
              <Text
                style={styles.montant}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {amount}
              </Text>
            </View>
          ) : null}

          {meta?.length ? (
            <View style={[styles.meta, amount ? styles.metaSeparee : null]}>
              {meta.map((m, i) => (
                <View key={`${m.label}-${i}`} style={styles.metaItem}>
                  <Text style={styles.metaLabel} numberOfLines={1}>{m.label}</Text>
                  <Text style={styles.metaValeur} numberOfLines={1}>{m.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: spacing.md },
  ligneHaute: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  overline: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  titre: { ...titreDocument, marginTop: 3 },
  pastille: {
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  pastilleTexte: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  carte: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow.card,
  },
  blocMontant: { gap: 2 },
  montantLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  // Le chiffre qu'on vient chercher : nettement plus gros que tout le reste.
  montant: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: fontWeight.bold,
    color: colors.textDark,
    letterSpacing: -0.8,
  },
  meta: { flexDirection: 'row', gap: spacing.lg },
  metaSeparee: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  metaItem: { flex: 1, gap: 2 },
  metaLabel: { fontSize: 10, color: colors.textMuted },
  metaValeur: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textDark,
  },
});
