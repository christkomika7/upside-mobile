import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { useAuth } from '../../auth/store';
import { getRefreshToken } from '../../auth/tokenStorage';
import { useLocataireProfile } from '../../hooks/locataire';
import { colors, fontSize, fontWeight, spacing } from '../../theme';
import { initials } from '../../utils/format';

export function ProfilScreen() {
  const { user, logout, setDemoSpace } = useAuth();
  const { data, isFetching, refetch } = useLocataireProfile();
  const isAdmin = user?.user_type === 'ADMIN';

  const onLogout = async () => {
    const rt = await getRefreshToken();
    await logout(rt ?? undefined);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <ProfileAvatar size={88} />
          <Text style={styles.name}>{data?.nom ?? `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim()}</Text>
          <Text style={styles.role}>Locataire UPSide</Text>
          {data?.locations_actives ? (
            <Text style={styles.badge}>
              {data.locations_actives === 1
                ? '1 bail actif'
                : `${data.locations_actives} baux actifs`}
            </Text>
          ) : null}
        </View>

        <Card padding="lg">
          <Row label="Email" value={data?.email ?? user?.email ?? '—'} />
          <Row label="Téléphone" value={data?.telephone ?? user?.telephone ?? '—'} />
          <Row label="Adresse" value={data?.adresse ?? '—'} />
          <Row label="Ville" value={[data?.ville, data?.pays].filter(Boolean).join(', ') || '—'} last />
        </Card>

        {isAdmin ? (
          <View style={{ gap: spacing.sm }}>
            <Button
              label="Voir l'espace Propriétaire"
              variant="secondary"
              onPress={() => setDemoSpace('PROPRIETAIRE')}
            />
            <Button
              label="Voir l'espace Collaborateur"
              variant="secondary"
              onPress={() => setDemoSpace('COLLABORATEUR')}
            />
            <Text style={styles.demoHint}>
              Mode démo ADMIN : permet de basculer entre les espaces.
            </Text>
          </View>
        ) : null}

        <Button label="Se déconnecter" variant="dangerSoft" onPress={onLogout} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  header: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md, gap: spacing.xs },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarLetters: { color: colors.textInverse, fontWeight: fontWeight.bold, fontSize: fontSize.xl },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  role: { fontSize: fontSize.sm, color: colors.textMuted },
  badge: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    backgroundColor: colors.bgSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.semibold },
  rowValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.medium, maxWidth: '60%', textAlign: 'right' },
  demoHint: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
});
