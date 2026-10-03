/**
 * Onglet "EDL" de l'espace locataire — liste des états des lieux où il est
 * concerné (entrée + sortie de toutes ses locations).
 *
 * Deux onglets :
 *   - "En cours" : BROUILLON | A_SIGNER | SIGNE (= dossier ouvert, attend la clôture).
 *   - "Clôturés" : CLOTURE (= dossier définitivement fermé).
 *
 * Tap sur une card → écran détail (lecture + signature de clôture le cas échéant).
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { ScreenHero } from '../../components/ScreenHero';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useLocataireEdls } from '../../hooks/locataire';
import type { LocataireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';
import { fmtDate } from '../../utils/format';

type Nav = NativeStackNavigationProp<LocataireStackParamList>;
type Tab = 'open' | 'closed';

export function EdlListScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('open');
  const { data, isLoading, isError, error, refetch, isFetching } = useLocataireEdls();

  const all = data ?? [];
  const ouverts = all.filter((e) => e.statut !== 'CLOTURE');
  const clotures = all.filter((e) => e.statut === 'CLOTURE');
  const visible = tab === 'open' ? ouverts : clotures;

  return (
    <View style={styles.safe}>
      <ScreenHero
        title="États des lieux"
        subtitle={`${all.length} au total`}
        stats={[
          { label: 'En cours', value: String(ouverts.length), fort: true },
          { label: 'Clôturés', value: String(clotures.length) },
        ]}
      />

      <View style={styles.tabs}>
        <TabBtn label={`En cours${ouverts.length ? ` (${ouverts.length})` : ''}`} active={tab === 'open'} onPress={() => setTab('open')} />
        <TabBtn label={`Clôturés${clotures.length ? ` (${clotures.length})` : ''}`} active={tab === 'closed'} onPress={() => setTab('closed')} />
      </View>

      {isLoading ? (
        <LoadingState label="Chargement des états des lieux…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {visible.length === 0 ? (
            <EmptyState
              icon="📋"
              title={tab === 'open' ? 'Aucun EDL en cours' : 'Aucun EDL clôturé'}
              description={tab === 'open'
                ? 'Votre agence vous notifiera dès qu\'un état des lieux sera planifié pour votre logement.'
                : 'Les EDL définitivement clôturés s\'afficheront ici.'}
            />
          ) : (
            visible.map((e) => {
              const needsLocataireSign =
                e.statut === 'SIGNE'
                && (e as { signature_locataire_cloture_data?: string | null }).signature_locataire_cloture_data == null;
              return (
                <Pressable key={e.id} onPress={() => nav.navigate('EdlDetail', { edlId: e.id })}>
                  <Card padding="md" style={styles.row}>
                    <View style={[styles.typePill, e.type === 'SORTIE' ? styles.typeSortie : styles.typeEntree]}>
                      <Text style={styles.typeLabel}>{e.type === 'SORTIE' ? 'Sortie' : 'Entrée'}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.ref}>{e.reference ?? `EDL #${e.id}`}</Text>
                      {e.unite_nom ? <Text style={styles.muted} numberOfLines={1}>{e.unite_nom}</Text> : null}
                      <Text style={styles.muted} numberOfLines={1}>
                        {e.date_edl ? `EDL ${fmtDate(e.date_edl)}` : 'Date à confirmer'}
                        {e.date_signature ? ` · signé le ${fmtDate(e.date_signature)}` : ''}
                      </Text>
                      {needsLocataireSign ? (
                        <Text style={styles.actionHint}>✍️ Signature de clôture à faire</Text>
                      ) : null}
                      {e.delai_chauffe_jours_restants != null && e.delai_chauffe_jours_restants > 0 ? (
                        <Text style={styles.warmupHint}>
                          🔥 Délai de chauffe : {e.delai_chauffe_jours_restants} jour{e.delai_chauffe_jours_restants > 1 ? 's' : ''}
                        </Text>
                      ) : null}
                    </View>
                    <StatusPill
                      label={statusLabel(e.statut)}
                      tone={statusTone(e.statut)}
                      style={{ alignSelf: 'flex-end' }}
                    />
                  </Card>
                </Pressable>
              );
            })
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
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark },
  subtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

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
  warmupHint: { fontSize: fontSize.xs, color: colors.warning, fontWeight: fontWeight.semibold, marginTop: 2 },
  actionHint: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold, marginTop: 2 },
});
