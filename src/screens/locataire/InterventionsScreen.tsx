import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { Plus } from 'lucide-react-native';
import { ScreenHero } from '../../components/ScreenHero';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useLocataireInterventions } from '../../hooks/locataire';
import type { LocataireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing, shadow} from '../../theme';
import { fmtDateRelative } from '../../utils/format';

type Nav = NativeStackNavigationProp<LocataireStackParamList>;
type Tab = 'en_cours' | 'terminees';

// Statuts intervention : EN_COURS, BLOCAGE, VALIDE, CLOTURE
const TERMINAL_STATUTS = new Set(['CLOTURE']);
const ALL_UNITS = '__all__';

export function InterventionsScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('en_cours');
  const [unitFilter, setUnitFilter] = useState<string>(ALL_UNITS);
  const { data, isLoading, isError, error, refetch, isFetching } = useLocataireInterventions();

  // Liste des unités présentes parmi les interventions (cas multi-baux).
  const unites = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const i of data) {
      const key = i.unite_id != null ? `u-${i.unite_id}` : '';
      const label = i.unite_nom ?? '';
      if (key && label) map.set(key, label);
    }
    return Array.from(map, ([key, label]) => ({ key, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [data]);

  const { enCours, terminees } = useMemo(() => {
    const all = data ?? [];
    const matchesUnit = (i: { unite_id: number | null }) =>
      unitFilter === ALL_UNITS || (i.unite_id != null && `u-${i.unite_id}` === unitFilter);
    const filtered = all.filter(matchesUnit);
    return {
      enCours: filtered.filter((i) => !TERMINAL_STATUTS.has((i.statut || '').toUpperCase())),
      terminees: filtered.filter((i) => TERMINAL_STATUTS.has((i.statut || '').toUpperCase())),
    };
  }, [data, unitFilter]);

  const visible = tab === 'en_cours' ? enCours : terminees;

  return (
    <View style={styles.safe}>
      <ScreenHero
        title="Mes interventions"
        action={
          <Pressable onPress={() => nav.navigate('InterventionCreate')} style={styles.actionHero}>
            <Plus size={16} color={colors.textInverse} />
            <Text style={styles.actionHeroLabel}>Nouvelle</Text>
          </Pressable>
        }
      />

      <View style={styles.tabs}>
        <TabButton
          label={`En cours${enCours.length ? ` (${enCours.length})` : ''}`}
          active={tab === 'en_cours'}
          onPress={() => setTab('en_cours')}
        />
        <TabButton
          label={`Terminées${terminees.length ? ` (${terminees.length})` : ''}`}
          active={tab === 'terminees'}
          onPress={() => setTab('terminees')}
        />
      </View>

      {/* Filtre par unité — affiché seulement si plusieurs unités */}
      {unites.length > 1 ? (
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
        <LoadingState label="Chargement…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {visible.length === 0 ? (
            tab === 'en_cours' ? (
              <EmptyState
                icon="🔧"
                title="Aucune intervention en cours"
                description="Vous avez un problème dans votre logement ? Créez une demande, votre agence sera notifiée immédiatement."
                actionLabel="Créer une demande"
                onAction={() => nav.navigate('InterventionCreate')}
              />
            ) : (
              <EmptyState
                icon="✅"
                title="Aucune intervention terminée"
                description="L'historique de vos interventions clôturées s'affichera ici."
              />
            )
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
                    {i.unite_nom ? (
                      <Text style={styles.uniteRef}>
                        {i.unite_nom}
                        {i.portee === 'PARTIES_COMMUNES' ? ' · Parties communes' : ''}
                      </Text>
                    ) : null}
                    <Text style={styles.muted}>
                      {[i.categorie, fmtDateRelative(i.created_at)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <StatusPill label={statusLabel(i.statut)} tone={statusTone(i.statut)} />
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

function UnitPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.unitPill, active && styles.unitPillActive]}>
      <Text style={[styles.unitPillLabel, active && styles.unitPillLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Pastille vert profond PLEINE. Elle était en blanc translucide, pour se
  // détacher de l'ancien bandeau vert ; sur le fond clair du nouvel en-tête,
  // elle devenait illisible.
  actionHero: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    ...shadow.card,
  },
  actionHeroLabel: { color: colors.textInverse, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark, flex: 1 },

  tabs: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.sm },
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
  itemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  uniteRef: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  muted: { fontSize: fontSize.xs, color: colors.textMuted },

  // Filtre par unité (multi-baux) — hauteur fixe pour contraindre le ScrollView
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
