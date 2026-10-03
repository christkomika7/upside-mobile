import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { ScreenHero } from '../../components/ScreenHero';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useLocataireFactures } from '../../hooks/locataire';
import type { FactureSummary } from '../../types/api';
import type { LocataireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';
import { fmtDate, fmtMontant } from '../../utils/format';

type Nav = NativeStackNavigationProp<LocataireStackParamList>;
type Tab = 'due' | 'paid';

const ALL_UNITS = '__all__';

export function FacturesScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('due');
  const [unitFilter, setUnitFilter] = useState<string>(ALL_UNITS);
  const { data, isLoading, isError, error, refetch, isFetching } = useLocataireFactures();

  // Liste des unités présentes parmi les factures (pour le multi-bail).
  const unites = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const f of data) {
      const key = f.unite_id != null ? `u-${f.unite_id}` : '';
      const label = f.unite_nom ?? '';
      if (key && label) map.set(key, label);
    }
    return Array.from(map, ([key, label]) => ({ key, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [data]);

  // Compteurs par tab pour libellés
  const dueCount = (data ?? []).filter((f) => f.solde_du > 0).length;
  const paidCount = (data ?? []).filter((f) => f.solde_du <= 0).length;

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data;
    if (unitFilter !== ALL_UNITS) {
      list = list.filter((f) => (f.unite_id != null ? `u-${f.unite_id}` === unitFilter : false));
    }
    if (tab === 'due') return list.filter((f) => f.solde_du > 0);
    return list.filter((f) => f.solde_du <= 0);
  }, [data, tab, unitFilter]);

  return (
    <View style={styles.safe}>
      <ScreenHero title="Mes factures" />

      {/* Onglets En cours (à payer) / Passées (payées) — uniformes avec Mon bail */}
      <View style={styles.tabs}>
        <TabButton
          label={`En cours${dueCount ? ` (${dueCount})` : ''}`}
          active={tab === 'due'}
          onPress={() => setTab('due')}
        />
        <TabButton
          label={`Passées${paidCount ? ` (${paidCount})` : ''}`}
          active={tab === 'paid'}
          onPress={() => setTab('paid')}
        />
      </View>

      {/* Pilules par bien — toujours visibles pour rester homogène avec Mon bail */}
      {unites.length > 0 ? (
        <View style={styles.unitsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.unitsScroll}
            contentContainerStyle={styles.unitsRow}
          >
            <UnitPill
              label="Toutes"
              active={unitFilter === ALL_UNITS}
              onPress={() => setUnitFilter(ALL_UNITS)}
            />
            {unites.map((u) => (
              <UnitPill
                key={u.key}
                label={u.label}
                active={unitFilter === u.key}
                onPress={() => setUnitFilter(u.key)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {isLoading ? (
        <LoadingState label="Chargement des factures…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {filtered.length === 0 ? (
            <EmptyState
              icon="🧾"
              title="Aucune facture"
              description={
                tab === 'due'
                  ? "Vous êtes à jour ! Aucune facture en attente."
                  : 'Aucune facture payée pour le moment.'
              }
            />
          ) : (
            filtered.map((f) => (
              <FactureRow
                key={f.id}
                facture={f}
                onPress={() => nav.navigate('FactureDetail', { factureId: f.id })}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function UnitPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.unitPill, active && styles.unitPillActive]}>
      <Text style={[styles.unitPillLabel, active && styles.unitPillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function FactureRow({ facture, onPress }: { facture: FactureSummary; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.numero}>{facture.numero}</Text>
          {facture.unite_nom ? <Text style={styles.uniteRef}>{facture.unite_nom}</Text> : null}
          <Text style={styles.muted}>Émise le {fmtDate(facture.date_emission)}</Text>
          {facture.date_echeance ? <Text style={styles.muted}>Échéance {fmtDate(facture.date_echeance)}</Text> : null}
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{fmtMontant(facture.solde_du > 0 ? facture.solde_du : facture.total_ttc)}</Text>
          <StatusPill label={statusLabel(facture.statut)} tone={statusTone(facture.statut)} style={{ alignSelf: 'flex-end' }} />
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
  numero: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  uniteRef: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  muted: { fontSize: fontSize.xs, color: colors.textMuted },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },

  // Filtre par bien (multi-baux) — hauteur fixe pour contraindre le ScrollView
  unitsWrapper: { height: 36, marginBottom: spacing.sm },
  unitsScroll: { flexGrow: 0 },
  unitsRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    alignItems: 'center',
  },
  unitPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
    justifyContent: 'center',
  },
  unitPillActive: { backgroundColor: colors.primary },
  unitPillLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  unitPillLabelActive: { color: colors.textInverse },
});
