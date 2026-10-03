/**
 * Édition + signature d'un EDL sur le terrain par un collaborateur.
 *
 * Workflow complet :
 *   1. BROUILLON   — l'agent remplit pièce par pièce (état, observations, photos).
 *                    Sauvegarde progressive (PUT à chaque action).
 *   2. SIGNE       — modal "Signer & finaliser" avec DEUX pads de signature
 *                    (locataire au-dessus, agent en bas). Validation → POST
 *                    /sign-initial → statut SIGNE.
 *   3. (après SIGNE) Pendant que l'agence fait les travaux, chaque pièce
 *                    peut être marquée OK / À corriger (chips). Mise à jour
 *                    progressive via PUT.
 *   4. (après SIGNE) Le collaborateur peut signer la CLÔTURE depuis son app.
 *                    POST /sign-cloture côté collab. Quand le locataire aura
 *                    fait pareil depuis son app, le statut passera à CLOTURE.
 *
 * À chaque étape : PDF visualisable / imprimable / téléchargeable via
 * expo-print + sharing.
 */
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, Download, Eye, ImageIcon, Plus, Printer, Trash2, Wrench, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { PdfViewerModal } from '../../components/PdfViewerModal';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { SignaturePad } from '../../components/SignaturePad';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useAuth } from '../../auth/store';
import {
  useCollabEdl,
  useSignClotureCollabEdl,
  useSignInitialEdl,
  useUpdateCollabEdl,
} from '../../hooks/collaborateur';
import type { CollaborateurStackParamList } from '../../navigation/types';
import type { EdlPiece } from '../../types/api';
import { colors, fontSize, fontWeight, radius, spacing, webInputReset, titreDocument } from '../../theme';
import { downloadBackendPdf, printBackendPdf, viewBackendPdf } from '../../utils/backendPdf';

type Nav = NativeStackNavigationProp<CollaborateurStackParamList>;
type Rt = RouteProp<CollaborateurStackParamList, 'EdlEdit'>;

const ETATS = ['Neuf', 'Bon', 'Usagé', 'Dégradé'] as const;
const MAX_PHOTOS_PER_PIECE = 8;

type PdfAction = 'view' | 'print' | 'share' | null;

export function EdlEditScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const me = useAuth((s) => s.user);
  const detailQ = useCollabEdl(params.edlId);
  const updateM = useUpdateCollabEdl(params.edlId);
  const signInitialM = useSignInitialEdl(params.edlId);
  const signClotureM = useSignClotureCollabEdl(params.edlId);

  const [pieces, setPieces] = useState<EdlPiece[]>([]);
  // Interventions à réaliser avant signature — mêmes item + libellé que sur l'ERP.
  const [interventions, setInterventions] = useState<Array<{ libelle: string; fait: boolean }>>([]);
  const [newIntervDraft, setNewIntervDraft] = useState('');
  // Modal sign-initial
  const [signOpen, setSignOpen] = useState(false);
  const [signNomLocataire, setSignNomLocataire] = useState('');
  const [signNomAgent, setSignNomAgent] = useState('');
  const [signDataLocataire, setSignDataLocataire] = useState<string>('');
  const [signDataAgent, setSignDataAgent] = useState<string>('');
  // Modal sign-cloture (agent uniquement)
  const [clotureOpen, setClotureOpen] = useState(false);
  const [clotureNom, setClotureNom] = useState('');
  const [clotureData, setClotureData] = useState<string>('');
  // Modal ajout pièce
  const [addOpen, setAddOpen] = useState(false);
  const [newPieceName, setNewPieceName] = useState('');
  // PDF
  const [pdfBusy, setPdfBusy] = useState<PdfAction>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  // Désactive le scroll des modals pendant qu'on signe (sinon iOS scroll au lieu de tracer).
  const [signingActive, setSigningActive] = useState(false);

  // Hydrate pièces depuis le backend (premier load + reload via WS).
  useEffect(() => {
    if (detailQ.data?.pieces) setPieces(detailQ.data.pieces);
    if (detailQ.data && Array.isArray((detailQ.data as any).interventions)) {
      setInterventions((detailQ.data as any).interventions);
    }
  }, [detailQ.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (detailQ.data?.signataire_locataire) setSignNomLocataire(detailQ.data.signataire_locataire);
    if (detailQ.data?.signataire_agent) {
      setSignNomAgent(detailQ.data.signataire_agent);
      setClotureNom(detailQ.data.signataire_agent);
    } else if (me) {
      const full = `${me.prenom ?? ''} ${me.nom ?? ''}`.trim();
      setSignNomAgent(full);
      setClotureNom(full);
    }
  }, [detailQ.data?.id, me]); // eslint-disable-line react-hooks/exhaustive-deps

  if (detailQ.isLoading) return <LoadingState label="Chargement…" />;
  if (detailQ.isError) return <ErrorState error={detailQ.error} onRetry={detailQ.refetch} />;
  if (!detailQ.data) return null;

  const data = detailQ.data;
  const isSigned = data.statut === 'SIGNE' || data.statut === 'CLOTURE';
  const isClotured = data.statut === 'CLOTURE';
  // Édition libre (photos, observations, ajout/suppression pièces) tant que pas SIGNE
  const canEdit = !isSigned;
  // OK/Pas OK actif uniquement entre SIGNE et CLOTURE
  const canMarkOk = isSigned && !isClotured;
  const agentAlreadyClotured = !!data.signature_agent_cloture_data;
  const locataireAlreadyClotured = !!data.signature_locataire_cloture_data;

  const savePieces = (next: EdlPiece[]) => {
    updateM.mutate({ pieces: next }, {
      onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Sauvegarde impossible.'),
    });
  };

  // ── Interventions à réaliser avant signature ────────────────────────────
  const saveInterventions = (next: Array<{ libelle: string; fait: boolean }>) => {
    updateM.mutate({ interventions: next } as any, {
      onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Sauvegarde impossible.'),
    });
  };
  const addIntervention = () => {
    const libelle = newIntervDraft.trim();
    if (!libelle) return;
    const next = [...interventions, { libelle, fait: false }];
    setInterventions(next);
    setNewIntervDraft('');
    saveInterventions(next);
  };
  const toggleIntervention = (i: number) => {
    const next = interventions.map((it, idx) => idx === i ? { ...it, fait: !it.fait } : it);
    setInterventions(next);
    saveInterventions(next);
  };
  const removeIntervention = (i: number) => {
    const next = interventions.filter((_, idx) => idx !== i);
    setInterventions(next);
    saveInterventions(next);
  };

  const setEtatPiece = (i: number, etat: string) => {
    const next = pieces.map((p, idx) => idx === i ? { ...p, etat } : p);
    setPieces(next); savePieces(next);
  };
  const setObsPiece = (i: number, observations: string) => {
    setPieces((prev) => prev.map((p, idx) => idx === i ? { ...p, observations } : p));
  };
  const flushObs = () => savePieces(pieces);

  const setOkPiece = (i: number, ok: boolean | null) => {
    const next = pieces.map((p, idx) => idx === i ? { ...p, ok } : p);
    setPieces(next); savePieces(next);
  };

  const addPhotoFromCamera = async (i: number) => {
    if ((pieces[i].photos ?? []).length >= MAX_PHOTOS_PER_PIECE) {
      Alert.alert('Limite', `Maximum ${MAX_PHOTOS_PER_PIECE} photos par pièce.`); return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', 'Activez l\'accès à l\'appareil photo.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], quality: 0.5, base64: true,
    });
    appendPhoto(i, result);
  };
  const addPhotoFromLibrary = async (i: number) => {
    if ((pieces[i].photos ?? []).length >= MAX_PHOTOS_PER_PIECE) {
      Alert.alert('Limite', `Maximum ${MAX_PHOTOS_PER_PIECE} photos par pièce.`); return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', 'Activez l\'accès aux photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.5, base64: true,
    });
    appendPhoto(i, result);
  };
  const appendPhoto = (i: number, result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const a = result.assets[0]; if (!a) return;
    const mime = a.mimeType ?? 'image/jpeg';
    const dataUrl = a.base64 ? `data:${mime};base64,${a.base64}` : a.uri;
    const next = pieces.map((p, idx) => idx === i ? { ...p, photos: [...(p.photos ?? []), dataUrl] } : p);
    setPieces(next); savePieces(next);
  };
  const removePhoto = (i: number, photoIdx: number) => {
    const next = pieces.map((p, idx) => idx === i ? { ...p, photos: (p.photos ?? []).filter((_, k) => k !== photoIdx) } : p);
    setPieces(next); savePieces(next);
  };

  const onAddPiece = () => {
    const nom = newPieceName.trim(); if (!nom) return;
    const next = [...pieces, { nom, etat: '', observations: '', elements: [], photos: [], videos: [] } as EdlPiece];
    setPieces(next); savePieces(next);
    setNewPieceName(''); setAddOpen(false);
  };
  const onDeletePiece = (i: number) => {
    Alert.alert('Supprimer cette pièce ?', `« ${pieces[i].nom} »`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: () => {
          const next = pieces.filter((_, k) => k !== i);
          setPieces(next); savePieces(next);
        },
      },
    ]);
  };

  // ── Sign initial (double signature) ──
  const onSignInitial = () => {
    if (!signNomLocataire.trim()) { Alert.alert('Manque', 'Nom du locataire requis.'); return; }
    if (!signNomAgent.trim()) { Alert.alert('Manque', 'Nom de l\'agent requis.'); return; }
    if (!signDataLocataire || JSON.parse(signDataLocataire || '[]').length === 0) {
      Alert.alert('Manque', 'Le locataire doit signer.'); return;
    }
    if (!signDataAgent || JSON.parse(signDataAgent || '[]').length === 0) {
      Alert.alert('Manque', 'L\'agent doit signer.'); return;
    }
    signInitialM.mutate({
      signataire_agent: signNomAgent.trim(),
      signataire_locataire: signNomLocataire.trim(),
      signature_agent_data: signDataAgent,
      signature_locataire_data: signDataLocataire,
    }, {
      // Retour direct à la liste EDL après signature — sur web, l'Alert
      // fallback sur window.alert ignore l'array de boutons, donc on ne peut
      // pas s'appuyer sur un onPress. L'invalidation TanStack Query rafraîchit
      // la liste toute seule.
      onSuccess: () => {
        setSignOpen(false);
        nav.goBack();
      },
      onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Signature impossible.'),
    });
  };

  // ── Sign clôture (agent uniquement, signature simple) ──
  const onSignCloture = () => {
    if (!clotureNom.trim()) { Alert.alert('Manque', 'Nom de l\'agent requis.'); return; }
    if (!clotureData || JSON.parse(clotureData || '[]').length === 0) {
      Alert.alert('Manque', 'Vous devez signer.'); return;
    }
    signClotureM.mutate({ signataire: clotureNom.trim(), signature_data: clotureData }, {
      onSuccess: () => {
        setClotureOpen(false);
        nav.goBack();
      },
      onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Signature impossible.'),
    });
  };

  // ── PDF actions ──
  // Le PDF est rendu par le backend (WeasyPrint) — même moteur que le logiciel
  // web, donc rendu strictement identique. Les modifs en cours sur les pièces
  // sont autosauvegardées à chaque changement, donc la version serveur reflète
  // bien l'état courant au moment du clic.
  const pdfPath = `/mobile/collaborateur/etats-lieux/${data.id}/pdf`;
  const pdfFilename = `edl-${data.reference ?? data.id}.pdf`;

  const onPdfView = async () => {
    setPdfBusy('view');
    try {
      const uri = await viewBackendPdf(pdfPath, pdfFilename);
      if (uri) setViewerUri(uri);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'PDF impossible.');
    } finally { setPdfBusy(null); }
  };
  const onPdfPrint = async () => {
    setPdfBusy('print');
    try { await printBackendPdf(pdfPath, pdfFilename); }
    catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Impression impossible.'); }
    finally { setPdfBusy(null); }
  };
  const onPdfShare = async () => {
    setPdfBusy('share');
    try { await downloadBackendPdf(pdfPath, pdfFilename, `EDL ${data.reference ?? ''}`); }
    catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Partage impossible.'); }
    finally { setPdfBusy(null); }
  };

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
              <View style={{ flex: 1 }}>
                <Text style={styles.ref}>{data.reference ?? `EDL #${data.id}`}</Text>
                <Text style={styles.title}>
                  {data.type === 'SORTIE' ? 'État des lieux de sortie' : 'État des lieux d\'entrée'}
                </Text>
                <Text style={styles.muted}>
                  {data.unite_nom ?? '—'}
                  {data.locataire_nom ? ` · ${data.locataire_nom}` : ''}
                </Text>
                {updateM.isPending ? <Text style={[styles.muted, { color: colors.primary }]}>Sauvegarde…</Text> : null}
              </View>
              <StatusPill label={statusLabel(data.statut)} tone={statusTone(data.statut)} style={{ alignSelf: 'flex-start' }} />
            </View>
          </Card>

          {/* Actions PDF — disponibles à tout moment */}
          <View style={styles.pdfRow}>
            <PdfBtn icon={<Eye size={18} color={colors.primary} />} label="Voir" onPress={onPdfView} loading={pdfBusy === 'view'} disabled={pdfBusy !== null} />
            <PdfBtn icon={<Printer size={18} color={colors.primary} />} label="Imprimer" onPress={onPdfPrint} loading={pdfBusy === 'print'} disabled={pdfBusy !== null} />
            <PdfBtn icon={<Download size={18} color={colors.primary} />} label="Télécharger" onPress={onPdfShare} loading={pdfBusy === 'share'} disabled={pdfBusy !== null} />
          </View>

          {/* Interventions à réaliser avant signature — même flow que sur l'ERP */}
          <Card padding="lg">
            <View style={styles.intervHeader}>
              <Wrench size={16} color={colors.primary} />
              <Text style={styles.intervTitle}>Interventions à réaliser avant signature</Text>
            </View>
            {canEdit ? (
              <View style={styles.intervAddRow}>
                <TextInput
                  value={newIntervDraft}
                  onChangeText={setNewIntervDraft}
                  placeholder="Ex : Repeindre le mur du salon…"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={addIntervention}
                  returnKeyType="done"
                  style={[styles.intervInput, webInputReset]}
                />
                <Pressable
                  onPress={addIntervention}
                  disabled={!newIntervDraft.trim()}
                  style={({ pressed }) => [
                    styles.intervAddBtn,
                    (!newIntervDraft.trim() || pressed) && { opacity: 0.6 },
                  ]}
                >
                  <Plus size={18} color={colors.textInverse} />
                </Pressable>
              </View>
            ) : null}
            {interventions.length === 0 ? (
              <Text style={styles.muted}>Aucune intervention.</Text>
            ) : (
              <View style={{ gap: spacing.xs }}>
                {interventions.map((it, i) => (
                  <View key={i} style={styles.intervRow}>
                    <Pressable
                      onPress={() => canEdit && toggleIntervention(i)}
                      style={[styles.intervCheckbox, it.fait && styles.intervCheckboxActive]}
                      hitSlop={6}
                    >
                      {it.fait ? <Check size={14} color={colors.textInverse} /> : null}
                    </Pressable>
                    <Text
                      style={[styles.intervLibelle, it.fait && styles.intervLibelleDone]}
                      numberOfLines={2}
                    >
                      {it.libelle}
                    </Text>
                    {canEdit ? (
                      <Pressable onPress={() => removeIntervention(i)} hitSlop={8}>
                        <Trash2 size={15} color={colors.textMuted} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* Pièces */}
          {pieces.length === 0 ? (
            <Card padding="lg"><Text style={styles.muted}>Aucune pièce auto-générée pour cette unité.</Text></Card>
          ) : (
            pieces.map((piece, i) => (
              <Card key={`${piece.nom}-${i}`} padding="lg">
                <View style={styles.pieceHeader}>
                  <Text style={styles.pieceTitle}>{piece.nom}</Text>
                  {canEdit ? (
                    <Pressable onPress={() => onDeletePiece(i)} hitSlop={8} style={styles.pieceDelBtn}>
                      <Trash2 size={14} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </View>

                {/* OK / À corriger — visible UNIQUEMENT entre SIGNE et CLOTURE */}
                {canMarkOk ? (
                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={styles.label}>Conformité après inspection</Text>
                    <View style={styles.chipRow}>
                      <Pressable
                        onPress={() => setOkPiece(i, true)}
                        style={[styles.chip, piece.ok === true && styles.chipOk]}
                      >
                        <Text style={[styles.chipLabel, piece.ok === true && styles.chipLabelOk]}>✓ OK</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setOkPiece(i, false)}
                        style={[styles.chip, piece.ok === false && styles.chipKo]}
                      >
                        <Text style={[styles.chipLabel, piece.ok === false && styles.chipLabelKo]}>✗ À corriger</Text>
                      </Pressable>
                      {piece.ok != null ? (
                        <Pressable onPress={() => setOkPiece(i, null)} style={styles.chip}>
                          <Text style={styles.chipLabel}>Effacer</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : piece.ok != null ? (
                  // En lecture seule : badge OK / Pas OK
                  <View style={{ marginBottom: spacing.md }}>
                    <View style={[styles.okBadge, piece.ok ? styles.okBadgeOk : styles.okBadgeKo]}>
                      <Text style={styles.okBadgeLabel}>
                        {piece.ok ? '✓ OK' : '✗ À corriger'}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <Text style={styles.label}>État</Text>
                <View style={styles.chipRow}>
                  {ETATS.map((etat) => {
                    const active = piece.etat === etat;
                    return (
                      <Pressable
                        key={etat}
                        onPress={() => setEtatPiece(i, etat)}
                        disabled={!canEdit}
                        style={[styles.chip, active && styles.chipActive, !canEdit && styles.chipDisabled]}
                      >
                        <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{etat}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, { marginTop: spacing.md }]}>Observations</Text>
                <TextInput
                  value={piece.observations ?? ''}
                  onChangeText={(t) => setObsPiece(i, t)}
                  onBlur={flushObs}
                  editable={canEdit}
                  placeholder="État de la pièce, défauts, etc."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[styles.textArea, webInputReset]}
                />

                <Text style={[styles.label, { marginTop: spacing.md }]}>
                  Photos ({(piece.photos ?? []).length}/{MAX_PHOTOS_PER_PIECE})
                </Text>
                <View style={styles.photoGrid}>
                  {(piece.photos ?? []).map((src, pIdx) => (
                    <View key={pIdx} style={styles.photoCell}>
                      <Image source={{ uri: src }} style={styles.photo} />
                      {canEdit ? (
                        <Pressable onPress={() => removePhoto(i, pIdx)} style={styles.photoDel} hitSlop={6}>
                          <Trash2 size={12} color={colors.textInverse} />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
                {canEdit && (piece.photos ?? []).length < MAX_PHOTOS_PER_PIECE ? (
                  <View style={styles.photoActions}>
                    <Pressable onPress={() => addPhotoFromCamera(i)} style={styles.photoBtn}>
                      <Camera size={16} color={colors.primary} />
                      <Text style={styles.photoBtnLabel}>Photo</Text>
                    </Pressable>
                    <Pressable onPress={() => addPhotoFromLibrary(i)} style={styles.photoBtn}>
                      <ImageIcon size={16} color={colors.primary} />
                      <Text style={styles.photoBtnLabel}>Galerie</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            ))
          )}

          {/* Ajouter une pièce — uniquement avant signature */}
          {canEdit ? (
            <Pressable onPress={() => { setNewPieceName(''); setAddOpen(true); }} style={styles.addPieceBtn}>
              <Plus size={18} color={colors.primary} />
              <Text style={styles.addPieceLabel}>Ajouter une pièce</Text>
            </Pressable>
          ) : null}

          {/* Bouton signature initiale — avant SIGNE */}
          {!isSigned ? (
            <Button label="Signer & finaliser" onPress={() => setSignOpen(true)} />
          ) : null}

          {/* Bloc Signatures initiales — après SIGNE */}
          {isSigned ? (
            <Card padding="lg">
              <Text style={styles.sectionTitle}>Signatures initiales</Text>
              <View style={styles.signGrid}>
                <View style={styles.signCol}>
                  <Text style={styles.signLbl}>Agent</Text>
                  <Text style={styles.signName}>{data.signataire_agent ?? '—'}</Text>
                  <SignaturePad value={data.signature_agent_data} readonly />
                </View>
                <View style={styles.signCol}>
                  <Text style={styles.signLbl}>Locataire</Text>
                  <Text style={styles.signName}>{data.signataire_locataire ?? '—'}</Text>
                  <SignaturePad value={data.signature_locataire_data} readonly />
                </View>
              </View>
              {data.date_signature ? (
                <Text style={[styles.muted, { marginTop: spacing.sm }]}>Signé le {data.date_signature}</Text>
              ) : null}
            </Card>
          ) : null}

          {/* Workflow clôture — après SIGNE */}
          {isSigned ? (
            <Card padding="lg" style={isClotured ? { backgroundColor: colors.successSoft } : undefined}>
              <Text style={styles.sectionTitle}>
                {isClotured ? 'Clôture finalisée' : 'Clôture après travaux'}
              </Text>
              {!isClotured ? (
                <Text style={styles.muted}>
                  Une fois les corrections faites, signez ci-dessous pour valider la clôture côté agence.
                  Le locataire signera depuis son app.
                </Text>
              ) : null}
              <View style={[styles.signGrid, { marginTop: spacing.md }]}>
                <View style={styles.signCol}>
                  <Text style={styles.signLbl}>Agent {agentAlreadyClotured ? '✓' : '(en attente)'}</Text>
                  <Text style={styles.signName}>{data.signataire_agent_cloture ?? '—'}</Text>
                  <SignaturePad value={data.signature_agent_cloture_data} readonly />
                </View>
                <View style={styles.signCol}>
                  <Text style={styles.signLbl}>Locataire {locataireAlreadyClotured ? '✓' : '(en attente)'}</Text>
                  <Text style={styles.signName}>{data.signataire_locataire_cloture ?? '—'}</Text>
                  <SignaturePad value={data.signature_locataire_cloture_data} readonly />
                </View>
              </View>
              {!agentAlreadyClotured && !isClotured ? (
                <View style={{ marginTop: spacing.md }}>
                  <Button label="Signer la clôture" onPress={() => setClotureOpen(true)} />
                </View>
              ) : null}
              {isClotured && data.date_cloture ? (
                <Text style={[styles.muted, { marginTop: spacing.sm }]}>Clôturé le {data.date_cloture}</Text>
              ) : null}
            </Card>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Modal signature initiale — double */}
      <Modal visible={signOpen} animationType="slide" onRequestClose={() => setSignOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Signer & finaliser</Text>
            <Pressable onPress={() => setSignOpen(false)} hitSlop={10}><X size={24} color={colors.textDark} /></Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!signingActive}
          >
            <Text style={styles.muted}>
              Les deux parties signent au doigt. Une fois validé, l'EDL passe en statut « Signé » et apparaît dans l'app du locataire.
            </Text>

            <View>
              <Text style={styles.signLbl}>Nom du locataire</Text>
              <TextInput value={signNomLocataire} onChangeText={setSignNomLocataire} placeholder="Prénom Nom" placeholderTextColor={colors.textMuted} style={[styles.input, webInputReset]} />
              <View style={{ marginTop: spacing.sm }}>
                <SignaturePad label="Signature du locataire" value={signDataLocataire} onChange={setSignDataLocataire} onSigningChange={setSigningActive} />
              </View>
            </View>

            <View>
              <Text style={styles.signLbl}>Nom de l'agent</Text>
              <TextInput value={signNomAgent} onChangeText={setSignNomAgent} placeholder="Prénom Nom" placeholderTextColor={colors.textMuted} style={[styles.input, webInputReset]} />
              <View style={{ marginTop: spacing.sm }}>
                <SignaturePad label="Signature de l'agent" value={signDataAgent} onChange={setSignDataAgent} onSigningChange={setSigningActive} />
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="ghost" onPress={() => setSignOpen(false)} disabled={signInitialM.isPending} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Finaliser" onPress={onSignInitial} loading={signInitialM.isPending} icon={<Check size={16} color={colors.textInverse} />} />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal signature clôture (agent uniquement) */}
      <Modal visible={clotureOpen} animationType="slide" onRequestClose={() => setClotureOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Signature de clôture — Agent</Text>
            <Pressable onPress={() => setClotureOpen(false)} hitSlop={10}><X size={24} color={colors.textDark} /></Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!signingActive}
          >
            <Text style={styles.muted}>
              En signant, vous validez que les corrections demandées ont été réalisées.
              L'EDL sera définitivement clôturé quand le locataire aura signé depuis son app.
            </Text>
            <View>
              <Text style={styles.signLbl}>Votre nom</Text>
              <TextInput value={clotureNom} onChangeText={setClotureNom} placeholder="Prénom Nom" placeholderTextColor={colors.textMuted} style={[styles.input, webInputReset]} />
              <View style={{ marginTop: spacing.sm }}>
                <SignaturePad label="Signature" value={clotureData} onChange={setClotureData} onSigningChange={setSigningActive} />
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="ghost" onPress={() => setClotureOpen(false)} disabled={signClotureM.isPending} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Signer" onPress={onSignCloture} loading={signClotureM.isPending} icon={<Check size={16} color={colors.textInverse} />} />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal ajout pièce */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddOpen(false)} />
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.modalTitle}>Ajouter une pièce</Text>
              <Pressable onPress={() => setAddOpen(false)} hitSlop={10}><X size={22} color={colors.textDark} /></Pressable>
            </View>
            <Text style={styles.muted}>Ex : Cellier, Dressing, Mezzanine…</Text>
            <Text style={styles.signLbl}>Nom *</Text>
            <TextInput
              value={newPieceName}
              onChangeText={setNewPieceName}
              autoFocus
              placeholder="Cellier"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, webInputReset]}
              onSubmitEditing={onAddPiece}
              returnKeyType="done"
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}><Button label="Annuler" variant="ghost" onPress={() => setAddOpen(false)} /></View>
              <View style={{ flex: 1 }}><Button label="Ajouter" onPress={onAddPiece} disabled={!newPieceName.trim()} /></View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PdfViewerModal
        visible={viewerUri !== null}
        uri={viewerUri}
        title={`EDL ${data.reference ?? ''}`}
        onClose={() => setViewerUri(null)}
      />
    </KeyboardAvoidingView>
  );
}

function PdfBtn({ icon, label, onPress, loading, disabled }: {
  icon: React.ReactNode; label: string; onPress: () => void; loading: boolean; disabled: boolean;
}) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [styles.pdfBtn, disabled && { opacity: 0.5 }, pressed && !disabled && { opacity: 0.85 }]}>
      {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <>{icon}<Text style={styles.pdfBtnLabel}>{label}</Text></>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  ref: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },
  // Titre pris a la source commune (theme/typographie) : cet ecran
  // dessinait le sien, sur une taille qui n'existait nulle part ailleurs.
  title: titreDocument,
  muted: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, lineHeight: 18 },

  pdfRow: { flexDirection: 'row', gap: spacing.sm },

  // Interventions avant signature
  intervHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  intervTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  intervAddRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'center' },
  intervInput: {
    flex: 1,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md,
    fontSize: fontSize.sm, color: colors.textDark, backgroundColor: colors.bgCard,
  },
  intervAddBtn: {
    width: 42, height: 42, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  intervRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.bgSoft, borderRadius: radius.md,
  },
  intervCheckbox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  intervCheckboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  intervLibelle: { flex: 1, fontSize: fontSize.sm, color: colors.textDark },
  intervLibelleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  pdfBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, gap: spacing.xs,
    backgroundColor: colors.bgSoft, borderRadius: radius.lg,
    flexDirection: 'column',
  },
  pdfBtnLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  pieceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  pieceTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark, marginBottom: spacing.sm },
  pieceDelBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },

  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.xs },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.bgSoft,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.5 },
  chipLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  chipLabelActive: { color: colors.textInverse },
  chipOk: { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipLabelOk: { color: colors.textInverse },
  chipKo: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipLabelKo: { color: colors.textInverse },

  okBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  okBadgeOk: { backgroundColor: colors.successSoft },
  okBadgeKo: { backgroundColor: colors.dangerSoft },
  okBadgeLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textDark },

  textArea: {
    minHeight: 70, maxHeight: 200,
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.sm, color: colors.textDark, backgroundColor: colors.bgCard,
    textAlignVertical: 'top',
  },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoCell: { width: 84, height: 84, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  photo: { width: 84, height: 84, backgroundColor: colors.bgSoft },
  photoDel: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.bgSoft,
  },
  photoBtnLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  addPieceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed',
    backgroundColor: colors.bgCard,
  },
  addPieceLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },

  // Bloc signatures (lecture seule en bas du detail)
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark, marginBottom: spacing.sm },
  signGrid: { flexDirection: 'row', gap: spacing.md },
  signCol: { flex: 1, gap: 4 },
  signLbl: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  signName: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold, marginBottom: 4 },

  // Modals
  modalSafe: { flex: 1, backgroundColor: colors.bgApp },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  modalFooter: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },

  input: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md,
    fontSize: fontSize.sm, color: colors.textDark, backgroundColor: colors.bgCard,
    marginTop: 4,
  },
});
