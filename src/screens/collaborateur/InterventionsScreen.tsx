import { Plus, User } from 'lucide-react-native';
/**
 * Espace Collaborateur — interventions.
 * Onglets "En cours" (EN_COURS, BLOCAGE, VALIDE) et "Passées" (CLOTURE).
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { ScreenHero } from '../../components/ScreenHero';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useCollabInterventions } from '../../hooks/collaborateur';
import type { CollaborateurStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';
import { fmtDate, fmtMontant } from '../../utils/format';

type Nav = NativeStackNavigationProp<CollaborateurStackParamList>;

type Tab = 'open' | 'closed';

export function InterventionsScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('open');
  const { data, isLoading, isError, error, refetch, isFetching } = useCollabInterventions(tab === 'open');

  return (
    <View style={styles.safe}>
      <ScreenHero
        title="Interventions"
        action={(
          <Pressable style={styles.newBtn} onPress={() => nav.navigate('InterventionCreate')}>
            <Plus size={16} color={colors.textInverse} />
            <Text style={styles.newBtnLabel}>Nouvelle</Text>
          </Pressable>
        )}
      />

      <View style={styles.tabs}>
        <TabButton label="En cours" active={tab === 'open'} onPress={() => setTab('open')} />
        <TabButton label="Passées" active={tab === 'closed'} onPress={() => setTab('closed')} />
      </View>

      {isLoading ? (
        <LoadingState label="Chargement des interventions…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {!data || data.length === 0 ? (
            <EmptyState
              icon="🛠️"
              title={tab === 'open' ? 'Aucune intervention en cours' : 'Aucune intervention passée'}
              description={tab === 'open'
                ? 'Les nouvelles demandes apparaîtront ici.'
                : 'L\'historique s\'affichera ici une fois des interventions clôturées.'}
            />
          ) : (
            data.map((i) => (
              <Pressable key={i.id} onPress={() => nav.navigate('InterventionDetail', { interventionId: i.id })}>
              <Card padding="md" style={styles.row}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.ref}>{i.reference ?? `#${i.id}`}</Text>
                    {i.priorite === 'URGENTE' || i.priorite === 'HAUTE' ? (
                      <View style={[styles.prioPill, i.priorite === 'URGENTE' ? styles.prioUrgente : styles.prioHaute]}>
                        <Text style={styles.prioLabel}>{i.priorite}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.titre} numberOfLines={2}>{i.titre}</Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {[i.unite_nom, i.categorie].filter(Boolean).join(' · ')}
                  </Text>
                  {i.locataire_nom ? (
                    <View style={styles.ligneAvecIcone}>
                      <User size={13} color={colors.textMuted} />
                      <Text style={styles.muted} numberOfLines={1}>{i.locataire_nom}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.dateText}>
                    {tab === 'closed' && i.date_cloture
                      ? `Clôturée le ${fmtDate(i.date_cloture)}`
                      : `Créée le ${fmtDate(i.created_at)}`}
                  </Text>
                </View>
                <View style={styles.right}>
                  <StatusPill
                    label={statusLabel(i.statut)}
                    tone={statusTone(i.statut)}
                    style={{ alignSelf: 'flex-end' }}
                  />
                  {i.cout > 0 ? (
                    <Text style={styles.cout}>{fmtMontant(i.cout)}</Text>
                  ) : null}
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

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryDark,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  newBtnLabel: { color: colors.textInverse, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  ligneAvecIcone: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark },

  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
  tab: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    borderRadius: radius.pill, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  tabLabelActive: { color: colors.textInverse },

  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ref: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },
  titre: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  muted: { fontSize: fontSize.xs, color: colors.textMuted },
  dateText: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  cout: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },

  prioPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  prioUrgente: { backgroundColor: colors.dangerSoft },
  prioHaute: { backgroundColor: colors.warningSoft },
  prioLabel: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.textDark, letterSpacing: 0.5 },
});
