import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Check, Download, Eye, Printer, X } from 'lucide-react-native';
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
import { DetailHero } from '../../components/DetailHero';
import { PdfActions } from '../../components/PdfActions';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { SignaturePad } from '../../components/SignaturePad';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useAuth } from '../../auth/store';
import { useEdlDocumentAvailable, useLocataireEdl, useSignClotureLocataireEdl } from '../../hooks/locataire';
import type { EdlPiece } from '../../types/api';
import type { LocataireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing, webInputReset } from '../../theme';
import { fmtDate } from '../../utils/format';
import { downloadBackendPdf, printBackendPdf, viewBackendPdf } from '../../utils/backendPdf';

type PdfAction = 'view' | 'print' | 'share' | null;

type Route = RouteProp<LocataireStackParamList, 'EdlDetail'>;

export function EdlDetailScreen() {
  const route = useRoute<Route>();
  // Retour à la liste après signature de clôture (cf. onSignCloture).
  const nav = useNavigation();
  const id = route.params.edlId;
  const me = useAuth((s) => s.user);
  const { data, isLoading, isError, error, refetch, isFetching } = useLocataireEdl(id);
  const docQ = useEdlDocumentAvailable(id);
  const docAvailable = docQ.data?.available ?? false;
  const signClotureM = useSignClotureLocataireEdl(id);

  const [pdfBusy, setPdfBusy] = useState<PdfAction>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [clotureOpen, setClotureOpen] = useState(false);
  const [clotureNom, setClotureNom] = useState('');
  const [clotureData, setClotureData] = useState<string>('');
  // Désactive le scroll du modal pendant qu'on signe.
  const [signingActive, setSigningActive] = useState(false);

  useEffect(() => {
    if (data?.signataire_locataire) setClotureNom(data.signataire_locataire);
    else if (me) setClotureNom(`${me.prenom ?? ''} ${me.nom ?? ''}`.trim());
  }, [data?.id, me]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingState label="Chargement…" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  // canAddObs réservé pour usage futur (ajout d'obs via mobile désactivé pour l'instant)

  const isSigned = data.statut === 'SIGNE' || data.statut === 'CLOTURE';
  const isClotured = data.statut === 'CLOTURE';
  const locataireAlreadyClotured = !!data.signature_locataire_cloture_data;
  const agentAlreadyClotured = !!data.signature_agent_cloture_data;

  // PDF EDL rendu par le backend (WeasyPrint) — identique au PDF du logiciel web.
  const pdfPath = `/mobile/locataire/etats-lieux/${data.id}/pdf`;
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

  const onSignCloture = () => {
    if (!clotureNom.trim()) { Alert.alert('Manque', 'Saisissez votre nom.'); return; }
    if (!clotureData || JSON.parse(clotureData || '[]').length === 0) {
      Alert.alert('Manque', 'Signez avant de valider.'); return;
    }
    signClotureM.mutate({ signataire: clotureNom.trim(), signature_data: clotureData }, {
      // Retour direct à la liste — l'invalidation TanStack Query rafraîchit
      // la liste des EDL toute seule. (Sur web, Alert fallback sur
      // window.alert et ignore les callbacks des boutons.)
      onSuccess: () => {
        setClotureOpen(false);
        nav.goBack();
      },
      onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Signature impossible.'),
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      style={{ backgroundColor: colors.bgApp }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <DetailHero
        overline="État des lieux"
        title={`EDL ${data.type === 'ENTREE' ? "d'entrée" : 'de sortie'}`}
        statut={statusLabel(data.statut)}
        meta={[
          ...(data.reference ? [{ label: 'Référence', value: data.reference }] : []),
          { label: 'Réalisé le', value: data.date_edl ? fmtDate(data.date_edl) : 'À confirmer' },
          ...(data.date_signature ? [{ label: 'Signé le', value: fmtDate(data.date_signature) }] : []),
        ]}
      />

      {/* Actions PDF — Voir / Imprimer / Télécharger */}
      <View style={styles.pdfRow}>
        <PdfBtn icon={<Eye size={18} color={colors.primary} />} label="Voir" onPress={onPdfView} loading={pdfBusy === 'view'} disabled={pdfBusy !== null} />
        <PdfBtn icon={<Printer size={18} color={colors.primary} />} label="Imprimer" onPress={onPdfPrint} loading={pdfBusy === 'print'} disabled={pdfBusy !== null} />
        <PdfBtn icon={<Download size={18} color={colors.primary} />} label="Télécharger" onPress={onPdfShare} loading={pdfBusy === 'share'} disabled={pdfBusy !== null} />
      </View>

      {/* Bloc clôture — apparaît dès que SIGNE (en attente de la 2e partie) */}
      {isSigned ? (
        <Card padding="lg" style={isClotured ? { backgroundColor: colors.successSoft } : undefined}>
          <Text style={styles.sectionTitle}>{isClotured ? 'EDL clôturé ✓' : 'Clôture après travaux'}</Text>
          {!isClotured ? (
            <Text style={[styles.muted, { marginBottom: spacing.sm }]}>
              Dès que les corrections sont réalisées par l'agence, signez ci-dessous pour valider la clôture.
            </Text>
          ) : null}
          <Row label="Agence" value={data.signataire_agent_cloture ?? (agentAlreadyClotured ? '✓ signé' : 'En attente')} />
          <Row label="Vous" value={data.signataire_locataire_cloture ?? (locataireAlreadyClotured ? '✓ signé' : 'En attente')} last />
          {!locataireAlreadyClotured && !isClotured ? (
            <View style={{ marginTop: spacing.md }}>
              <Button label="Signer la clôture" onPress={() => setClotureOpen(true)} />
            </View>
          ) : null}
          {isClotured && data.date_cloture ? (
            <Text style={[styles.muted, { marginTop: spacing.sm }]}>Clôturé le {fmtDate(data.date_cloture)}</Text>
          ) : null}
        </Card>
      ) : null}

      {/* Document scanné signé */}
      {docAvailable ? (
        <Card padding="lg">
          <Text style={styles.docTitle}>Document signé</Text>
          <Text style={styles.docSub}>Scan déposé par votre technicien</Text>
          <View style={{ marginTop: spacing.md }}>
            <PdfActions
              apiPath={`/mobile/locataire/etats-lieux/${data.id}/document`}
              filename={`edl-${data.reference ?? data.id}.pdf`}
            />
          </View>
        </Card>
      ) : (
        <Card padding="lg" style={styles.docPlaceholder}>
          <Text style={styles.docTitle}>Document signé</Text>
          <Text style={styles.docSub}>
            En attente du dépôt par votre technicien. Le scan signé sera disponible ici dès qu'il sera ajouté.
          </Text>
        </Card>
      )}

      {/* Délai de chauffe — info seule, l'ajout d'observation se fait via l'agence */}
      {data.type === 'ENTREE' ? (
        <Card padding="lg" style={styles.warmupCard}>
          <Text style={styles.warmupTitle}>Délai de chauffe</Text>
          {data.delai_chauffe_jours_restants == null ? (
            <Text style={styles.warmupBody}>
              Le délai de chauffe commencera dès la signature de l'EDL.
            </Text>
          ) : data.delai_chauffe_jours_restants > 0 ? (
            <Text style={styles.warmupBody}>
              Il vous reste{' '}
              <Text style={styles.warmupCount}>
                {data.delai_chauffe_jours_restants} jour
                {data.delai_chauffe_jours_restants > 1 ? 's' : ''}
              </Text>{' '}
              pour signaler tout élément remarqué après votre installation.
              Contactez votre agence pour qu'elle ajoute votre observation à l'EDL d'entrée.
            </Text>
          ) : (
            <Text style={styles.warmupBody}>
              Le délai de chauffe est expiré. Aucune observation ne peut plus être ajoutée à l'EDL d'entrée.
            </Text>
          )}
        </Card>
      ) : null}

      {/* Signataires */}
      {(data.signataire_agent || data.signataire_locataire) ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Signataires</Text>
          {data.signataire_agent ? <Row label="Agence" value={data.signataire_agent} /> : null}
          {data.signataire_locataire ? <Row label="Locataire" value={data.signataire_locataire} last /> : null}
        </Card>
      ) : null}

      {/* Pièces */}
      {data.pieces.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <Text style={styles.sectionTitleBig}>Pièces ({data.pieces.length})</Text>
          {data.pieces.map((p, idx) => <PieceCard key={idx} piece={p} />)}
        </View>
      ) : (
        <Card padding="lg">
          <Text style={styles.muted}>Aucune pièce détaillée pour le moment.</Text>
        </Card>
      )}

      {data.notes ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.body}>{data.notes}</Text>
        </Card>
      ) : null}

      {/* Modal signature clôture (locataire) */}
      <Modal visible={clotureOpen} animationType="slide" onRequestClose={() => setClotureOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Signature de clôture</Text>
            <Pressable onPress={() => setClotureOpen(false)} hitSlop={10}><X size={24} color={colors.textDark} /></Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!signingActive}
          >
            <Text style={styles.muted}>
              En signant, vous confirmez que les corrections demandées ont été réalisées à votre satisfaction.
              L'EDL sera définitivement clôturé quand l'agence aura aussi signé de son côté.
            </Text>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Text style={styles.modalLabel}>Votre nom</Text>
              <TextInput
                value={clotureNom}
                onChangeText={setClotureNom}
                placeholder="Prénom Nom"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, webInputReset]}
              />
              <View style={{ marginTop: spacing.sm }}>
                <SignaturePad label="Signature" value={clotureData} onChange={setClotureData} onSigningChange={setSigningActive} />
              </View>
            </KeyboardAvoidingView>
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

      <PdfViewerModal
        visible={viewerUri !== null}
        uri={viewerUri}
        title={`EDL ${data.reference ?? ''}`}
        onClose={() => setViewerUri(null)}
      />
    </ScrollView>
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

function PieceCard({ piece }: { piece: EdlPiece }) {
  const photos = piece.photos ?? [];
  const obs = piece.observations_locataire ?? [];
  return (
    <Card padding="lg">
      <View style={styles.pieceHeader}>
        <Text style={styles.pieceName}>{piece.nom}</Text>
        {piece.etat ? (
          <Text style={[styles.etatBadge, etatColor(piece.etat)]}>{piece.etat}</Text>
        ) : null}
      </View>
      {piece.observations ? <Text style={styles.body}>{piece.observations}</Text> : null}

      {piece.elements && piece.elements.length > 0 ? (
        <View style={styles.elements}>
          {piece.elements.map((el, i) => (
            <View key={i} style={styles.elementRow}>
              <Text style={styles.elementName}>{el.nom ?? '—'}</Text>
              {el.etat ? <Text style={[styles.elementEtat, etatColor(el.etat)]}>{el.etat}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip} contentContainerStyle={{ gap: spacing.sm }}>
          {photos.map((src, i) => (
            <Image key={i} source={{ uri: src }} style={styles.photo} />
          ))}
        </ScrollView>
      ) : null}

      {obs.length > 0 ? (
        <View style={styles.obsBlock}>
          <Text style={styles.obsTitle}>Observations locataire</Text>
          {obs.map((o, i) => (
            <View key={i} style={styles.obsItem}>
              <Text style={styles.obsDate}>{o.date ? fmtDate(o.date) : ''}</Text>
              <Text style={styles.body}>{o.texte}</Text>
              {(o.photos ?? []).length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip} contentContainerStyle={{ gap: spacing.sm }}>
                  {(o.photos ?? []).map((src, j) => (
                    <Image key={j} source={{ uri: src }} style={styles.photoSm} />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </Card>
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

function etatColor(etat: string) {
  const s = etat.toLowerCase();
  if (s.includes('excellent') || s.includes('neuf') || s.includes('bon')) {
    return { color: '#047857', backgroundColor: colors.successSoft };
  }
  if (s.includes('moyen') || s.includes('usagé')) {
    return { color: '#B45309', backgroundColor: colors.warningSoft };
  }
  if (s.includes('mauvais') || s.includes('dégradé')) {
    return { color: '#B91C1C', backgroundColor: colors.dangerSoft };
  }
  return { color: colors.textMuted, backgroundColor: colors.borderLight };
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  muted: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  warmupCard: { backgroundColor: colors.warningSoft, borderColor: 'transparent' },
  warmupTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#92400E', marginBottom: spacing.xs },
  warmupBody: { fontSize: fontSize.sm, color: '#78350F', lineHeight: 20, marginBottom: spacing.md },
  warmupCount: { fontWeight: fontWeight.bold, color: '#78350F' },

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  sectionTitleBig: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },
  body: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: spacing.md },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold, maxWidth: '60%', textAlign: 'right' },

  pieceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  pieceName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },
  etatBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },

  elements: { marginTop: spacing.md, gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md },
  elementRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  elementName: { fontSize: fontSize.sm, color: colors.textDark },
  elementEtat: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },

  photoStrip: { marginTop: spacing.md },
  photo: { width: 120, height: 120, borderRadius: radius.md, backgroundColor: colors.bgSoft },
  photoSm: { width: 80, height: 80, borderRadius: radius.md, backgroundColor: colors.bgSoft },

  obsBlock: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: spacing.md },
  obsTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1 },
  obsItem: { gap: spacing.xs, backgroundColor: colors.bgSoft, padding: spacing.md, borderRadius: radius.md },
  obsDate: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold },

  docTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  docSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  docPlaceholder: { backgroundColor: colors.bgSoft, borderColor: 'transparent' },

  pdfRow: { flexDirection: 'row', gap: spacing.sm },
  pdfBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, gap: spacing.xs,
    backgroundColor: colors.bgSoft, borderRadius: radius.lg,
    flexDirection: 'column',
  },
  pdfBtnLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  modalSafe: { flex: 1, backgroundColor: colors.bgApp },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  modalLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  modalFooter: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  input: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md,
    fontSize: fontSize.sm, color: colors.textDark, backgroundColor: colors.bgCard,
  },
});
