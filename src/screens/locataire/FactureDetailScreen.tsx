import { useRoute, type RouteProp } from '@react-navigation/native';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { DetailHero } from '../../components/DetailHero';
import { PdfActionsFromHtml } from '../../components/PdfActionsFromHtml';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useLocataireFacture } from '../../hooks/locataire';
import type { LocataireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, spacing } from '../../theme';
import { fmtDate, fmtMontant } from '../../utils/format';

type Route = RouteProp<LocataireStackParamList, 'FactureDetail'>;

export function FactureDetailScreen() {
  const route = useRoute<Route>();
  const id = route.params.factureId;
  const { data, isLoading, isError, error, refetch, isFetching } = useLocataireFacture(id);

  if (isLoading) return <LoadingState label="Chargement de la facture…" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      style={{ backgroundColor: colors.bgApp }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <DetailHero
        overline="Facture"
        title={data.numero}
        statut={statusLabel(data.statut)}
        amountLabel="Solde dû"
        amount={fmtMontant(data.solde_du)}
        meta={[
          { label: 'Total TTC', value: fmtMontant(data.total_ttc) },
          { label: 'Déjà payé', value: fmtMontant(data.montant_paye) },
          ...(data.date_echeance ? [{ label: 'Échéance', value: fmtDate(data.date_echeance) }] : []),
        ]}
      />

      {/* Actions PDF */}
      <PdfActionsFromHtml
        apiPath={`/mobile/locataire/factures/${data.id}/html`}
        pdfApiPath={`/mobile/locataire/factures/${data.id}/pdf`}
        filename={`facture-${data.numero}.pdf`}
      />

      {/* Lignes */}
      {data.lignes.length > 0 ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Détail des lignes</Text>
          {data.lignes.map((ln, idx) => (
            <View key={idx} style={[styles.line, idx === data.lignes.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineDesignation}>{ln.designation}</Text>
                <Text style={styles.muted}>
                  {ln.quantite} × {fmtMontant(ln.prix_unitaire)}
                </Text>
              </View>
              <Text style={styles.lineTotal}>{fmtMontant(ln.total_ht)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* Totaux détaillés (TVA + autres taxes avec %) */}
      <Card padding="lg">
        <Text style={styles.sectionTitle}>Totaux</Text>
        <TotalRow label="Total HT" value={fmtMontant(data.total_ht)} />
        {(data.taxes_breakdown ?? []).map((t, idx) => (
          <TotalRow
            key={`${t.nom}-${idx}`}
            label={`${t.nom} (${t.taux}%${t.sur_tva ? ' / TVA' : ''})`}
            value={fmtMontant(t.montant)}
          />
        ))}
        {(!data.taxes_breakdown || data.taxes_breakdown.length === 0) && data.tva_montant > 0 ? (
          <TotalRow label="TVA" value={fmtMontant(data.tva_montant)} />
        ) : null}
        <TotalRow label="Total TTC" value={fmtMontant(data.total_ttc)} bold />
      </Card>

      {data.notes ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.bodyText}>{data.notes}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && { color: colors.textDark, fontWeight: fontWeight.bold }]}>{label}</Text>
      <Text style={[styles.totalValue, bold && { fontSize: fontSize.lg }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  subtitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase',
  },
  numero: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark, marginTop: 2 },
  muted: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  heroCard: { backgroundColor: colors.primary, borderColor: colors.primary },

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  lineDesignation: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  lineTotal: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },

  totals: { marginTop: spacing.md, gap: spacing.xs },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  totalValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },

  bodyText: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },
});
