import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { HERO_OVERLAP, ScreenHero } from '../../components/ScreenHero';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useProprietaireFactures } from '../../hooks/proprietaire';
import type { ProprietaireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, spacing } from '../../theme';
import { fmtDate, fmtMontant } from '../../utils/format';

type Nav = NativeStackNavigationProp<ProprietaireStackParamList>;

export function FacturesScreen() {
  const nav = useNavigation<Nav>();
  const { data, isLoading, isError, error, refetch, isFetching } = useProprietaireFactures();

  return (
    <View style={styles.safe}>
      <ScreenHero
        title="Factures de gestion"
        subtitle={`${data?.length ?? 0} facture${(data?.length ?? 0) > 1 ? 's' : ''}`}
      />

      {isLoading ? (
        <LoadingState label="Chargement…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {!data || data.length === 0 ? (
            <EmptyState
              icon="🧾"
              title="Aucune facture"
              description="Les factures de gestion s'afficheront ici."
            />
          ) : (
            data.map((f) => (
              <Pressable key={f.id} onPress={() => nav.navigate('FactureDetail', { factureId: f.id })}>
                <Card padding="md" style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.numero}>{f.numero}</Text>
                    <Text style={styles.muted}>Émise le {fmtDate(f.date_emission)}</Text>
                    {f.date_echeance ? <Text style={styles.muted}>Échéance {fmtDate(f.date_echeance)}</Text> : null}
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.amount}>{fmtMontant(f.total_ttc)}</Text>
                    <StatusPill
                      label={statusLabel(f.statut)}
                      tone={statusTone(f.statut)}
                      style={{ alignSelf: 'flex-end' }}
                    />
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  numero: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  muted: { fontSize: fontSize.xs, color: colors.textMuted },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },
});
