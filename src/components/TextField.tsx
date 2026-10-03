import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

// Sur React Native Web, TextInput est rendu comme un <input> qui hérite du focus
// ring natif du navigateur (rectangle orange sur Chrome). On le retire au profit
// du feedback de bordure déjà géré par le composant.
const webNoOutline: TextStyle | null = Platform.OS === 'web'
  ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle)
  : null;

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  /** Si renseigné, affiche un toggle "Afficher / Masquer" pour les mots de passe. */
  toggleSecure?: boolean;
}

export function TextField({ label, error, toggleSecure, style, secureTextEntry, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const secure = toggleSecure ? !show : secureTextEntry;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && { borderColor: colors.primary },
          error && { borderColor: colors.danger },
        ]}
      >
        <TextInput
          {...rest}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          secureTextEntry={secure}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, webNoOutline, style]}
        />
        {toggleSecure ? (
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={10}>
            <Text style={styles.toggle}>{show ? 'Masquer' : 'Afficher'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textDark,
    paddingVertical: spacing.md,
  },
  toggle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.danger,
  },
});
