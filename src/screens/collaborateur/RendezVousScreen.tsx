/**
 * Espace Collaborateur — liste des rendez-vous (créateur ou participant)
 * avec onglets À venir / Passés. Bouton « Nouveau RDV » → écran de création.
 *
 * À chaque RDV créé/modifié sur le logiciel ERP web, l'event bus publie
 * `rdv.created` / `rdv.updated` qui invalide cette liste (sync temps réel).
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus, Trash2, User } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/store';
import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { ScreenHero } from '../../components/ScreenHero';
import { useCollaborateurRendezVous, useDeleteRendezVous } from '../../hooks/collaborateur';
import type { CollaborateurStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing, shadow} from '../../theme';

const MOIS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

function splitDate(iso: string | null | undefined): { day: string; month: string; year: string } {
  if (!iso) return { day: '—', month: '', year: '' };
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { day: iso, month: '', year: '' };
    return {
      day: String(d.getDate()).padStart(2, '0'),
      month: MOIS_FR[d.getMonth()] ?? '',
      year: String(d.getFullYear()),
    };
  } catch {
    return { day: iso, month: '', year: '' };
  }
}

type Nav = NativeStackNavigationProp<CollaborateurStackParamList>;
type Tab = 'upcoming' | 'past';

export function RendezVousScreen() {
  const nav = useNavigation<Nav>();
  const me = useAuth((s) => s.user);
  const [tab, setTab] = useState<Tab>('upcoming');
  const { data, isLoading, isError, error, refetch, isFetching } =
    useCollaborateurRendezVous(tab === 'upcoming');
  const deleteM = useDeleteRendezVous();

  // Autorise la suppression uniquement pour le créateur ou un ADMIN.
  const canDelete = (rdv: { created_by: number }) =>
    !!me && (me.id === rdv.created_by || me.user_type === 'ADMIN');

  const askDelete = (rdvId: number, objet: string) => {
    // Sur web, Alert.alert utilise window.confirm ; sur natif, boîte native
    // avec deux boutons. Dans les deux cas, callback OK ne s'exécute que si
    // l'utilisateur confirme.
    if (Platform.OS === 'web') {
      // @ts-ignore — window.confirm est bien dispo côté web
      if (typeof window !== 'undefined' && window.confirm(`Supprimer le rendez-vous « ${objet} » ?`)) {
        deleteM.mutate(rdvId, {
          onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Suppression impossible.'),
        });
      }
      return;
    }
    Alert.alert(
      'Supprimer le rendez-vous',
      `« ${objet} » sera définitivement supprimé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteM.mutate(rdvId, {
            onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Suppression impossible.'),
          }),
        },
      ],
    );
  };

  return (
    <View style={styles.safe}>
      <ScreenHero
        title="Rendez-vous"
        action={
          <Pressable onPress={() => nav.navigate('RdvCreate')} style={styles.actionHero}>
            <Plus size={16} color={colors.textInverse} />
            <Text style={styles.actionHeroLabel}>Nouveau</Text>
          </Pressable>
        }
      />
      <View style={{ display: 'none' }}>
      </View>

      <View style={styles.tabs}>
        <TabButton label="À venir" active={tab === 'upcoming'} onPress={() => setTab('upcoming')} />
        <TabButton label="Passés" active={tab === 'past'} onPress={() => setTab('past')} />
      </View>

      {isLoading ? (
        <LoadingState label="Chargement des rendez-vous…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {!data || data.length === 0 ? (
            <EmptyState
              icon="📅"
              title={tab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé'}
              description={tab === 'upcoming'
                ? 'Touchez « Nouveau » pour planifier un rendez-vous.'
                : "L'historique des rendez-vous s'affichera ici."}
            />
          ) : (
            data.map((rdv) => {
              const dt = splitDate(rdv.date_rdv);
              return (
                <Card key={rdv.id} padding="md" style={styles.row}>
                  {/* Calendar tile : mois en bandeau coloré + gros numéro + année */}
                  <View style={styles.dateTile}>
                    <View style={styles.dateTileTop}>
                      <Text style={styles.dateTileMonth}>{dt.month.toUpperCase()}</Text>
                    </View>
                    <View style={styles.dateTileBottom}>
                      <Text style={styles.dateTileDay}>{dt.day}</Text>
                      <Text style={styles.dateTileYear}>{dt.year}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.objet} numberOfLines={2}>{rdv.objet}</Text>
                    <Text style={styles.heureLine}>🕒 {rdv.heure_rdv}</Text>
                    {rdv.adresse ? (
                      <Text style={styles.muted} numberOfLines={2}>📍 {rdv.adresse}</Text>
                    ) : null}
                    {rdv.client?.nom ? (
                      <View style={styles.ligneAvecIcone}>
                      <User size={13} color={colors.textMuted} />
                      <Text style={styles.muted} numberOfLines={1}>{rdv.client.nom}</Text>
                    </View>
                    ) : null}
                  </View>
                  {canDelete(rdv) ? (
                    <Pressable
                      onPress={() => askDelete(rdv.id, rdv.objet)}
                      hitSlop={10}
                      disabled={deleteM.isPending}
                      style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </Card>
              );
            })
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
  ligneAvecIcone: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  fabLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textInverse },

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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },

  // Tuile « calendrier » : bandeau mois coloré + gros numéro de jour + année
  dateTile: {
    width: 62, borderRadius: radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.bgCard,
  },
  dateTileTop: { backgroundColor: colors.primary, paddingVertical: 3, alignItems: 'center' },
  dateTileMonth: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.textInverse, letterSpacing: 0.8 },
  dateTileBottom: { paddingVertical: 6, alignItems: 'center' },
  dateTileDay: { fontSize: 22, fontWeight: fontWeight.bold, color: colors.textDark, lineHeight: 24 },
  dateTileYear: { fontSize: 10, color: colors.textMuted, marginTop: 1 },

  objet: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  heureLine: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },
  muted: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  deleteBtn: {
    width: 32, height: 32, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
  },
});
