import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import { useAuth } from '../../auth/store';
import { getRefreshToken } from '../../auth/tokenStorage';
import { QK_PROPRIO, useDemoCandidates, useProprietaireProfile } from '../../hooks/proprietaire';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';
import { initials } from '../../utils/format';

export function ProfilScreen() {
  const { user, logout, setDemoSpace, demoProprietaireId, setDemoProprietaireId } = useAuth();
  const { data, isFetching, refetch } = useProprietaireProfile();
  const isAdmin = user?.user_type === 'ADMIN';
  const qc = useQueryClient();
  const candidatesQ = useDemoCandidates(isAdmin);

  const pickCandidate = (id: number | null) => {
    setDemoProprietaireId(id);
    // Forcer le refresh de toutes les queries Propriétaire pour pointer sur le nouveau
    qc.invalidateQueries({ queryKey: QK_PROPRIO });
  };

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
          <Text style={styles.role}>Propriétaire UPSide</Text>
          {data ? (
            <View style={styles.badgeRow}>
              <Badge label={`${data.biens_total} bien${data.biens_total > 1 ? 's' : ''}`} />
              <Badge label={`${data.biens_loues} loué${data.biens_loues > 1 ? 's' : ''}`} tone="success" />
              {data.biens_vacants > 0 ? (
                <Badge label={`${data.biens_vacants} vacant${data.biens_vacants > 1 ? 's' : ''}`} tone="muted" />
              ) : null}
            </View>
          ) : null}
        </View>

        <Card padding="lg">
          <Row label="Email" value={data?.email ?? user?.email ?? '—'} />
          <Row label="Téléphone" value={data?.telephone ?? user?.telephone ?? '—'} />
          <Row label="Adresse" value={data?.adresse ?? '—'} />
          <Row label="Ville" value={[data?.ville, data?.pays].filter(Boolean).join(', ') || '—'} last />
        </Card>

        {data?.infos_bancaires ? (
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Coordonnées de versement</Text>
            <Text style={styles.bankInfo}>{data.infos_bancaires}</Text>
          </Card>
        ) : null}

        {isAdmin ? (
          <>
            {/* Sélecteur de propriétaire (mode démo) */}
            {candidatesQ.data && candidatesQ.data.length > 0 ? (
              <Card padding="lg">
                <Text style={styles.sectionTitle}>Incarner un propriétaire (démo)</Text>
                <Text style={styles.demoHint}>
                  Mode ADMIN : choisis le propriétaire à voir dans l'app.
                </Text>
                <View style={{ marginTop: spacing.sm, gap: 6 }}>
                  <CandidateRow
                    label="Auto (1er trouvé)"
                    sub="par défaut"
                    selected={demoProprietaireId == null}
                    onPress={() => pickCandidate(null)}
                  />
                  {candidatesQ.data.map((c) => (
                    <CandidateRow
                      key={c.id}
                      label={c.nom}
                      sub={[c.type, c.ville].filter(Boolean).join(' · ')}
                      selected={demoProprietaireId === c.id}
                      onPress={() => pickCandidate(c.id)}
                    />
                  ))}
                </View>
              </Card>
            ) : null}

            <View style={{ gap: spacing.sm }}>
              <Button
                label="Voir l'espace Locataire"
                variant="secondary"
                onPress={() => setDemoSpace('LOCATAIRE')}
              />
              <Button
                label="Voir l'espace Collaborateur"
                variant="secondary"
                onPress={() => setDemoSpace('COLLABORATEUR')}
              />
            </View>
          </>
        ) : null}

        <Button label="Se déconnecter" variant="dangerSoft" onPress={onLogout} />
      </ScrollView>
    </SafeAreaView>
  );
}

function CandidateRow({
  label, sub, selected, onPress,
}: { label: string; sub?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.candidateRow,
        selected && { backgroundColor: colors.bgSoft, borderColor: colors.primary },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.candidateLabel, selected && { color: colors.primary }]}>{label}</Text>
        {sub ? <Text style={styles.candidateSub}>{sub}</Text> : null}
      </View>
      {selected ? <Check size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'success' | 'muted' }) {
  const bg = tone === 'success' ? colors.successSoft : tone === 'muted' ? colors.borderLight : colors.bgSoft;
  const color = tone === 'success' ? '#047857' : tone === 'muted' ? colors.textMuted : colors.primary;
  return (
    <Text style={[styles.badge, { backgroundColor: bg, color }]}>{label}</Text>
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
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: 999, overflow: 'hidden',
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

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  bankInfo: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },
  demoHint: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  candidateLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  candidateSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});
