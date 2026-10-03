import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { ArrowUpRight, Info } from 'lucide-react-native';
import { colors, chartPalette, fontSize, fontWeight, radius, shadow, spacing } from '../theme';

/**
 * Primitives partagées de la refonte : légende de graphique, encart
 * d'information, sélecteur de période et bouton circulaire d'action.
 *
 * Regroupées ici plutôt qu'en fichiers séparés : ce sont de petites pièces
 * toujours employées ensemble autour d'un graphique.
 */

/** Carte blanche à grand rayon et ombre diffuse — conteneur de référence. */
export function Surface({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export interface LegendItem {
  label: string;
  /** Valeur déjà formatée (montant, poids…). */
  value: string;
  /** Part en pourcentage ; masquée si absente. */
  percent?: number;
  color?: string;
}

/**
 * Légende en lignes : pastille, libellé, valeur, pourcentage.
 * Se lit comme un tableau, ce qui permet de comparer les postes entre eux —
 * un graphique seul ne donne jamais les montants exacts.
 */
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <View>
      {items.map((it, i) => (
        <View key={`${it.label}-${i}`} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: it.color ?? chartPalette[i % chartPalette.length] }]} />
          <Text style={styles.legendLabel} numberOfLines={1}>{it.label}</Text>
          <Text style={styles.legendValue} numberOfLines={1}>{it.value}</Text>
          {it.percent != null ? (
            <Text style={styles.legendPct}>{Math.round(it.percent)}%</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Encart neutre en bas de carte — met en mots ce que le graphique montre. */
export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.note}>
      <Info size={14} color={colors.textMuted} />
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

/**
 * Sélecteur de période (J / S / M). Purement visuel : c'est l'écran appelant
 * qui détient l'état et décide de ce que chaque option affiche.
 */
export function PeriodToggle<T extends string>({
  options, value, onChange,
}: { options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.toggle}>
      {options.map(opt => {
        const actif = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            hitSlop={6}
            style={[styles.toggleItem, actif && styles.toggleItemActif]}
          >
            <Text style={[styles.toggleText, actif && styles.toggleTextActif]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Bouton circulaire vert profond à flèche — action principale d'une carte. */
export function CircleAction({
  onPress, size = 52, accessibilityLabel,
}: { onPress: () => void; size?: number; accessibilityLabel: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      <ArrowUpRight size={size * 0.42} color={colors.textInverse} strokeWidth={2.4} />
    </Pressable>
  );
}

/**
 * Pastille dépolie posée sur une photo (localisation, statut…).
 *
 * `expo-blur` floute réellement l'image dessous sur iOS et Android récents ;
 * ailleurs il retombe sur un voile semi-opaque. D'où le fond translucide posé
 * en dur SOUS le flou : sans lui, le texte deviendrait illisible sur une photo
 * claire là où le flou n'est pas rendu.
 */
export function GlassBadge({
  children, tone = 'light',
}: { children: React.ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <BlurView
      intensity={28}
      tint={tone === 'dark' ? 'dark' : 'light'}
      style={styles.glass}
    >
      <View style={[styles.glassInner, tone === 'dark' && styles.glassInnerDark]}>
        <Text style={[styles.glassText, tone === 'dark' && styles.glassTextDark]} numberOfLines={1}>
          {children}
        </Text>
      </View>
    </BlurView>
  );
}

/** En-tête de carte : sur-titre discret, titre fort, action à droite. */
export function CardHeading({
  overline, title, right,
}: { overline?: string; title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.heading}>
      <View style={{ flex: 1 }}>
        {overline ? <Text style={styles.overline}>{overline}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow.card,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: spacing.md,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textDark },
  legendValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.medium },
  legendPct: {
    width: 44,
    textAlign: 'right',
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgMuted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  noteText: { flex: 1, fontSize: fontSize.sm, color: colors.textDark },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.bgMuted,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  toggleItem: {
    minWidth: 34,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleItemActif: { backgroundColor: colors.primaryDark },
  toggleText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.semibold },
  toggleTextActif: { color: colors.textInverse },
  circle: {
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.action,
  },
  glass: { borderRadius: radius.pill, overflow: 'hidden', alignSelf: 'flex-start' },
  glassInner: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  glassInnerDark: { backgroundColor: 'rgba(20,55,43,0.55)' },
  glassText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  glassTextDark: { color: colors.textInverse },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  overline: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
});
