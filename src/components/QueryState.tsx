import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, Home, Inbox, Receipt, Wrench,
  type LucideIcon,
} from 'lucide-react-native';

import { Button } from './Button';
import { colors, fontSize, fontWeight, spacing } from '../theme';

/**
 * Les états vides étaient signalés par un ÉMOJI en couleur (📋, 🧾, 📅…).
 * Rien d'autre dans l'application n'en emploie : partout ailleurs, ce sont des
 * icônes au trait, vertes et fines. Sur ces écrans, le glyphe multicolore
 * tranchait — et il change de dessin selon la plateforme.
 *
 * La conversion se fait ICI plutôt que sur les treize appels : les écrans
 * continuent de passer leur émoji, et récupèrent l'icône au trait sans une
 * seule modification.
 */
const ICONE_PAR_EMOJI: Record<string, LucideIcon> = {
  '📋': ClipboardList,
  '🧾': Receipt,
  '🔧': Wrench,
  '🛠️': Wrench,
  '🏠': Home,
  '📅': CalendarDays,
  '✅': CheckCircle2,
};

interface LoadingProps { label?: string }
export function LoadingState({ label = 'Chargement…' }: LoadingProps) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primaryDark} size="large" />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

interface ErrorProps {
  error: unknown;
  onRetry?: () => void;
}
export function ErrorState({ error, onRetry }: ErrorProps) {
  const msg = error instanceof Error ? error.message : 'Une erreur est survenue.';
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconDisc, styles.iconDiscErreur]}>
        <AlertTriangle size={30} color={colors.danger} strokeWidth={1.8} />
      </View>
      <Text style={styles.title}>Oups</Text>
      <Text style={styles.muted}>{msg}</Text>
      {onRetry ? <Button label="Réessayer" variant="secondary" onPress={onRetry} full={false} /> : null}
    </View>
  );
}

interface EmptyProps {
  /** Émoji historique — converti en icône au trait, cf. ICONE_PAR_EMOJI. */
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}
export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyProps) {
  return (
    <View style={styles.wrap}>
      {icon ? (() => {
        const Icone = ICONE_PAR_EMOJI[icon] ?? Inbox;
        return (
          <View style={styles.iconDisc}>
            <Icone size={30} color={colors.primary} strokeWidth={1.8} />
          </View>
        );
      })() : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} full={false} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.lg,
  },
  iconDisc: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDiscErreur: { backgroundColor: colors.dangerSoft },
  icon: { fontSize: 34 },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textDark,
    textAlign: 'center',
  },
  muted: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
