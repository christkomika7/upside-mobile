import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { ScreenHero } from '../../components/ScreenHero';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useLocataireBails } from '../../hooks/locataire';
import type { LocataireBail } from '../../types/api';
import type { LocataireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';
import { fmtDate, fmtMontant } from '../../utils/format';

type Nav = NativeStackNavigationProp<LocataireStackParamList>;
type Tab = 'actuel' | 'passes';

export function BailScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('actuel');
  const { data, isLoading, isError, error, refetch, isFetching } = useLocataireBails();

  const actuels = data?.actuels ?? (data?.actuel ? [data.actuel] : []);
  const passes = data?.passes ?? [];
  const currentList = tab === 'actuel' ? actuels : passes;

  return (
    <View style={styles.safe}>
      <ScreenHero title="Mes baux" />

      <View style={styles.tabs}>
        <TabButton
          label={`En cours${actuels.length ? ` (${actuels.length})` : ''}`}
          active={tab === 'actuel'}
          onPress={() => setTab('actuel')}
        />
        <TabButton
          label={`Passés${passes.length ? ` (${passes.length})` : ''}`}
          active={tab === 'passes'}
          onPress={() => setTab('passes')}
        />
      </View>

      {isLoading ? (
        <LoadingState label="Chargement des baux…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {currentList.length === 0 ? (
            <EmptyState
              icon="📋"
              title={tab === 'actuel' ? 'Aucun bail en cours' : 'Aucun bail passé'}
              description={tab === 'actuel'
                ? "Aucun bail actif n'est rattaché à votre compte pour le moment."
                : "L'historique de vos baux s'affichera ici."}
            />
          ) : (
            currentList.map((b) => (
              <BailRow
                key={b.id}
                bail={b}
                onPress={() => nav.navigate('BailDetail', { bailId: b.id })}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function BailRow({ bail, onPress }: { bail: LocataireBail; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.ref}>{bail.reference ?? `Bail #${bail.id}`}</Text>
          {bail.unite_nom ? <Text style={styles.uniteRef}>{bail.unite_nom}</Text> : null}
          <Text style={styles.muted}>
            Du {fmtDate(bail.date_debut)} au {fmtDate(bail.date_fin)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{fmtMontant(bail.loyer_total)}</Text>
          <Text style={styles.amountSub}>/ mois</Text>
          <StatusPill label={statusLabel(bail.statut)} tone={statusTone(bail.statut)} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  tabLabelActive: { color: colors.textInverse },

  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ref: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  uniteRef: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  muted: { fontSize: fontSize.xs, color: colors.textMuted },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },
  amountSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: -4 },
});
