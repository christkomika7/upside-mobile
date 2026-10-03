import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { GradientCard } from '../../components/GradientCard';
import { PdfActions } from '../../components/PdfActions';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useBailDocumentAvailable, useLocataireBails } from '../../hooks/locataire';
import type { LocataireBail } from '../../types/api';
import type { LocataireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, spacing } from '../../theme';
import { fmtDate, fmtDuree, fmtMontant } from '../../utils/format';

type Nav = NativeStackNavigationProp<LocataireStackParamList>;
type Rt = RouteProp<LocataireStackParamList, 'BailDetail'>;

export function BailDetailScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { data, isLoading, isError, error, refetch, isFetching } = useLocataireBails();

  if (isLoading) return <LoadingState label="Chargement du bail…" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  const actuels = data?.actuels ?? (data?.actuel ? [data.actuel] : []);
  const passes = data?.passes ?? [];
  const all = [...actuels, ...passes];
  const bail = all.find((b) => b.id === params.bailId);
  const isActive = actuels.some((b) => b.id === params.bailId);

  if (!bail) {
    return (
      <EmptyState
        icon="📋"
        title="Bail introuvable"
        description="Ce bail n'est plus disponible."
      />
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      style={{ backgroundColor: colors.bgApp }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <BailDetailContent
        bail={bail}
        onSeeBien={isActive ? () => nav.navigate('Bien') : undefined}
        primary={isActive}
      />
    </ScrollView>
  );
}

function BailDetailContent({ bail, onSeeBien, primary }: { bail: LocataireBail; onSeeBien?: () => void; primary: boolean }) {
  const ameublement = bail.meuble ? 'Meublé' : bail.semi_meuble ? 'Semi-meublé' : 'Non meublé';
  const docQ = useBailDocumentAvailable(bail.id);
  const docAvailable = docQ.data?.available ?? false;

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.bailHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bailRef}>{bail.reference ?? `Bail #${bail.id}`}</Text>
          {bail.unite_nom ? <Text style={styles.bailUnite}>{bail.unite_nom}</Text> : null}
        </View>
        <StatusPill label={statusLabel(bail.statut)} tone={statusTone(bail.statut)} />
      </View>

      {/* Document scanné signé (si déposé par l'agence) */}
      {docAvailable ? (
        <Card padding="lg">
          <Text style={styles.docTitle}>Contrat de bail signé</Text>
          <Text style={styles.docSub}>Document déposé par votre agence</Text>
          <View style={{ marginTop: spacing.md }}>
            <PdfActions
              apiPath={`/mobile/locataire/bails/${bail.id}/document`}
              filename={`bail-${bail.reference ?? bail.id}.pdf`}
            />
          </View>
        </Card>
      ) : (
        <Card padding="lg" style={styles.docPlaceholder}>
          <Text style={styles.docTitle}>Contrat de bail signé</Text>
          <Text style={styles.docSub}>
            En attente du dépôt par votre agence. Le document sera disponible ici dès qu'il sera ajouté.
          </Text>
        </Card>
      )}

      {/* Hero loyer — gradient brand pour les baux actifs */}
      {primary ? (
        <GradientCard padding="xl">
          <Text style={styles.heroLabel}>LOYER MENSUEL TOTAL</Text>
          <Text style={styles.heroAmount}>{fmtMontant(bail.loyer_total)}</Text>
          <View style={styles.heroSplit}>
            <DetailRow label="Loyer HT" value={fmtMontant(bail.loyer_ht)} inverse />
            <DetailRow label="Charges" value={fmtMontant(bail.charges)} inverse />
            {bail.charges_exceptionnelles > 0 ? (
              <DetailRow label="Charges exceptionnelles" value={fmtMontant(bail.charges_exceptionnelles)} inverse />
            ) : null}
          </View>
        </GradientCard>
      ) : (
        <Card style={styles.heroCardMuted} padding="xl">
          <Text style={[styles.heroLabel, { color: colors.textMuted }]}>LOYER MENSUEL TOTAL</Text>
          <Text style={[styles.heroAmount, { color: colors.textDark }]}>{fmtMontant(bail.loyer_total)}</Text>
          <View style={[styles.heroSplit, { borderTopColor: colors.borderLight }]}>
            <DetailRow label="Loyer HT" value={fmtMontant(bail.loyer_ht)} />
            <DetailRow label="Charges" value={fmtMontant(bail.charges)} />
            {bail.charges_exceptionnelles > 0 ? (
              <DetailRow label="Charges exceptionnelles" value={fmtMontant(bail.charges_exceptionnelles)} />
            ) : null}
          </View>
        </Card>
      )}

      {/* Période */}
      <Card padding="lg">
        <Text style={styles.sectionTitle}>Période</Text>
        <DetailRow label="Du" value={fmtDate(bail.date_debut)} />
        <DetailRow label="Au" value={fmtDate(bail.date_fin)} />
        {typeof bail.jours_restants === 'number' ? (
          <DetailRow
            label="Reste"
            value={bail.jours_restants > 0 ? fmtDuree(bail.jours_restants) : 'Expiré'}
          />
        ) : null}
        <DetailRow label="Renouvellement" value={bail.renouvellement_auto ? 'Automatique' : 'Sur demande'} last />
      </Card>

      {/* Conditions */}
      <Card padding="lg">
        <Text style={styles.sectionTitle}>Conditions</Text>
        <DetailRow label="Périodicité" value={periodiciteLabel(bail.periodicite)} />
        <DetailRow label="Ameublement" value={ameublement} />
        <DetailRow label="Caution" value={fmtMontant(bail.caution)} last />
      </Card>

      {onSeeBien ? (
        <Button label="Voir mon logement" variant="secondary" onPress={onSeeBien} />
      ) : null}
    </View>
  );
}

function periodiciteLabel(p: string): string {
  switch (p?.toUpperCase()) {
    case 'MENSUEL': return 'Mensuelle';
    case 'TRIMESTRIEL': return 'Trimestrielle';
    case 'SEMESTRIEL': return 'Semestrielle';
    case 'ANNUEL': return 'Annuelle';
    default: return p || '—';
  }
}

function DetailRow({ label, value, inverse, last }: { label: string; value: string; inverse?: boolean; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={[styles.rowLabel, inverse && { color: 'rgba(255,255,255,0.85)' }]}>{label}</Text>
      <Text style={[styles.rowValue, inverse && { color: colors.textInverse }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing['3xl'] },

  bailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bailRef: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  bailUnite: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, fontWeight: fontWeight.semibold },

  heroCardMuted: { backgroundColor: colors.bgCard },
  heroLabel: { fontSize: fontSize.xs, color: colors.textInverse, opacity: 0.85, fontWeight: fontWeight.bold, letterSpacing: 1 },
  heroAmount: { fontSize: fontSize['3xl'], color: colors.textInverse, fontWeight: fontWeight.bold, marginTop: spacing.xs, marginBottom: spacing.md },
  heroSplit: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: spacing.md },

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },

  docTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  docSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  docPlaceholder: { backgroundColor: colors.bgSoft, borderColor: 'transparent' },
});
