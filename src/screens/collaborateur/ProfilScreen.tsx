/**
 * Espace Collaborateur — profil + logout (+ toggle démo pour ADMIN).
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { useAuth } from '../../auth/store';
import { getRefreshToken } from '../../auth/tokenStorage';
import { colors, fontSize, fontWeight, spacing } from '../../theme';

export function ProfilScreen() {
  const { user, logout, setDemoSpace } = useAuth();
  const isAdmin = user?.user_type === 'ADMIN';

  const onLogout = async () => {
    const rt = await getRefreshToken();
    await logout(rt ?? undefined);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <ProfileAvatar size={88} />
          <Text style={styles.name}>{`${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || '—'}</Text>
          <Text style={styles.role}>Collaborateur UPSide</Text>
        </View>

        <Card padding="lg">
          <StackedRow label="Email" value={user?.email ?? '—'} />
          <StackedRow label="Téléphone" value={user?.telephone ?? '—'} last />
        </Card>

        {isAdmin ? (
          <View style={{ gap: spacing.sm }}>
            <Button label="Voir l'espace Locataire" variant="secondary" onPress={() => setDemoSpace('LOCATAIRE')} />
            <Button label="Voir l'espace Propriétaire" variant="secondary" onPress={() => setDemoSpace('PROPRIETAIRE')} />
            <Text style={styles.demoHint}>Mode démo ADMIN : permet de basculer entre les espaces.</Text>
          </View>
        ) : null}

        <Button label="Se déconnecter" variant="dangerSoft" onPress={onLogout} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Layout vertical : label en haut, valeur en dessous pleine largeur.
 *  Garantit qu'une adresse e-mail longue tient sur une seule ligne au lieu
 *  d'être tronquée à 60 % de la card et de wrapper sur 2 lignes. */
function StackedRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.stackedRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.stackedValue} numberOfLines={1} ellipsizeMode="middle">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  header: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md, gap: spacing.xs },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  role: { fontSize: fontSize.sm, color: colors.textMuted },
  stackedRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    gap: 4,
  },
  rowLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold, letterSpacing: 0.3, textTransform: 'uppercase' },
  stackedValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },
  demoHint: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
});
