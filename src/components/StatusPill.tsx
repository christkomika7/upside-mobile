import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface Props {
  label: string;
  tone?: Tone;
  /** Override du style externe — utile pour ajuster alignSelf (ex. flex-end). */
  style?: StyleProp<ViewStyle>;
}

export function StatusPill({ label, tone = 'muted', style }: Props) {
  const palette = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

/** Mappe les statuts métier à un ton de couleur. */
export function statusTone(statut: string | null | undefined): Tone {
  const s = (statut || '').toUpperCase();
  if (s === 'PAYEE' || s === 'CLOTURE' || s === 'SIGNE') return 'success';
  if (s === 'PARTIELLEMENT_PAYEE' || s === 'EN_COURS' || s === 'A_SIGNER') return 'warning';
  if (s === 'EN_RETARD' || s === 'ANNULE' || s === 'BLOCAGE') return 'danger';
  if (s === 'EN_ATTENTE' || s === 'NOUVELLE' || s === 'VALIDE') return 'info';
  return 'muted';
}

/** Libellé humain pour les statuts les plus courants. */
export function statusLabel(statut: string | null | undefined): string {
  const s = (statut || '').toUpperCase();
  switch (s) {
    case 'EN_ATTENTE': return 'En attente';
    case 'PARTIELLEMENT_PAYEE': return 'Partiellement payée';
    case 'PAYEE': return 'Payée';
    case 'BROUILLON': return 'Brouillon';
    case 'EN_RETARD': return 'En retard';
    case 'EN_COURS': return 'En cours';
    case 'BLOCAGE': return 'Blocage';
    case 'VALIDE': return 'Validée';
    case 'CLOTURE': return 'Clôturée';
    case 'ANNULE': return 'Annulée';
    case 'NOUVELLE': return 'Nouvelle';
    case 'SIGNE': return 'Validé';
    case 'A_SIGNER': return 'À signer';
    default: return statut || '—';
  }
}

// Textes tires de la palette forêt : les valeurs precedentes (#047857,
// #1D4ED8…) venaient de l'ancienne identite et juraient sur les nouveaux
// fonds tiedes. Bordure retiree — sur un aplat doux elle durcissait la
// pastille sans rien apporter.
const TONES: Record<Tone, { bg: string; border: string; text: string; dot: string }> = {
  success: { bg: colors.successSoft, border: 'transparent', text: '#1B5138', dot: colors.success },
  warning: { bg: colors.warningSoft, border: 'transparent', text: '#8A5A15', dot: colors.warning },
  danger:  { bg: colors.dangerSoft,  border: 'transparent', text: '#9B2C2C', dot: colors.danger },
  info:    { bg: colors.infoSoft,    border: 'transparent', text: '#2C4F6B', dot: colors.info },
  muted:   { bg: colors.bgMuted,     border: 'transparent', text: colors.textMuted, dot: colors.textMuted },
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  } as ViewStyle,
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
