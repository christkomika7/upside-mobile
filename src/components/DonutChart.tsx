import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';
import { colors, chartPalette, fontSize, fontWeight, spacing } from '../theme';

export interface DonutSlice {
  /** Libellé affiché en bout de ligne de rappel. */
  label: string;
  /** Valeur brute — les pourcentages sont calculés, jamais fournis. */
  value: number;
  /** Couleur imposée ; sinon puisée dans `chartPalette`. */
  color?: string;
}

interface Props {
  data: DonutSlice[];
  /** Diamètre du cercle, hors libellés. */
  size?: number;
  /** Épaisseur de l'anneau. */
  thickness?: number;
  /** Contenu central optionnel (total, intitulé…). */
  centerLabel?: string;
  centerValue?: string;
}

/**
 * Anneau segmenté avec pourcentages et lignes de rappel de part et d'autre.
 *
 * Les segments sont tracés en `strokeDasharray` sur un cercle unique : une
 * seule primitive SVG par part, donc un rendu fluide même sur les appareils
 * modestes, et des extrémités arrondies qui creusent un léger interstice
 * entre les parts — c'est ce jeu qui donne l'aspect « pétales » du modèle.
 *
 * Les parts nulles sont ignorées : un segment de longueur zéro afficherait
 * malgré tout son point d'arrondi, tache colorée sans signification.
 */
export default function DonutChart({
  data,
  size = 116,
  thickness = 19,
  centerLabel,
  centerValue,
}: Props) {
  const parts = data.filter(d => (d.value || 0) > 0);
  const total = parts.reduce((s, d) => s + d.value, 0);

  // Réserve latérale pour les libellés de part et d'autre de l'anneau.
  const sideWidth = 74;
  const chartW = size + sideWidth * 2;

  if (total <= 0) {
    return (
      <View style={[styles.empty, { height: size }]}>
        <Text style={styles.emptyText}>Aucune donnée à représenter</Text>
      </View>
    );
  }

  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  // Interstice constant entre parts, exprimé en fraction du périmètre. Sur une
  // part très fine il mangerait tout le segment : on le réduit alors d'autant.
  const GAP = parts.length > 1 ? 0.012 : 0;

  let acc = 0;
  const segments = parts.map((d, i) => {
    const frac = d.value / total;
    const gap = Math.min(GAP, frac * 0.5);
    const seg = {
      color: d.color ?? chartPalette[i % chartPalette.length],
      dash: Math.max(0, (frac - gap) * c),
      offset: -acc * c,
      // Angle médian de la part → point d'accroche de la ligne de rappel.
      midAngle: (acc + frac / 2) * 2 * Math.PI - Math.PI / 2,
      frac,
      label: d.label,
    };
    acc += frac;
    return seg;
  });

  // Répartition des libellés : moitié droite / moitié gauche, ordonnés de haut
  // en bas selon la position verticale de leur part.
  const marques = segments.map((s, i) => ({
    ...s,
    i,
    x: cx + Math.cos(s.midAngle) * (r + thickness / 2),
    y: cy + Math.sin(s.midAngle) * (r + thickness / 2),
    droite: Math.cos(s.midAngle) >= 0,
  }));

  // Anti-chevauchement : sur une part minuscule, deux marques peuvent viser la
  // meme hauteur. On parcourt chaque cote de haut en bas et on repousse celles
  // qui se touchent — sans quoi les libelles s'impriment l'un sur l'autre.
  const ECART_MIN = 30;
  for (const cote of [true, false]) {
    const col = marques.filter(m => m.droite === cote).sort((a, b) => a.y - b.y);
    for (let i = 1; i < col.length; i++) {
      if (col[i].y - col[i - 1].y < ECART_MIN) col[i].y = col[i - 1].y + ECART_MIN;
    }
  }

  // Hauteur reelle du bloc : une marque repoussee sous l'anneau doit rester
  // DANS le composant, sinon elle se superpose a ce qui suit (la legende).
  const basMarque = marques.reduce((m, x) => Math.max(m, x.y), 0);
  const blocH = Math.max(size, basMarque + 30);

  return (
    <View style={[styles.wrap, { width: chartW, height: blocH }]}>
      <Svg width={chartW} height={blocH}>
        <G x={sideWidth}>
          {/* Piste de fond : garde l'anneau lisible quand une part est minuscule. */}
          <Circle cx={cx} cy={cy} r={r} stroke={colors.borderLight} strokeWidth={thickness} fill="none" />
          {segments.map((s, i) => (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${s.dash} ${c - s.dash}`}
              strokeDashoffset={s.offset}
              strokeLinecap="round"
              fill="none"
              // Départ à midi plutôt qu'à 3 h : on lit un camembert en horloge.
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          ))}
        </G>
        {/* Lignes de rappel — pointillés discrets vers la marge. */}
        {marques.map(m => (
          <Line
            key={`l${m.i}`}
            x1={sideWidth + m.x}
            y1={m.y}
            x2={m.droite ? sideWidth + size + 10 : sideWidth - 10}
            y2={m.y}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        ))}
      </Svg>

      {/* Libellés en surcouche : du texte RN reste net et sélectionnable, là où
          un <Text> SVG serait plus rigide à mettre en forme. */}
      {marques.map(m => (
        <View
          key={`t${m.i}`}
          style={[
            styles.marque,
            m.droite
              ? { left: sideWidth + size + 12, alignItems: 'flex-start' }
              : { right: sideWidth + size + 12, alignItems: 'flex-end' },
            { top: m.y - 14 },
          ]}
        >
          <Text style={[styles.marqueValeur, { color: m.color }]}>
            {Math.round(m.frac * 100)}%
          </Text>
          <Text style={styles.marqueLabel} numberOfLines={2}>{m.label}</Text>
        </View>
      ))}

      {(centerValue || centerLabel) && (
        <View style={[styles.centre, { left: sideWidth, width: size, height: size }]} pointerEvents="none">
          {centerValue ? <Text style={styles.centreValeur} numberOfLines={1}>{centerValue}</Text> : null}
          {centerLabel ? <Text style={styles.centreLabel}>{centerLabel}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', position: 'relative' },
  marque: { position: 'absolute', width: 66 },
  marqueValeur: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  marqueLabel: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 13 },
  centre: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centreValeur: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  centreLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted },
});
