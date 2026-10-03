import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../auth/store';
import { colors, fontSize, fontWeight, spacing } from '../../theme';

export function LoginScreen() {
  const { login, loginBusy, loginError } = useAuth();
  const [email, setEmail] = useState('admin@upside-gabon.com'); // pré-rempli en dev
  const [password, setPassword] = useState('');

  const onSubmit = async () => {
    if (!email.trim() || !password) return;
    await login({
      email: email.trim().toLowerCase(),
      password,
      device_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>U</Text>
          </View>
          <Text style={styles.brand}>UPSide</Text>
          <Text style={styles.tagline}>Votre espace locataire</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="vous@email.com"
          />
          <TextField
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            autoComplete="password"
            textContentType="password"
            toggleSecure
            placeholder="••••••••"
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          {loginError ? <Text style={styles.error}>{loginError}</Text> : null}

          <Button
            label="Se connecter"
            onPress={onSubmit}
            loading={loginBusy}
            disabled={!email.trim() || !password}
          />

          <Text style={styles.help}>
            Pas encore de compte ? Contactez votre agence UPSide pour obtenir vos identifiants.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgApp },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['4xl'] * 1.5,
    paddingBottom: spacing['2xl'],
    justifyContent: 'space-between',
  },
  header: { alignItems: 'center', marginBottom: spacing['3xl'] },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoLetter: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
  },
  brand: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textDark,
    letterSpacing: 1,
  },
  tagline: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  form: {
    gap: spacing.lg,
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: 12,
    textAlign: 'center',
  },
  help: {
    marginTop: spacing.lg,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
