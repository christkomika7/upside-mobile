import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertTriangle, CheckCircle2, FileText, Receipt, X, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DevisFileButton } from '../../components/DevisFileButton';
import { PdfActions } from '../../components/PdfActions';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { TextField } from '../../components/TextField';
import { useProprietaireIntervention, useRefuseDevis, useValidateDevis } from '../../hooks/proprietaire';
import type { FacturePrestataire } from '../../types/api';
import type { ProprietaireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing, titreDocument } from '../../theme';
import { fmtDate, fmtDateTime, fmtMontant } from '../../utils/format';

type Route = RouteProp<ProprietaireStackParamList, 'InterventionDetail'>;
type Nav = NativeStackNavigationProp<ProprietaireStackParamList>;

export function InterventionDetailScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation<Nav>();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useProprietaireIntervention(route.params.interventionId);

  const validateDevisM = useValidateDevis();
  const refuseDevisM = useRefuseDevis();
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [refuseNote, setRefuseNote] = useState('');
  const [refuseDevisId, setRefuseDevisId] = useState<number | null>(null);
  const [photoView, setPhotoView] = useState<string | null>(null);

  if (isLoading) return <LoadingState label="Chargement…" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  // Tous les devis pertinents pour le propriétaire, GROUPÉS PAR LOT : il voit
  // les offres concurrentes (retenu + écartés) pour comparer les prix, et décide
  // de celle en attente. Les devis encore en sélection agence sont exclus.
  const devisAffichables = data.devis.filter((d) => ['EN_VALIDATION', 'VALIDE', 'REFUSE'].includes(d.statut));
  const lotsDevis: Record<string, typeof data.devis> = {};
  for (const d of devisAffichables) {
    (lotsDevis[d.lot || 'Devis'] ||= []).push(d);
  }
  const ordreStatut: Record<string, number> = { EN_VALIDATION: 0, VALIDE: 1, REFUSE: 2 };
  const lotEntries = Object.entries(lotsDevis).map(
    ([lot, arr]) => [lot, [...arr].sort((a, b) => (ordreStatut[a.statut] ?? 9) - (ordreStatut[b.statut] ?? 9))] as const,
  );

  const onValidateDevis = (devisId: number) => {
    validateDevisM.mutate(
      { devisId },
      { onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de valider le devis.') },
    );
  };

  const openRefuseDevis = (devisId: number) => {
    setRefuseDevisId(devisId);
    setRefuseNote('');
    setRefuseOpen(true);
  };

  const onConfirmRefuseDevis = () => {
    if (refuseDevisId == null) return;
    refuseDevisM.mutate(
      { devisId: refuseDevisId, note: refuseNote.trim() || undefined },
      {
        onSuccess: () => {
          setRefuseOpen(false);
          setRefuseDevisId(null);
          setRefuseNote('');
        },
        onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de refuser le devis.'),
      },
    );
  };

  const devisBusy = validateDevisM.isPending || refuseDevisM.isPending;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      style={{ backgroundColor: colors.bgApp }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Card padding="lg">
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{data.titre ?? `Intervention #${data.id}`}</Text>
            <Text style={styles.muted}>
              {[data.reference, data.unite_nom, data.categorie].filter(Boolean).join(' · ')}
            </Text>
            <Text style={styles.muted}>Créée le {fmtDateTime(data.created_at)}</Text>
          </View>
          <StatusPill label={statusLabel(data.statut)} tone={statusTone(data.statut)} />
        </View>
      </Card>

      {data.description || (data.photos && data.photos.length > 0) ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Demande</Text>
          {data.description ? <Text style={styles.body}>{data.description}</Text> : null}
          {data.photos && data.photos.length > 0 ? (
            <>
              <Text style={styles.photoLabel}>Photos des dégâts ({data.photos.length})</Text>
              <View style={styles.photoGrid}>
                {data.photos.map((p, idx) => (
                  <Pressable key={idx} onPress={() => setPhotoView(p)} style={styles.photoThumb}>
                    <Image source={{ uri: p }} style={styles.photoThumbImg} resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </Card>
      ) : null}

      {/* Devis des prestataires — comparatif par lot (offres concurrentes) */}
      {lotEntries.length > 0 ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Devis des prestataires</Text>
          <Text style={styles.sectionHelp}>
            Comparez les offres reçues pour chaque lot, puis validez ou refusez celle en attente.
          </Text>
          <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
            {lotEntries.map(([lot, arr]) => {
              // Un devis retenu ? le lot est tranché → plus de boutons, on montre
              // seulement les statuts (Retenu / Écarté).
              const decided = arr.some((x) => x.statut === 'VALIDE');
              return (
                <View key={lot} style={styles.lotBloc}>
                  <Text style={styles.lotTitre}>{lot}</Text>
                  {arr.map((d) => (
                    <View key={d.id} style={styles.devisCarte}>
                      <View style={styles.devisLigne}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.devisFournisseur} numberOfLines={1}>
                            {d.fournisseur_nom ?? d.reference ?? `Devis #${d.id}`}
                          </Text>
                          <Text style={styles.devisMontant}>{fmtMontant(d.total_ttc)}</Text>
                        </View>
                        {decided ? <DevisStatutBadge statut={d.statut} /> : null}
                      </View>
                      <View style={styles.devisActions}>
                        {d.a_fichier ? <DevisFileButton devisId={d.id} fichierNom={d.fichier_nom} compact /> : null}
                        {!decided ? (
                          <>
                            <View style={{ flex: 1 }}>
                              <Button label="Refuser" variant="danger" onPress={() => openRefuseDevis(d.id)} disabled={devisBusy} full />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Button label="Valider" onPress={() => onValidateDevis(d.id)} loading={validateDevisM.isPending} disabled={devisBusy} full />
                            </View>
                          </>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      {/* La décision de coût se fait désormais AU NIVEAU DES DEVIS (ci-dessus) :
          retenir un devis approuve la dépense. On garde juste le rappel visuel de
          l'état une fois décidé. */}
      {data.cout_validation_statut === 'VALIDATED' ? (
        <Card padding="lg" style={styles.coutValidatedCard}>
          <View style={styles.coutHeader}>
            <CheckCircle2 size={18} color={colors.success} />
            <Text style={styles.coutValidatedTitle}>Coût validé</Text>
          </View>
          <Text style={styles.coutPendingBody}>Vous avez accepté ce coût de {fmtMontant(data.cout)}.</Text>
        </Card>
      ) : null}
      {data.cout_validation_statut === 'REFUSED' ? (
        <Card padding="lg" style={styles.coutRefusedCard}>
          <View style={styles.coutHeader}>
            <XCircle size={18} color={colors.danger} />
            <Text style={styles.coutRefusedTitle}>Coût refusé</Text>
          </View>
          <Text style={styles.coutPendingBody}>
            Vous avez refusé ce coût de {fmtMontant(data.cout)}.
          </Text>
          {data.cout_validation_note ? (
            <Text style={[styles.coutPendingBody, { fontStyle: 'italic', marginTop: spacing.sm }]}>
              « {data.cout_validation_note} »
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Card padding="lg">
        <Text style={styles.sectionTitle}>Détails</Text>
        <Row label="Priorité" value={priorityLabel(data.priorite)} />
        <Row label="Logement" value={data.unite_nom ?? '—'} />
        {data.locataire_nom ? <Row label="Locataire" value={data.locataire_nom} /> : null}
        {data.intervenant_nom ? <Row label="Intervenant" value={data.intervenant_nom} /> : null}
        <Row last label="Coût" value={data.cout > 0 ? fmtMontant(data.cout) : '—'} />
      </Card>

      {/* Factures prestataire (preuves de coût) */}
      {data.factures_prestataire && data.factures_prestataire.length > 0 ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Factures prestataire ({data.factures_prestataire.length})</Text>
          <Text style={styles.sectionHelp}>
            Preuves des dépenses engagées par votre agence pour cette intervention.
          </Text>
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            {data.factures_prestataire.map((f) => (
              <FacturePrestataireCard key={`${f.kind}-${f.id}`} item={f} interventionId={data.id} />
            ))}
          </View>
        </Card>
      ) : null}

      {data.rapport ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Compte rendu</Text>
          <Text style={styles.body}>{data.rapport}</Text>
        </Card>
      ) : null}

      {/* Modal — Refuser un devis avec message à l'agence */}
      <Modal
        visible={refuseOpen}
        transparent
        animationType="fade"
        onRequestClose={() => (refuseDevisM.isPending ? null : setRefuseOpen(false))}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => (refuseDevisM.isPending ? null : setRefuseOpen(false))}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Refuser ce devis</Text>
            <Text style={styles.modalSub}>
              Expliquez à l'agence pourquoi vous refusez ce devis.
            </Text>
            <TextField
              label="Message à l'agence"
              value={refuseNote}
              onChangeText={setRefuseNote}
              placeholder="Ex : montant trop élevé, prestataire à revoir…"
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' as const }}
            />
            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Annuler"
                  variant="ghost"
                  onPress={() => setRefuseOpen(false)}
                  disabled={refuseDevisM.isPending}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Envoyer le refus"
                  variant="danger"
                  onPress={onConfirmRefuseDevis}
                  loading={refuseDevisM.isPending}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Photo des dégâts en plein écran */}
      <Modal visible={photoView !== null} transparent animationType="fade" onRequestClose={() => setPhotoView(null)}>
        <View style={styles.photoBackdrop}>
          <Pressable style={styles.photoClose} onPress={() => setPhotoView(null)} hitSlop={12}>
            <X size={24} color="#fff" />
          </Pressable>
          {photoView ? <Image source={{ uri: photoView }} style={styles.photoFull} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </ScrollView>
  );
}

function FacturePrestataireCard({ item, interventionId }: { item: FacturePrestataire; interventionId: number }) {
  const isDoc = item.kind === 'DOCUMENT' && item.document_id != null;
  return (
    <View style={styles.factureCard}>
      <View style={styles.factureHead}>
        <View style={styles.factureIcon}>
          {isDoc ? <FileText size={20} color={colors.primary} /> : <Receipt size={20} color={colors.primary} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.factureTitle} numberOfLines={1}>
            {item.description || item.reference || (isDoc ? 'Facture scannée' : 'Dépense')}
          </Text>
          <Text style={styles.muted}>
            {[item.tiers, item.categorie, fmtDate(item.date)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {item.amount != null ? (
          <Text style={styles.factureAmount}>{fmtMontant(item.amount)}</Text>
        ) : null}
      </View>
      {isDoc ? (
        <View style={{ marginTop: spacing.md }}>
          <PdfActions
            apiPath={`/mobile/proprietaire/interventions/${interventionId}/documents/${item.document_id}`}
            filename={`facture-prestataire-${interventionId}-${item.document_id}.pdf`}
          />
        </View>
      ) : null}
    </View>
  );
}

function DevisStatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    EN_VALIDATION: { label: 'À valider', bg: colors.warningSoft, fg: '#92400E' },
    VALIDE: { label: 'Retenu', bg: colors.successSoft, fg: '#047857' },
    REFUSE: { label: 'Écarté', bg: colors.bgSoft, fg: colors.textMuted },
  };
  const s = map[statut] ?? { label: statut, bg: colors.bgSoft, fg: colors.textMuted };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

function priorityLabel(p: string): string {
  switch (p?.toUpperCase()) {
    case 'BASSE': return 'Faible';
    case 'NORMALE': return 'Normale';
    case 'HAUTE': return 'Haute';
    case 'URGENTE': return 'Urgente';
    default: return p || '—';
  }
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  // Titre pris a la source commune (theme/typographie) : cet ecran
  // dessinait le sien, sur une taille qui n'existait nulle part ailleurs.
  title: titreDocument,
  muted: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  body: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },

  // Photos des dégâts (miniatures + plein écran)
  photoLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold, marginTop: spacing.md, marginBottom: spacing.sm },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumb: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bgSoft },
  photoThumbImg: { width: '100%', height: '100%' },
  photoBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  photoFull: { width: '100%', height: '85%' },
  photoClose: {
    position: 'absolute', top: 44, right: 20, zIndex: 2,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold, maxWidth: '60%', textAlign: 'right' },

  alertCard: { backgroundColor: colors.warningSoft, borderColor: 'transparent', gap: spacing.sm },
  alertTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#92400E', marginBottom: spacing.xs },

  // Coût en validation propriétaire
  coutPendingCard: { backgroundColor: colors.dangerSoft, borderColor: 'transparent' },
  coutPendingTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#991B1B' },
  coutPendingBody: { fontSize: fontSize.xs, color: '#7F1D1D', lineHeight: 18, marginTop: spacing.xs },
  coutAmount: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: '#7F1D1D',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  coutActions: { flexDirection: 'row', gap: spacing.md },
  coutHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  coutValidatedCard: { backgroundColor: colors.successSoft, borderColor: 'transparent' },
  coutValidatedTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#047857' },

  coutRefusedCard: { backgroundColor: colors.dangerSoft, borderColor: 'transparent' },
  coutRefusedTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#991B1B' },
  devisItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: spacing.md,
    borderRadius: 12,
  },
  devisRef: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },

  // Comparatif devis par lot
  lotBloc: { gap: spacing.sm },
  lotTitre: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  devisCarte: { backgroundColor: colors.bgSoft, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  devisLigne: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  devisFournisseur: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  devisMontant: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark, marginTop: 2 },
  devisActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: fontWeight.bold },

  sectionHelp: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: -spacing.xs, lineHeight: 16 },
  factureCard: {
    backgroundColor: colors.bgSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  factureHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  factureIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  factureTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  factureAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },

  // Modal de refus
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  modalSub: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
});
