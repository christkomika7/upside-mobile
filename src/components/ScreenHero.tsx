import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandGradient } from './BrandGradient';
import { colors, fontSize, fontWeight, radius, shadow, sousTitre, spacing, titreEcran } from '../theme';

/**
 * En-tête d'écran — version CLAIRE.
 *
 * La v1 posait un bandeau vert foncé en haut de chaque écran. C'était le
 * contresens : les maquettes de référence n'ont AUCUN aplat coloré en tête de
 * page. Le titre y est simplement écrit en grand, en sombre, à même le fond
 * clair ; le vert profond est réservé aux accents (bouton rond, onglet actif,
 * segment le plus foncé d'un graphique). L'écran respire, et la couleur ne
 * sert plus de décor mais de signal.
 *
 * L'API est INCHANGÉE (`title`, `subtitle`, `stats`, `action`, `children`) :
 * les douze écrans qui l'utilisent adoptent la nouvelle direction sans une
 * seule modification — donc sans risque de régression fonctionnelle.
 */

export interface HeroStat {
  label: string;
  value: string;
  /** Met la tuile en avant : fond vert profond, chiffre en blanc. */
  fort?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  stats?: HeroStat[];
  /** Action à droite du titre (bouton « Nouveau », filtre…). */
  action?: React.ReactNode;
  /** Élément libre sous le titre (sélecteur de période, recherche…). */
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Conservé pour compatibilité d'API. À zéro : sans bandeau coloré, il n'y a
 * plus rien sous quoi faire glisser le contenu.
 */
export const HERO_OVERLAP = 0;

export function ScreenHero({ title, subtitle, stats, action, children, style }: Props) {
  return (
    <View style={[styles.hero, style]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.ligneTitre}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>

        {children ? <View style={styles.enfants}>{children}</View> : null}

        {stats?.length ? (
          <View style={styles.tuiles}>
            {stats.map((s, i) => (
              <View key={`${s.label}-${i}`} style={styles.tuile}>
                {/* Dégradé de marque (celui de la carte « montant prélevé ») sur
                    chaque tuile KPI : même identité partout. */}
                <BrandGradient />
                <Text
                  style={styles.tuileValeur}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {s.value}
                </Text>
                <Text style={styles.tuileLabel} numberOfLines={1}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.bgApp,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  ligneTitre: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  // Grand, serré, sombre : le titre porte la page à lui seul. Défini dans
  // theme/typographie, d'où les autres écrans le tirent aussi.
  title: titreEcran,
  subtitle: sousTitre,
  enfants: { marginTop: spacing.md },

  tuiles: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  tuile: {
    flex: 1,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
    overflow: 'hidden',
    ...shadow.card,
  },
  tuileValeur: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
    letterSpacing: -0.3,
  },
  tuileLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
});
