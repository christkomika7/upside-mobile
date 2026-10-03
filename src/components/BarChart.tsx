import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

export interface Bar {
  /** Libellé sous la barre (jour, mois…). */
  label: string;
  value: number;
  /** Met la barre en avant (période courante). */
  highlight?: boolean;
}

interface Props {
  data: Bar[];
  /** Hauteur de la zone des barres, hors libellés. */
  height?: number;
  /** Formatage de la valeur sous le libellé ; masquée si omis. */
  formatValue?: (v: number) => string;
}

/**
 * Barres verticales arrondies, libellé et valeur sous chaque barre.
 *
 * Deux partis pris repris du modèle :
 *  • une barre de valeur nulle devient une pastille ronde plutôt que de
 *    disparaître — la période reste visible, et l'absence se lit comme une
 *    donnée à part entière ;
 *  • la période mise en avant s'affiche en vert profond, les autres en vert
 *    clair : l'œil trouve le repère courant sans légende.
 *
 * Les hauteurs sont proportionnelles au maximum de la série, avec un plancher
 * qui évite qu'une petite valeur ne se réduise à un trait illisible.
 */
export default function BarChart({ data, height = 120, formatValue }: Props) {
  const max = Math.max(...data.map(d => d.value), 0);
  const MIN_H = 10;   // hauteur minimale d'une barre non nulle
  const DOT = 10;     // diamètre de la pastille « valeur nulle »

  return (
    <View style={styles.wrap}>
      {data.map((d, i) => {
        const nulle = d.value <= 0;
        const h = nulle || max <= 0
          ? DOT
          : Math.max(MIN_H, Math.round((d.value / max) * height));
        return (
          <View key={`${d.label}-${i}`} style={styles.col}>
            <View style={[styles.piste, { height }]}>
              <View
                style={[
                  styles.barre,
                  {
                    height: h,
                    backgroundColor: nulle
                      ? colors.borderLight
                      : d.highlight ? colors.primaryDark : '#B8E0DC',
                    // Une pastille doit être parfaitement ronde, pas une
                    // barre écrasée : on force le rayon à la moitié du côté.
                    borderRadius: nulle ? DOT / 2 : radius.pill,
                    width: nulle ? DOT : undefined,
                    alignSelf: nulle ? 'center' : 'stretch',
                  },
                ]}
              />
            </View>
            <Text style={[styles.label, d.highlight && styles.labelFort]} numberOfLines={1}>
              {d.label}
            </Text>
            {formatValue ? (
              <Text style={[styles.valeur, d.highlight && styles.valeurForte]} numberOfLines={1}>
                {formatValue(d.value)}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  col: { flex: 1, alignItems: 'center' },
  piste: { width: '100%', justifyContent: 'flex-end' },
  barre: { width: '100%' },
  label: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  labelFort: { color: colors.primaryDark, fontWeight: fontWeight.bold },
  valeur: { fontSize: fontSize.xs, color: colors.textMuted },
  valeurForte: { color: colors.primaryDark, fontWeight: fontWeight.semibold },
});
