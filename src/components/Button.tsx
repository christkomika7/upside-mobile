import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSoft';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, full = true, icon, style }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      android_ripple={{ color: '#00000010' }}
      style={({ pressed }) => [
        styles.base,
        variants[variant].container,
        full && { alignSelf: 'stretch' },
        isDisabled && styles.disabled,
        pressed && !isDisabled && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variants[variant].label.color as string} />
      ) : (
        <View style={styles.inner}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, variants[variant].label]} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  icon: { marginRight: spacing.sm },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabled: { opacity: 0.5 },
});

const variants: Record<Variant, { container: ViewStyle; label: { color: string } }> = {
  // Plein vert profond, comme les boutons et cercles d'action du modele —
  // `primary` seul manquait de contraste sur les fonds tiedes.
  primary: {
    container: { backgroundColor: colors.primaryDark },
    label: { color: colors.textInverse },
  },
  secondary: {
    container: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: { color: colors.primaryDark },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    label: { color: colors.textDark },
  },
  danger: {
    container: { backgroundColor: colors.danger },
    label: { color: colors.textInverse },
  },
  // Rouge en RETRAIT. `danger` (rouge plein) reste réservé aux confirmations
  // de suppression, où il doit arrêter le geste. Une déconnexion, elle, n'a
  // pas à être l'élément le plus voyant de l'écran : en pavé plein largeur
  // elle écrasait les informations du compte qu'elle est censée accompagner.
  dangerSoft: {
    container: { backgroundColor: colors.dangerSoft },
    label: { color: colors.danger },
  },
};
