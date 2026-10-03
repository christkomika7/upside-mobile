import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { HERO_OVERLAP, ScreenHero } from '../../components/ScreenHero';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import {
  useCoutEnValidation,
  useDevisEnValidation,
  useProprietaireInterventions,
} from '../../hooks/proprietaire';
import type { ProprietaireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';
import { fmtDateRelative, fmtMontant } from '../../utils/format';

type Nav = NativeStackNavigationProp<ProprietaireStackParamList>;
type Tab = 'en_cours' | 'termines';

// Statuts intervention : EN_COURS, BLOCAGE, CLOTURE
// Onglet « En cours » = EN_COURS + BLOCAGE ; onglet « Clôturées » = CLOTURE.
const CLOSED_STATUTS = new Set(['CLOTURE']);

export function InterventionsScreen() {
  const nav = useNavigation<Nav>();
  const intQ = useProprietaireInterventions();
  const devisQ = useDevisEnValidation();
  const coutQ = useCoutEnValidation();

  const [tab, setTab] = useState<Tab>('en_cours');

  const { enCours, termines } = useMemo(() => {
    const list = intQ.data ?? [];
    const enCours = list.filter((i) => !CLOSED_STATUTS.has((i.statut || '').toUpperCase()));
    const termines = list.filter((i) => CLOSED_STATUTS.has((i.statut || '').toUpperCase()));
    return { enCours, termines };
  }, [intQ.data]);

  const visible = tab === 'en_cours' ? enCours : termines;

  // Index intervention par id → pour nommer l'intervention d'un devis.
  const intById = useMemo(
    () => new Map((intQ.data ?? []).map((i) => [i.id, i])),
    [intQ.data],
  );

  // Devis en attente REGROUPÉS PAR INTERVENTION : le propriétaire veut savoir
  // sur QUELLE intervention il a des devis à valider, puis l'ouvrir pour les
  // comparer et décider — pas une liste de devis hors contexte.
  const devisParIntervention = useMemo(() => {
    const map = new Map<number, { interventionId: number; count: number; total: number }>();
    for (const d of devisQ.data ?? []) {
      const e = map.get(d.intervention_id) ?? { interventionId: d.intervention_id, count: 0, total: 0 };
      e.count += 1;
      e.total += d.total_ttc || 0;
      map.set(d.intervention_id, e);
    }
    return [...map.values()];
  }, [devisQ.data]);

  return (
    <View style={styles.safe}>
      <ScreenHero
        title="Interventions"
        stats={[
          { label: 'En cours', value: String(enCours.length), fort: true },
          { label: 'Terminées', value: String(termines.length) },
        ]}
      />

      {/* Onglets En cours / Terminés */}
      <View style={styles.tabsRow}>
        <TabBtn
          label={`En cours${enCours.length ? ` (${enCours.length})` : ''}`}
          active={tab === 'en_cours'}
          onPress={() => setTab('en_cours')}
        />
        <TabBtn
          label={`Terminées${termines.length ? ` (${termines.length})` : ''}`}
          active={tab === 'termines'}
          onPress={() => setTab('termines')}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={intQ.isFetching || devisQ.isFetching || coutQ.isFetching}
            onRefresh={() => { intQ.refetch(); devisQ.refetch(); coutQ.refetch(); }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Bandeau devis en attente — REGROUPÉS PAR INTERVENTION. On clique sur
            une intervention pour l'ouvrir, voir ses devis et les décider. */}
        {devisParIntervention.length > 0 ? (
          <Card padding="lg" style={styles.alertCard}>
            <Text style={styles.alertTitle}>
              ⚠ Devis à valider
            </Text>
            <Text style={styles.alertText}>
              Des devis de prestataires attendent votre validation. Ouvrez l'intervention concernée pour les comparer et décider.
            </Text>
            {devisParIntervention.map((g) => {
              const it = intById.get(g.interventionId);
              return (
                <Pressable
                  key={g.interventionId}
                  onPress={() => nav.navigate('InterventionDetail', { interventionId: g.interventionId })}
                  style={styles.alertItem}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertItemRef} numberOfLines={1}>
                      {it?.titre ?? `Intervention #${g.interventionId}`}
                    </Text>
                    <Text style={styles.alertItemSub} numberOfLines={1}>
                      {g.count} devis à valider{it?.unite_nom ? ` · ${it.unite_nom}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.alertItemAmount}>{fmtMontant(g.total)}</Text>
                </Pressable>
              );
            })}
          </Card>
        ) : null}

        {/* Bandeau coûts d'intervention en attente de validation */}
        {coutQ.data && coutQ.data.length > 0 ? (
          <Card padding="lg" style={styles.alertCardCout}>
            <Text style={styles.alertTitleCout}>
              ⚠ {coutQ.data.length} coût{coutQ.data.length > 1 ? 's' : ''} d'intervention à valider
            </Text>
            <Text style={styles.alertText}>
              L'agence a saisi un coût supérieur au seuil paramétré. Validez ou refusez avec un motif.
            </Text>
            {coutQ.data.slice(0, 3).map((i) => (
              <Pressable
                key={i.id}
                onPress={() => nav.navigate('InterventionDetail', { interventionId: i.id })}
                style={styles.alertItem}
              >
                <Text style={styles.alertItemRef}>
                  {i.reference ?? `Intervention #${i.id}`} · {i.titre ?? '—'}
                </Text>
                <Text style={styles.alertItemAmount}>{fmtMontant(i.cout)}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}

        {/* Liste des interventions (filtrée par onglet) */}
        {intQ.isLoading ? (
          <LoadingState label="Chargement…" />
        ) : intQ.isError ? (
          <ErrorState error={intQ.error} onRetry={intQ.refetch} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="🔧"
            title={tab === 'en_cours' ? 'Aucune intervention en cours' : 'Aucune intervention terminée'}
            description={tab === 'en_cours'
              ? "Les nouvelles interventions sur vos biens s'afficheront ici."
              : "Les interventions clôturées apparaîtront ici une fois terminées."}
          />
        ) : (
          visible.map((i) => (
            <Pressable
              key={i.id}
              onPress={() => nav.navigate('InterventionDetail', { interventionId: i.id })}
            >
              <Card padding="md" style={styles.row}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {i.titre ?? `Intervention #${i.id}`}
                  </Text>
                  <Text style={styles.muted}>
                    {[i.categorie, i.unite_nom, fmtDateRelative(i.created_at)].filter(Boolean).join(' · ')}
                  </Text>
                  {i.cout > 0 ? <Text style={styles.cout}>{fmtMontant(i.cout)}</Text> : null}
                </View>
                <StatusPill label={statusLabel(i.statut)} tone={statusTone(i.statut)} />
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabBtnLabel, active && styles.tabBtnLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark },

  tabsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  tabBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  tabBtnLabelActive: { color: colors.textInverse },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  muted: { fontSize: fontSize.xs, color: colors.textMuted },
  cout: { fontSize: fontSize.xs, color: colors.textDark, fontWeight: fontWeight.semibold, marginTop: 2 },

  alertCard: { backgroundColor: colors.warningSoft, borderColor: 'transparent' },
  alertTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#92400E' },
  alertCardCout: { backgroundColor: colors.dangerSoft, borderColor: 'transparent' },
  alertTitleCout: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#991B1B' },
  alertText: { fontSize: fontSize.xs, color: '#78350F', marginTop: 4, marginBottom: spacing.md, lineHeight: 18 },
  alertItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: 12,
    marginBottom: 6,
  },
  alertItemRef: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  alertItemSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  alertItemAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#B45309' },
});
