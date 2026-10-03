/**
 * Carte avec effet liquid glass (BlurView iOS / fallback semi-transparent Android).
 *
 * - iOS : BlurView avec tint clair → vrai effet "frosted glass"
 * - Android : BlurView fonctionne aussi mais moins fluide → on garde
 *   le fallback semi-transparent uniquement si nécessaire
 *
 * À utiliser sur fond coloré (sky header, image, gradient) sinon l'effet
 * est imperceptible.
 */
import { BlurView } from 'expo-blur';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, shadow, spacing } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  padding?: keyof typeof spacing;
  /** Bordure légère pour le contour glass. */
  bordered?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity = 40,
  tint = 'light',
  padding = 'lg',
  bordered = true,
}: Props) {
  return (
    <View style={[styles.wrap, shadow.card, style]}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(255,255,255,0.55)' },
        ]}
      />
      <View
        style={[
          styles.content,
          { padding: spacing[padding] },
          bordered && styles.border,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  content: { },
  border: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: radius.xl,
  },
});
