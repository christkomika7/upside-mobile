/**
 * Espace Collaborateur — liste des états des lieux.
 * 2 onglets : "À terminer" (BROUILLON + A_SIGNER) et "Signés".
 * Bouton + pour créer un nouvel EDL.
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { ScreenHero } from '../../components/ScreenHero';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useCollabEdls } from '../../hooks/collaborateur';
import type { CollaborateurStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing, shadow} from '../../theme';
import { fmtDate } from '../../utils/format';

type Nav = NativeStackNavigationProp<CollaborateurStackParamList>;
type Tab = 'open' | 'signed';

export function EdlListScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('open');
  const { data, isLoading, isError, error, refetch, isFetching } = useCollabEdls(tab === 'open');

  return (
    <View style={styles.safe}>
      <ScreenHero
        title="États des lieux"
        action={
          <Pressable onPress={() => nav.navigate('EdlCreate')} style={styles.actionHero}>
            <Plus size={16} color={colors.textInverse} />
            <Text style={styles.actionHeroLabel}>Nouveau</Text>
          </Pressable>
        }
      />

      <View style={styles.tabs}>
        <TabBtn label="À terminer" active={tab === 'open'} onPress={() => setTab('open')} />
        <TabBtn label="Signés" active={tab === 'signed'} onPress={() => setTab('signed')} />
      </View>

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
              icon="📋"
              title={tab === 'open' ? 'Aucun EDL à terminer' : 'Aucun EDL signé'}
              description={tab === 'open'
                ? 'Touchez « Nouveau » pour démarrer un état des lieux.'
                : 'Les EDL clôturés s\'afficheront ici.'}
            />
          ) : (
            data.map((e) => (
              <Pressable key={e.id} onPress={() => nav.navigate('EdlEdit', { edlId: e.id })}>
                <Card padding="md" style={styles.row}>
                  <View style={[styles.typePill, e.type === 'SORTIE' ? styles.typeSortie : styles.typeEntree]}>
                    <Text style={styles.typeLabel}>{e.type === 'SORTIE' ? 'Sortie' : 'Entrée'}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.ref}>{e.reference ?? `#${e.id}`}</Text>
                    {e.unite_nom ? <Text style={styles.muted} numberOfLines={1}>{e.unite_nom}</Text> : null}
                    <Text style={styles.muted} numberOfLines={1}>
                      {e.date_edl ? `EDL ${fmtDate(e.date_edl)}` : 'Date non saisie'}
                      {e.signataire_locataire ? ` · ${e.signataire_locataire}` : ''}
                    </Text>
                  </View>
                  <StatusPill
                    label={statusLabel(e.statut)}
                    tone={statusTone(e.statut)}
                    style={{ alignSelf: 'flex-end' }}
                  />
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  fabLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textInverse },

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

  typePill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.md },
  typeEntree: { backgroundColor: colors.primary + '22' },
  typeSortie: { backgroundColor: colors.warningSoft },
  typeLabel: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.textDark, letterSpacing: 0.5 },

  ref: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  muted: { fontSize: fontSize.xs, color: colors.textMuted },
});
