import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../theme';

interface Props {
  title: string;
  description?: string;
}

/** Écran placeholder utilisé pendant que les vues métier sont en cours d'implémentation. */
export function ScreenPlaceholder({ title, description }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>
        {description ?? 'Écran en cours de développement — bientôt disponible.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textDark,
  },
  sub: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
