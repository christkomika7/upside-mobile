import * as ImagePicker from 'expo-image-picker';
import { Camera, Plus, User } from 'lucide-react-native';
/**
 * Détail d'une intervention pour le collaborateur :
 * - édition rapide du statut et de la priorité
 * - devis prestataires par lot (ajout avec photo/scan, puis soumission)
 * - thread de messages avec le locataire (push notif au locataire à l'envoi)
 *
 * Toute modification se répercute en temps réel sur le logiciel web et l'app
 * locataire via l'event bus (intervention.updated, intervention.message).
 */
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { TextField } from '../../components/TextField';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import {
  useAddCollabDevis,
  useCollabIntervention,
  usePostCollabInterventionMessage,
  useSoumettreCollabDevis,
  useUpdateCollabIntervention,
} from '../../hooks/collaborateur';
import type { CollabDevis } from '../../types/api';
import type { CollaborateurStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing, webInputReset, titreDocument } from '../../theme';
import { fmtDate, fmtDateTime, fmtMontant } from '../../utils/format';

type Rt = RouteProp<CollaborateurStackParamList, 'InterventionDetail'>;

const PRIORITES = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'] as const;
const STATUTS = ['EN_COURS', 'BLOCAGE', 'VALIDE', 'CLOTURE'] as const;

function priorityLabel(p: string): string {
  switch (p.toUpperCase()) {
    case 'BASSE': return 'Faible';
    case 'NORMALE': return 'Normale';
    case 'HAUTE': return 'Haute';
    case 'URGENTE': return 'Urgente';
    default: return p;
  }
}

export function InterventionDetailScreen() {
  const { params } = useRoute<Rt>();
  const id = params.interventionId;
  const detailQ = useCollabIntervention(id);
  const updateM = useUpdateCollabIntervention(id);
  const postM = usePostCollabInterventionMessage(id);
  const addDevisM = useAddCollabDevis(id);
  const soumettreM = useSoumettreCollabDevis(id);
  const [draft, setDraft] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [dLot, setDLot] = useState('');
  const [dFournisseur, setDFournisseur] = useState('');
  const [dMontant, setDMontant] = useState('');
  const [dPhoto, setDPhoto] = useState<{ dataUrl: string; mime: string; nom: string } | null>(null);

  if (detailQ.isLoading) return <LoadingState label="Chargement…" />;
  if (detailQ.isError) return <ErrorState error={detailQ.error} onRetry={detailQ.refetch} />;
  if (!detailQ.data) return null;

  const data = detailQ.data;

  const onChangeStatut = (next: string) => {
    if (next === data.statut) return;
    updateM.mutate({ statut: next }, {
      onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Mise à jour impossible.'),
    });
  };

  const onChangePriorite = (next: string) => {
    if (next === data.priorite) return;
    updateM.mutate({ priorite: next }, {
      onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Mise à jour impossible.'),
    });
  };

  const onSend = () => {
    const t = draft.trim();
    if (!t) return;
    postM.mutate(t, {
      onSuccess: () => setDraft(''),
      onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Envoi impossible.'),
    });
  };

  const openAddDevis = () => {
    const cat = data.categorie ? data.categorie.charAt(0) + data.categorie.slice(1).toLowerCase() : '';
    setDLot(cat);
    setDFournisseur('');
    setDMontant('');
    setDPhoto(null);
    setAddOpen(true);
  };

  const captureDevis = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Activez l'accès à l'appareil photo / aux photos."); return; }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true });
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    const mime = a.mimeType ?? 'image/jpeg';
    setDPhoto({ dataUrl: a.base64 ? `data:${mime};base64,${a.base64}` : a.uri, mime, nom: a.fileName ?? `devis-${Date.now()}.jpg` });
  };
  const askDevisPhoto = () => Alert.alert('Photo du devis', 'Ajouter', [
    { text: 'Prendre une photo', onPress: () => captureDevis(true) },
    { text: 'Depuis la galerie', onPress: () => captureDevis(false) },
    { text: 'Annuler', style: 'cancel' },
  ]);

  const onSaveDevis = () => {
    const montant = Math.round(Number((dMontant || '').replace(/\s/g, '').replace(',', '.')) || 0);
    if (!dLot.trim()) { Alert.alert('Lot requis', 'Indiquez le lot (plomberie, électricité…).'); return; }
    if (montant <= 0) { Alert.alert('Montant requis', 'Indiquez le montant du devis.'); return; }
    addDevisM.mutate(
      {
        lot: dLot.trim(),
        fournisseur_nom: dFournisseur.trim() || undefined,
        montant,
        fichier_nom: dPhoto?.nom,
        fichier_mime: dPhoto?.mime,
        fichier_data: dPhoto?.dataUrl,
      },
      {
        onSuccess: () => { setAddOpen(false); setDPhoto(null); },
        onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Ajout impossible.'),
      },
    );
  };

  const onSoumettre = (lot: string) => {
    soumettreM.mutate(lot, {
      onSuccess: () => Alert.alert('Lot soumis', 'Les devis partent en validation (agence, puis propriétaire selon le plafond).'),
      onError: (e) => Alert.alert('Impossible de soumettre', e instanceof Error ? e.message : 'Erreur.'),
    });
  };

  // Devis groupés par lot.
  const lotsDevis: Record<string, CollabDevis[]> = {};
  for (const d of data.devis ?? []) {
    (lotsDevis[d.lot || 'Devis'] ||= []).push(d);
  }
  const lotEntries = Object.entries(lotsDevis);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.safe}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={detailQ.isFetching} onRefresh={detailQ.refetch} tintColor={colors.primary} />}
        >
          {/* Header */}
          <Card padding="lg">
            <View style={styles.headerRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.ref}>{data.reference ?? `#${data.id}`}</Text>
                <Text style={styles.title}>{data.titre}</Text>
                <Text style={styles.muted}>
                  {[data.unite_nom, data.categorie].filter(Boolean).join(' · ') || '—'}
                </Text>
                {data.locataire_nom ? (
                  <View style={styles.ligneAvecIcone}>
                      <User size={13} color={colors.textMuted} />
                      <Text style={styles.muted} numberOfLines={1}>{data.locataire_nom}</Text>
                    </View>
                ) : null}
                <Text style={styles.muted}>Créée le {fmtDateTime(data.created_at)}</Text>
              </View>
              <StatusPill label={statusLabel(data.statut)} tone={statusTone(data.statut)} style={{ alignSelf: 'flex-start' }} />
            </View>
          </Card>

          {data.description ? (
            <Card padding="lg">
              <Text style={styles.sectionTitle}>Demande</Text>
              <Text style={styles.bodyText}>{data.description}</Text>
            </Card>
          ) : null}

          {/* Edit statut */}
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Statut</Text>
            <View style={styles.chipRow}>
              {STATUTS.map((s) => {
                const active = s === data.statut;
                return (
                  <Pressable key={s} onPress={() => onChangeStatut(s)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{statusLabel(s)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Edit priorité */}
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Priorité</Text>
            <View style={styles.chipRow}>
              {PRIORITES.map((p) => {
                const active = p === data.priorite;
                const danger = p === 'URGENTE' || p === 'HAUTE';
                return (
                  <Pressable
                    key={p}
                    onPress={() => onChangePriorite(p)}
                    style={[styles.chip, active && (danger ? styles.chipDanger : styles.chipActive)]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{priorityLabel(p)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Coût + clôture */}
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Détails</Text>
            <Row label="Intervenant" value={data.intervenant_nom ?? '—'} />
            <Row label="Coût" value={data.cout > 0 ? fmtMontant(data.cout) : '—'} />
            <Row label="Clôturée le" value={data.date_cloture ? fmtDate(data.date_cloture) : '—'} last />
          </Card>

          {/* Devis prestataires — par lot, ajout avec photo, puis soumission */}
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Devis prestataires</Text>
            {lotEntries.length === 0 ? (
              <Text style={styles.emptyText}>
                Aucun devis. Ajoutez au moins 2 devis par lot (devis contradictoire) avant de soumettre.
              </Text>
            ) : (
              <View style={{ gap: spacing.lg }}>
                {lotEntries.map(([lot, arr]) => {
                  const aSoumettre = arr.filter((d) => d.statut === 'BROUILLON' || d.statut === 'REFUSE').length;
                  return (
                    <View key={lot} style={styles.lotBloc}>
                      <Text style={styles.lotTitre}>{lot}</Text>
                      {arr.map((d) => (
                        <View key={d.id} style={styles.devisRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.devisFournisseur} numberOfLines={1}>
                              {d.fournisseur_nom ?? d.reference ?? `Devis #${d.id}`}
                              {d.a_fichier ? '  📎' : ''}
                            </Text>
                            <Text style={styles.devisMontant}>{fmtMontant(d.montant)}</Text>
                          </View>
                          <DevisBadge statut={d.statut} />
                        </View>
                      ))}
                      {aSoumettre > 0 ? (
                        <Button
                          label={`Soumettre le lot (${aSoumettre})`}
                          onPress={() => onSoumettre(lot)}
                          loading={soumettreM.isPending}
                          full
                        />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
            <View style={{ marginTop: spacing.md }}>
              <Button label="+ Ajouter un devis" variant="ghost" onPress={openAddDevis} full />
            </View>
          </Card>

          {/* Thread messages */}
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Messages</Text>
            {data.messages.length === 0 ? (
              <Text style={styles.emptyText}>Aucun message. Écrivez au locataire pour le rassurer.</Text>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {data.messages.map((m) => {
                  const isMe = m.from_role !== 'LOCATAIRE';
                  return (
                    <View key={m.id} style={[styles.msgRow, isMe ? styles.msgMine : styles.msgOther]}>
                      <Text style={[styles.msgAuthor, isMe ? styles.msgAuthorMine : styles.msgAuthorOther]}>
                        {m.user_name ?? (isMe ? 'Vous' : 'Locataire')}
                      </Text>
                      <Text style={[styles.msgText, isMe && styles.msgTextMine]}>{m.text}</Text>
                      <Text style={[styles.msgDate, isMe && styles.msgDateMine]}>{fmtDateTime(m.created_at)}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Composer */}
            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Écrire au locataire…"
                placeholderTextColor={colors.textMuted}
                multiline
                style={[styles.composerInput, webInputReset]}
                editable={!postM.isPending}
              />
              <Pressable
                onPress={onSend}
                disabled={!draft.trim() || postM.isPending}
                style={[styles.sendBtn, (!draft.trim() || postM.isPending) && { opacity: 0.5 }]}
              >
                <Text style={styles.sendBtnLabel}>{postM.isPending ? '…' : 'Envoyer'}</Text>
              </Pressable>
            </View>
          </Card>
        </ScrollView>

        {/* Modal — ajouter un devis (photo/scan + fournisseur + montant) */}
        <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => (addDevisM.isPending ? null : setAddOpen(false))}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => (addDevisM.isPending ? null : setAddOpen(false))} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Ajouter un devis</Text>
              <TextField label="Lot de travaux" value={dLot} onChangeText={setDLot} placeholder="Ex : Plomberie" />
              <TextField label="Prestataire" value={dFournisseur} onChangeText={setDFournisseur} placeholder="Nom du prestataire" />
              <TextField label="Montant (XAF)" value={dMontant} onChangeText={setDMontant} placeholder="850000" keyboardType="numeric" />

              <Text style={styles.photoFieldLabel}>Photo / scan du devis</Text>
              {dPhoto ? (
                <Pressable onPress={askDevisPhoto} style={styles.devisPhotoWrap}>
                  <Image source={{ uri: dPhoto.dataUrl }} style={styles.devisPhoto} resizeMode="cover" />
                  <Text style={styles.devisPhotoHint}>Toucher pour remplacer</Text>
                </Pressable>
              ) : (
                <Pressable onPress={askDevisPhoto} style={styles.photoAdd}>
                  <Camera size={22} color={colors.primary} />
                  <Text style={styles.photoAddLabel}>Prendre / choisir</Text>
                </Pressable>
              )}

              <View style={styles.modalActions}>
                <View style={{ flex: 1 }}>
                  <Button label="Annuler" variant="ghost" onPress={() => setAddOpen(false)} disabled={addDevisM.isPending} full />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Enregistrer" onPress={onSaveDevis} loading={addDevisM.isPending} full />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function DevisBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    BROUILLON: { label: 'Brouillon', bg: colors.bgSoft, fg: colors.textMuted },
    EN_VALIDATION_ADMIN: { label: "Chez l'agence", bg: colors.warningSoft, fg: '#92400E' },
    EN_VALIDATION: { label: 'Chez le propriétaire', bg: colors.warningSoft, fg: '#92400E' },
    VALIDE: { label: 'Validé', bg: colors.successSoft, fg: '#047857' },
    REFUSE: { label: 'Refusé', bg: colors.dangerSoft, fg: '#991B1B' },
  };
  const s = map[statut] ?? { label: statut, bg: colors.bgSoft, fg: colors.textMuted };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
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
  ligneAvecIcone: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ref: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary, letterSpacing: 0.5 },
  // Titre pris a la source commune (theme/typographie) : cet ecran
  // dessinait le sien, sur une taille qui n'existait nulle part ailleurs.
  title: titreDocument,
  muted: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  bodyText: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },
  emptyText: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: spacing.md },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold, maxWidth: '60%', textAlign: 'right' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  chipLabelActive: { color: colors.textInverse },

  msgRow: { padding: spacing.md, borderRadius: radius.lg, maxWidth: '85%' },
  msgMine: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  msgOther: { backgroundColor: colors.bgSoft, alignSelf: 'flex-start' },
  msgAuthor: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginBottom: 4 },
  msgAuthorMine: { color: colors.textInverse, opacity: 0.85 },
  msgAuthorOther: { color: colors.textMuted },
  msgText: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 20 },
  msgTextMine: { color: colors.textInverse },
  msgDate: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  msgDateMine: { color: colors.textInverse, opacity: 0.7 },

  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  composerInput: {
    flex: 1, minHeight: 40, maxHeight: 120,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg,
    fontSize: fontSize.sm, color: colors.textDark, backgroundColor: colors.bgCard,
  },
  sendBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    backgroundColor: colors.primary, borderRadius: radius.lg,
  },
  sendBtnLabel: { fontSize: fontSize.xs, color: colors.textInverse, fontWeight: fontWeight.bold },

  // Devis
  lotBloc: { gap: spacing.sm },
  lotTitre: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  devisRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgSoft, borderRadius: radius.lg, padding: spacing.md,
  },
  devisFournisseur: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  devisMontant: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: fontWeight.bold },

  photoFieldLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold, marginTop: spacing.sm, marginBottom: spacing.xs },
  photoAdd: { height: 96, borderRadius: radius.md, backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoAddLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  devisPhotoWrap: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bgSoft },
  devisPhoto: { width: '100%', height: 160 },
  devisPhotoHint: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', paddingVertical: 6 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark, marginBottom: spacing.xs },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});
