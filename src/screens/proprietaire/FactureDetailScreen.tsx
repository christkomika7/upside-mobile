import { useRoute, type RouteProp } from '@react-navigation/native';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { GradientCard } from '../../components/GradientCard';
import { PdfActionsFromHtml } from '../../components/PdfActionsFromHtml';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useProprietaireFacture } from '../../hooks/proprietaire';
import type { ProprietaireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, spacing } from '../../theme';
import { fmtDate, fmtMontant } from '../../utils/format';

type Route = RouteProp<ProprietaireStackParamList, 'FactureDetail'>;

export function FactureDetailScreen() {
  const route = useRoute<Route>();
  const id = route.params.factureId;
  const { data, isLoading, isError, error, refetch, isFetching } = useProprietaireFacture(id);

  if (isLoading) return <LoadingState label="Chargement…" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      style={{ backgroundColor: colors.bgApp }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* Header propre : sous-titre métier au-dessus, n° en bas, badge à droite */}
      <Card padding="lg">
        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.subtitle}>Facture de gestion</Text>
            <Text style={styles.numero}>{data.numero}</Text>
            <Text style={styles.muted}>Émise le {fmtDate(data.date_emission)}</Text>
            {data.date_echeance ? <Text style={styles.muted}>Échéance {fmtDate(data.date_echeance)}</Text> : null}
          </View>
          <StatusPill label={statusLabel(data.statut)} tone={statusTone(data.statut)} />
        </View>
      </Card>

      <PdfActionsFromHtml
        apiPath={`/mobile/proprietaire/factures/${data.id}/html`}
        pdfApiPath={`/mobile/proprietaire/factures/${data.id}/pdf`}
        filename={`facture-gestion-${data.numero}.pdf`}
      />

      <GradientCard padding="xl">
        {/* Commission auto-prélevée sur les loyers : on affiche le montant prélevé,
            pas un solde dû (qui est toujours 0 pour ce type de facture). */}
        <Text style={styles.heroLabel}>{data.solde_du > 0 ? 'SOLDE DÛ' : 'MONTANT PRÉLEVÉ'}</Text>
        <Text style={styles.heroAmount}>{fmtMontant(data.solde_du > 0 ? data.solde_du : data.total_ttc)}</Text>
        <View style={styles.heroSplit}>
          <Split label="Total TTC" value={fmtMontant(data.total_ttc)} />
          <Split label="Déjà payé" value={fmtMontant(data.montant_paye)} />
        </View>
      </GradientCard>

      {data.lignes.length > 0 ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Détail des lignes</Text>
          {data.lignes.map((ln, idx) => (
            <View key={idx} style={[styles.line, idx === data.lignes.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineDesignation}>{ln.designation}</Text>
                <Text style={styles.muted}>{ln.quantite} × {fmtMontant(ln.prix_unitaire)}</Text>
              </View>
              <Text style={styles.lineTotal}>{fmtMontant(ln.total_ht)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Totaux avec breakdown détaillé des taxes */}
      <Card padding="lg">
        <Text style={styles.sectionTitle}>Totaux</Text>
        <TotalRow label="Total HT" value={fmtMontant(data.total_ht)} />

        {/* Détail taxe par taxe (TVA + CSS + autres) */}
        {(data.taxes_breakdown ?? []).map((t, idx) => (
          <TotalRow
            key={`${t.nom}-${idx}`}
            label={`${t.nom} (${t.taux}%${t.sur_tva ? ' / TVA' : ''})`}
            value={fmtMontant(t.montant)}
          />
        ))}

        {/* Fallback si pas de breakdown : on affiche au moins la TVA brute */}
        {!data.taxes_breakdown || data.taxes_breakdown.length === 0 ? (
          data.tva_montant > 0 ? <TotalRow label="TVA" value={fmtMontant(data.tva_montant)} /> : null
        ) : null}

        <TotalRow label="Total TTC" value={fmtMontant(data.total_ttc)} bold />
      </Card>

      {data.notes ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.body}>{data.notes}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Split({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.splitLabel}>{label}</Text>
      <Text style={styles.splitValue}>{value}</Text>
    </View>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={[styles.totalRow, bold && styles.totalRowBold]}>
      <Text style={[styles.totalLabel, bold && { color: colors.textDark, fontWeight: fontWeight.bold }]}>{label}</Text>
      <Text style={[styles.totalValue, bold && { fontSize: fontSize.lg, color: colors.textDark }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  subtitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase',
  },
  numero: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark, marginTop: 2 },
  muted: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  heroLabel: { fontSize: fontSize.xs, color: colors.textInverse, opacity: 0.85, fontWeight: fontWeight.bold, letterSpacing: 1 },
  heroAmount: { fontSize: fontSize['3xl'], color: colors.textInverse, fontWeight: fontWeight.bold, marginTop: spacing.xs, marginBottom: spacing.md },
  heroSplit: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: spacing.md, gap: spacing.lg },
  splitLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  splitValue: { color: colors.textInverse, fontWeight: fontWeight.bold, fontSize: fontSize.base, marginTop: 2 },

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  body: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },

  line: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  lineDesignation: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  lineTotal: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalRowBold: {
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  totalLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  totalValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },
});
