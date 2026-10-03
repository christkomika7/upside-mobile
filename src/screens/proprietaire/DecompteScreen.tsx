import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, FileBarChart } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import DonutChart from '../../components/DonutChart';
import { CardHeading, InfoNote, Legend } from '../../components/DataUI';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { HERO_OVERLAP, ScreenHero } from '../../components/ScreenHero';
import { useDecompteDetail, useDecompteGlobal } from '../../hooks/proprietaire';
import type { ProprietaireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';
import { fmtMontant, fmtMontantCourt } from '../../utils/format';

type Nav = NativeStackNavigationProp<ProprietaireStackParamList>;

export function DecompteScreen() {
  const nav = useNavigation<Nav>();
  const decompteQ = useDecompteGlobal();
  const detailQ = useDecompteDetail({});

  if (decompteQ.isLoading) return <LoadingState label="Chargement du décompte…" />;
  if (decompteQ.isError) return <ErrorState error={decompteQ.error} onRetry={decompteQ.refetch} />;

  const d = decompteQ.data;
  const detail = detailQ.data;

  return (
    <View style={styles.safe}>
      <ScreenHero
        title="Comptes"
        subtitle="Situation cumulée à ce jour"
        stats={d ? [
          { label: 'Solde à reverser', value: fmtMontantCourt(d.total_solde), fort: true },
          { label: 'Encaissé', value: fmtMontantCourt(d.total_encaisse) },
          { label: 'Frais de gestion', value: fmtMontantCourt(d.total_commissions) },
        ] : undefined}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={decompteQ.isFetching || detailQ.isFetching}
            onRefresh={() => {
              decompteQ.refetch();
              detailQ.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {d ? (
          <>
            {/* Dashboard — Résumé : la formule complète, en cascade */}
            <Card padding="lg">
              <CardHeading overline="Comment le solde se compose" title="Détail du calcul" />
              {(() => {
                const postes = [
                  { label: 'Loyers encaissés', montant: d.total_encaisse, signe: '+' as const },
                  ...(d.total_tsil_due > 0
                    ? [{ label: "TSIL due (à reverser à l'État)", montant: d.total_tsil_due, signe: '−' as const }]
                    : []),
                  { label: 'Dépenses propriétaire (hors TSIL)', montant: d.total_decaisse, signe: '−' as const },
                  { label: 'Frais de gestion', montant: d.total_commissions, signe: '−' as const },
                  ...(d.total_reverse > 0
                    ? [{ label: 'Versements déjà effectués', montant: d.total_reverse, signe: '−' as const }]
                    : []),
                ];
                // Échelle commune : la plus grande valeur donne la barre pleine.
                // Sans référence partagée, deux barres de longueurs égales
                // pourraient représenter des montants très différents.
                const max = Math.max(...postes.map((x) => x.montant), 1);
                return (
                  <>
                    <View style={styles.postes}>
                      {postes.map((x) => (
                        <View key={x.label} style={styles.poste}>
                          <View style={styles.posteHaut}>
                            <Text style={styles.posteLabel} numberOfLines={2}>{x.label}</Text>
                            <Text style={[styles.posteMontant, x.signe === '+' ? styles.tdIn : styles.tdOut]}>
                              {x.signe} {fmtMontant(x.montant)}
                            </Text>
                          </View>
                          <View style={styles.jauge}>
                            <View
                              style={[
                                styles.jaugeRemplie,
                                x.signe === '+' ? styles.jaugeIn : styles.jaugeOut,
                                { width: `${Math.max(2, (x.montant / max) * 100)}%` },
                              ]}
                            />
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Récap final : ce qui a déjà été versé au propriétaire et
                        ce qui lui reste dû (= solde à reverser). */}
                    <View style={styles.calcTotaux}>
                      <View style={styles.calcTotalRow}>
                        <Text style={styles.calcTotalLabel}>Déjà versé au proprio</Text>
                        <Text style={styles.calcTotalValue}>{fmtMontant(d.total_reverse)}</Text>
                      </View>
                      <View style={[styles.calcTotalRow, styles.calcTotalRowFort]}>
                        <Text style={styles.calcTotalLabelFort}>Dû au propriétaire</Text>
                        <Text style={styles.calcTotalValueFort}>{fmtMontant(d.total_solde)}</Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </Card>

            {/* Répartition des encaissements — anneau + légende chiffrée.
                Purement descriptif : chaque part reprend un total DÉJÀ calculé
                par l'API, aucun montant n'est recalculé ici. */}
            {(() => {
              const parts = [
                { label: 'Solde à reverser', value: Math.max(0, d.total_solde) },
                { label: 'Frais de gestion', value: d.total_commissions },
                { label: 'Dépenses', value: d.total_decaisse },
                { label: 'TSIL due', value: d.total_tsil_due },
                { label: 'Déjà versé', value: d.total_reverse },
              ].filter(p => p.value > 0);
              if (parts.length === 0) return null;
              const total = parts.reduce((s, p) => s + p.value, 0);
              const plusGros = parts.reduce((a, b) => (b.value > a.value ? b : a));
              return (
                <Card padding="lg">
                  <CardHeading
                    overline="Sur les loyers encaissés"
                    title="Répartition"
                    right={<Text style={styles.repartTotal}>{fmtMontant(d.total_encaisse)}</Text>}
                  />
                  <DonutChart data={parts} />
                  <View style={styles.repartLegend}>
                    <Legend
                      items={parts.map(p => ({
                        label: p.label,
                        value: fmtMontant(p.value),
                        percent: (p.value / total) * 100,
                      }))}
                    />
                  </View>
                  <InfoNote>
                    <Text style={styles.noteFort}>{plusGros.label}</Text> représente le poste le plus
                    important ({Math.round((plusGros.value / total) * 100)} %).
                  </InfoNote>
                </Card>
              );
            })()}

            {/* Résumé par bien — UNE carte par immeuble. Pas de bloc « Tous les
                biens » : le total figure déjà dans les cartes KPI en haut. */}
            {detail && detail.immeubles.length > 0 ? (
              <>
                <Text style={styles.rbSection}>RÉSUMÉ PAR IMMEUBLE</Text>
                {detail.immeubles.map((im) => {
                  const postes = [
                    { cle: 'Encaissé', montant: im.encaisse, ton: 'in' as const },
                    { cle: 'Décaissé (comm. comprise)', montant: im.decaisse + im.commission, ton: 'out' as const },
                    { cle: 'TSIL reversée', montant: im.tsil_reverse ?? 0, ton: 'neutre' as const },
                  ];
                  // Échelle interne au bien : comparer d'un bien à l'autre serait
                  // faux, leurs ordres de grandeur n'ayant rien à voir.
                  const max = Math.max(...postes.map((x) => x.montant), 1);
                  return (
                    <Card key={im.id} padding="lg">
                      <Text style={styles.rbNomCarte} numberOfLines={2}>{im.nom}</Text>
                      {postes.map((x) => (
                        <View key={x.cle} style={styles.rbPoste}>
                          <View style={styles.rbLigne}>
                            <Text style={styles.rbCle}>{x.cle}</Text>
                            <Text
                              style={[
                                styles.rbValeur,
                                x.ton === 'in' ? styles.tdIn : x.ton === 'out' ? styles.tdOut : null,
                              ]}
                            >
                              {fmtMontant(x.montant)}
                            </Text>
                          </View>
                          <View style={styles.jauge}>
                            <View
                              style={[
                                styles.jaugeRemplie,
                                x.ton === 'in' ? styles.jaugeIn : styles.jaugeOut,
                                { width: `${Math.max(2, (x.montant / max) * 100)}%` },
                              ]}
                            />
                          </View>
                        </View>
                      ))}
                    </Card>
                  );
                })}
                <Text style={styles.note}>
                  La TSIL reversée à l'État est un suivi séparé : elle n'entre pas dans le solde à reverser au propriétaire.
                </Text>
              </>
            ) : null}

            {/* CTA → écran Transactions (filtres période/unité + PDF) */}
            <Pressable onPress={() => nav.navigate('Transactions')} style={styles.cta}>
              <View style={styles.ctaIcon}>
                <FileBarChart size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Détail des transactions</Text>
                <Text style={styles.ctaSub}>
                  Filtrer par unité, période · imprimer / télécharger le décompte PDF
                </Text>
              </View>
              <ArrowRight size={20} color={colors.textMuted} />
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}


function BreakRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakRow}>
      <Text style={styles.breakLabel}>{label}</Text>
      <Text style={styles.breakValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rbSection: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: -spacing.xs,
  },
  rbNomCarte: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark, marginBottom: spacing.sm },
  rbBloc: { paddingTop: spacing.md, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 2 },
  rbBlocTotal: { borderTopWidth: 2, borderTopColor: colors.primary },
  rbNom: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark, marginBottom: 4 },
  rbPoste: { gap: 4, marginTop: 6 },
  rbLigne: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  rbCle: { flex: 1, fontSize: fontSize.xs, color: colors.textMuted },
  rbValeur: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, flexShrink: 0 },
  operations: { gap: spacing.md, marginTop: spacing.sm },
  operation: { flexDirection: 'row', gap: spacing.sm },
  // Puce verticale colorée : elle dit d'un coup d'œil si l'argent entre ou sort.
  opPuce: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  opPuceIn: { backgroundColor: colors.primary },
  opPuceOut: { backgroundColor: colors.warning },
  opCorps: { flex: 1, gap: 2 },
  opHaut: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  opMotif: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  opMontant: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, flexShrink: 0 },
  opMeta: { fontSize: fontSize.xs, color: colors.textMuted },
  opComm: { fontSize: 10, color: colors.textMuted, fontStyle: 'italic' },
  opTotaux: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    gap: 6,
  },
  totalLigne: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  totalLigneLabel: { fontSize: fontSize.sm, color: colors.textDark },
  totalLigneValeur: { fontSize: fontSize.md, fontWeight: fontWeight.bold, flexShrink: 0 },
  postes: { gap: spacing.md },
  // Récap final sous le détail : séparé par un trait, façon total.
  calcTotaux: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  calcTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  calcTotalRowFort: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  calcTotalLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textMuted },
  calcTotalValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark, flexShrink: 0 },
  calcTotalLabelFort: { flex: 1, fontSize: fontSize.md, color: colors.textDark, fontWeight: fontWeight.bold },
  calcTotalValueFort: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary, flexShrink: 0 },
  poste: { gap: 6 },
  posteHaut: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  posteLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textDark },
  // `flexShrink: 0` : un montant ne doit jamais pouvoir être rogné.
  posteMontant: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, flexShrink: 0 },
  jauge: { height: 7, borderRadius: 4, backgroundColor: 'rgba(22,33,27,0.07)', overflow: 'hidden' },
  jaugeRemplie: { height: '100%', borderRadius: 4 },
  jaugeIn: { backgroundColor: colors.primary },
  // Sorties d'argent (décaissements, TSIL…) : rouge, comme les montants négatifs.
  jaugeOut: { backgroundColor: '#b91c1c' },
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark },
  subtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  scroll: {
    padding: spacing.lg, gap: spacing.lg,
    marginTop: -HERO_OVERLAP, paddingBottom: spacing['3xl'],
  },

  repartTotal: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  repartLegend: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.xs },
  noteFort: { fontWeight: fontWeight.bold, color: colors.textDark },

  breakdown: { gap: spacing.sm },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  breakLabel: { color: colors.textMuted, fontSize: fontSize.sm, flex: 1 },
  breakValue: { color: colors.textDark, fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm,
  },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, paddingVertical: spacing.md, fontStyle: 'italic' },

  tableHeader: { flexDirection: 'row', paddingBottom: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.primary, gap: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: 4 },
  th: { fontSize: 12, fontWeight: fontWeight.bold, color: colors.textDark, paddingRight: spacing.sm },
  td: { fontSize: 12, color: colors.textDark, paddingRight: spacing.sm },
  tdIn: { color: '#067a52', fontWeight: fontWeight.semibold },
  tdOut: { color: '#b91c1c', fontWeight: fontWeight.semibold },
  tdNet: { fontWeight: fontWeight.bold },

  colDate: { width: 84 },
  colBien: { width: 110 },
  colUnit: { width: 110 },
  colNat: { width: 170 },
  colPer: { width: 130 },
  colNum: { width: 110, textAlign: 'right' as const },
  colBienWide: { width: 150 },
  colNumWide: { width: 170, textAlign: 'right' as const },

  totalRow: { borderTopWidth: 2, borderTopColor: colors.textDark, borderBottomWidth: 0, paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel: { fontWeight: fontWeight.bold, color: colors.textDark },
  swipeHint: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, fontStyle: 'italic' },
  note: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 16 },

  cta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, padding: spacing.lg, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  ctaIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgSoft, alignItems: 'center', justifyContent: 'center',
  },
  ctaTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  ctaSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
});
