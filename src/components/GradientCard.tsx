/**
 * Carte avec dégradé vert brand UPSide (équivalent du `green-gradient`
 * Tailwind du web : `linear-gradient(135deg, #59C0AA 0%, #46928A 50%, #326469 100%)`).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, radius, shadow, spacing } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing;
}

export function GradientCard({ children, style, padding = 'xl' }: Props) {
  return (
    <View style={[styles.wrap, shadow.card, style]}>
      <LinearGradient
        colors={[...gradients.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ padding: spacing[padding] }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
});
