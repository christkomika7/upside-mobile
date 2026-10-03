import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '../../components/Card';
import { DetailHero } from '../../components/DetailHero';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import {
  useCancelIntervention,
  useLocataireIntervention,
  useLocataireInterventionMessages,
  usePostLocataireInterventionMessage,
  useSetDisponibilites,
} from '../../hooks/locataire';
import type { LocataireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing, webInputReset } from '../../theme';
import { fmtDateTime } from '../../utils/format';

type Route = RouteProp<LocataireStackParamList, 'InterventionDetail'>;

export function InterventionDetailScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation();
  const id = route.params.interventionId;
  const { data, isLoading, isError, error, refetch, isFetching } = useLocataireIntervention(id);
  const messagesQ = useLocataireInterventionMessages(id);
  const postM = usePostLocataireInterventionMessage(id);
  const cancelM = useCancelIntervention();
  const setDispo = useSetDisponibilites(id);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [dJours, setDJours] = useState('');
  const [dHeures, setDHeures] = useState('');
  const [dContact, setDContact] = useState('');
  const [dTel, setDTel] = useState('');

  useEffect(() => {
    if (data?.dispo_demandee) {
      setDContact(data.contact_nom ?? '');
      setDTel(data.contact_tel ?? '');
    }
  }, [data?.id, data?.dispo_demandee, data?.contact_nom, data?.contact_tel]);

  const onSubmitDispo = () => {
    setDispo.mutate(
      {
        dispo_jours: dJours.trim() || undefined,
        dispo_heures: dHeures.trim() || undefined,
        contact_nom: dContact.trim() || undefined,
        contact_tel: dTel.trim() || undefined,
      },
      { onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Envoi impossible.') },
    );
  };

  const onSend = () => {
    const t = draft.trim();
    if (!t) return;
    postM.mutate(t, {
      onSuccess: () => setDraft(''),
      onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Envoi impossible.'),
    });
  };

  const onCancel = () => {
    Alert.alert(
      'Annuler la demande',
      'Voulez-vous vraiment supprimer cette demande d\'intervention ? L\'agence en sera informée.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: () => cancelM.mutate(id, {
            onSuccess: () => nav.goBack(),
            onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Suppression impossible.'),
          }),
        },
      ],
    );
  };

  if (isLoading) return <LoadingState label="Chargement…" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const photos = data.photos ?? [];
  const messages = messagesQ.data ?? [];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bgApp }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
    <ScrollView
      contentContainerStyle={styles.scroll}
      style={{ backgroundColor: colors.bgApp }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <DetailHero
        overline="Intervention"
        title={data.titre ?? `Intervention #${data.id}`}
        statut={statusLabel(data.statut)}
        meta={[
          ...(data.reference ? [{ label: 'Référence', value: data.reference }] : []),
          { label: 'Créée le', value: fmtDateTime(data.created_at) },
        ]}
      />

      {/* Description */}
      {data.description ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Demande</Text>
          <Text style={styles.body}>{data.description}</Text>
        </Card>
      ) : null}

      {/* Disponibilités demandées par l'agence — le locataire les saisit ici */}
      {data.dispo_demandee ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Vos disponibilités</Text>
          <Text style={[styles.body, { marginBottom: spacing.md }]}>
            L'agence a besoin de vos disponibilités pour intervenir. Indiquez vos jours et heures, et la personne à contacter.
          </Text>
          <View style={{ gap: spacing.sm }}>
            <TextInput value={dJours} onChangeText={setDJours} placeholder="Jours (ex : Lun, Mer, Sam)" placeholderTextColor={colors.textMuted} style={[styles.dispoInput, webInputReset]} />
            <TextInput value={dHeures} onChangeText={setDHeures} placeholder="Heures (ex : 9h-12h)" placeholderTextColor={colors.textMuted} style={[styles.dispoInput, webInputReset]} />
            <TextInput value={dContact} onChangeText={setDContact} placeholder="Personne à contacter" placeholderTextColor={colors.textMuted} style={[styles.dispoInput, webInputReset]} />
            <TextInput value={dTel} onChangeText={setDTel} placeholder="Téléphone" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" style={[styles.dispoInput, webInputReset]} />
          </View>
          <Pressable
            onPress={onSubmitDispo}
            disabled={setDispo.isPending || (!dJours.trim() && !dHeures.trim())}
            style={[styles.primaryBtn, (setDispo.isPending || (!dJours.trim() && !dHeures.trim())) && { opacity: 0.5 }]}
          >
            <Text style={styles.primaryBtnLabel}>{setDispo.isPending ? 'Envoi…' : 'Envoyer mes disponibilités'}</Text>
          </Pressable>
        </Card>
      ) : null}

      {/* Photos jointes par le locataire */}
      {photos.length > 0 ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
          <View style={styles.photoGrid}>
            {photos.map((uri, idx) => (
              <Pressable key={idx} onPress={() => setPreviewIdx(idx)} style={styles.photoCell}>
                <Image source={{ uri }} style={styles.photo} />
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      {/* Détails */}
      <Card padding="lg">
        <Text style={styles.sectionTitle}>Détails</Text>
        <Row label="Catégorie" value={data.categorie ?? '—'} />
        <Row label="Priorité" value={priorityLabel(data.priorite)} />
        <Row label="Logement" value={data.unite_nom ?? '—'} />
        {data.contact_nom ? <Row label="Contact" value={data.contact_nom} /> : null}
        {data.contact_tel ? <Row label="Téléphone" value={data.contact_tel} /> : null}
        {data.dispo_jours ? <Row label="Disponibilités" value={data.dispo_jours} /> : null}
        {data.dispo_heures ? <Row label="Horaires" value={data.dispo_heures} /> : null}
        <Row last label="Intervenant" value={data.intervenant_nom ?? 'En attente d\'assignation'} />
      </Card>

      {/* Coût volontairement masqué — visible uniquement côté propriétaire. */}

      {/* Rapport */}
      {data.rapport ? (
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Compte rendu</Text>
          <Text style={styles.body}>{data.rapport}</Text>
        </Card>
      ) : null}

      {/* Messages avec l'agence */}
      <Card padding="lg">
        <Text style={styles.sectionTitle}>Messages avec l'agence</Text>
        {messages.length === 0 ? (
          <Text style={styles.emptyText}>Aucun message pour le moment.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {messages.map((m) => {
              const isMe = m.from_role === 'LOCATAIRE';
              return (
                <View key={m.id} style={[styles.msgRow, isMe ? styles.msgMine : styles.msgOther]}>
                  <Text style={[styles.msgAuthor, isMe ? styles.msgAuthorMine : styles.msgAuthorOther]}>
                    {isMe ? 'Vous' : (m.user_name ?? 'Agence')}
                  </Text>
                  <Text style={[styles.msgText, isMe && styles.msgTextMine]}>{m.text}</Text>
                  <Text style={[styles.msgDate, isMe && styles.msgDateMine]}>{fmtDateTime(m.created_at)}</Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Écrire à l'agence…"
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

      {/* Annuler / supprimer sa demande (impossible si déjà clôturée) */}
      {data.statut !== 'CLOTURE' ? (
        <Pressable
          onPress={onCancel}
          disabled={cancelM.isPending}
          style={[styles.cancelBtn, cancelM.isPending && { opacity: 0.5 }]}
        >
          <Text style={styles.cancelBtnLabel}>{cancelM.isPending ? 'Suppression…' : 'Annuler la demande'}</Text>
        </Pressable>
      ) : null}

      {/* Viewer plein écran d'une photo */}
      <Modal
        visible={previewIdx !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewIdx(null)}
      >
        <SafeAreaView style={styles.previewSafe}>
          <Pressable style={styles.previewClose} onPress={() => setPreviewIdx(null)} hitSlop={10}>
            <X size={28} color="#fff" />
          </Pressable>
          <Pressable style={styles.previewBackdrop} onPress={() => setPreviewIdx(null)}>
            {previewIdx !== null && photos[previewIdx] ? (
              <Image source={{ uri: photos[previewIdx] }} style={styles.previewImage} resizeMode="contain" />
            ) : null}
          </Pressable>
        </SafeAreaView>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
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
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  muted: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  body: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold, maxWidth: '60%', textAlign: 'right' },

  // Grille photos + viewer plein écran
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoCell: { width: 92, height: 92, borderRadius: radius.md, overflow: 'hidden' },
  photo: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.bgSoft },

  previewSafe: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  previewClose: {
    position: 'absolute',
    top: 24,
    right: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  previewImage: { width: '100%', height: '100%' },

  emptyText: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
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

  cancelBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#ef4444', backgroundColor: '#fef2f2',
  },
  cancelBtnLabel: { fontSize: fontSize.sm, color: '#dc2626', fontWeight: fontWeight.bold },

  dispoInput: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.lg,
    fontSize: fontSize.sm, color: colors.textDark, backgroundColor: colors.bgCard,
  },
  primaryBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: radius.lg, marginTop: spacing.md,
    backgroundColor: colors.primary,
  },
  primaryBtnLabel: { fontSize: fontSize.sm, color: colors.textInverse, fontWeight: fontWeight.bold },
});
