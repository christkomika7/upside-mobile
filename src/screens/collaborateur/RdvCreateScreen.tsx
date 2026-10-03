/**
 * Création d'un rendez-vous depuis le terrain (commercial en visite).
 *
 * Format des champs date/heure : ISO simple (YYYY-MM-DD, HH:MM) — pas de
 * dépendance native picker pour Phase 1. À l'enregistrement, le scheduler
 * backend programme automatiquement :
 *   - push T-4h aux participants (collaborateurs)
 *   - push T-1h aux participants (collaborateurs)
 *   - email T-4h aux collaborateurs + emails externes
 *
 * Participants :
 *   - multi-select de collaborateurs UPSide (push + email)
 *   - chips d'emails externes (email uniquement)
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Building2, Check, Search, User as UserIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DateField } from '../../components/DateField';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../auth/store';
import { useCollaborateurTiers, useCollaborateurUsers, useCreateRendezVous, type RdvTiersOption } from '../../hooks/collaborateur';
import type { CollaborateurStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing, webInputReset } from '../../theme';
import { frToIso } from '../../utils/format';

type Nav = NativeStackNavigationProp<CollaborateurStackParamList>;

const HHMM_RE = /^\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function todayFr(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function RdvCreateScreen() {
  const nav = useNavigation<Nav>();
  const me = useAuth((s) => s.user);
  const createM = useCreateRendezVous();
  const usersQ = useCollaborateurUsers();

  const [objet, setObjet] = useState('');
  // Stocke en format FR (JJ/MM/AAAA) — converti vers ISO à la soumission.
  const [dateFr, setDateFr] = useState(todayFr());
  const [heure, setHeure] = useState(nowHHMM());
  const [adresse, setAdresse] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailDraft, setEmailDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tiers (locataire ou propriétaire) associé au RDV
  const [tiersType, setTiersType] = useState<'LOCATAIRE' | 'PROPRIETAIRE'>('LOCATAIRE');
  const [tiersSelected, setTiersSelected] = useState<RdvTiersOption | null>(null);
  const [tiersPickerOpen, setTiersPickerOpen] = useState(false);
  const [tiersSearch, setTiersSearch] = useState('');
  const tiersQ = useCollaborateurTiers(tiersType, tiersSearch.trim() || undefined);
  const tiersList = tiersQ.data ?? [];

  const onAddEmail = () => {
    const e = emailDraft.trim().toLowerCase();
    if (!e) return;
    if (!EMAIL_RE.test(e)) {
      setError(`Email invalide : ${e}`);
      return;
    }
    if (emails.includes(e)) {
      setEmailDraft('');
      return;
    }
    setEmails([...emails, e]);
    setEmailDraft('');
    setError(null);
  };

  const onRemoveEmail = (e: string) => setEmails(emails.filter((x) => x !== e));

  const onSubmit = () => {
    setError(null);
    if (!objet.trim()) { setError('Indiquez un objet pour le rendez-vous.'); return; }
    const dateIso = frToIso(dateFr);
    if (!dateIso) { setError('Date invalide. Format attendu : JJ/MM/AAAA.'); return; }
    if (!HHMM_RE.test(heure)) { setError('Heure invalide. Format attendu : HH:MM.'); return; }

    createM.mutate(
      {
        objet: objet.trim(),
        date_rdv: dateIso,
        heure_rdv: heure,
        adresse: adresse.trim() || null,
        notes: notes.trim() || null,
        membres_ids: selectedUserIds,
        emails_externes: emails,
        // Tiers (locataire ou propriétaire) — optionnel
        tiers_type: tiersSelected ? tiersType : undefined,
        tiers_id: tiersSelected ? tiersSelected.id : undefined,
      },
      {
        // Retour immédiat à la liste des rendez-vous. Sur web, Alert.alert
        // fallback sur window.alert et le onPress du bouton n'est jamais
        // déclenché — on navigue donc directement, la liste réagit déjà en
        // temps réel via l'invalidation TanStack Query.
        onSuccess: () => nav.goBack(),
        onError: (e) => setError(e instanceof Error ? e.message : 'Impossible de créer le rendez-vous.'),
      },
    );
  };

  const users = usersQ.data ?? [];
  const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Détails</Text>
            <View style={styles.detailsFields}>
              <TextField
                label="Objet *"
                value={objet}
                onChangeText={setObjet}
                placeholder="Ex : Visite appartement A3"
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <DateField label="Date *" value={dateFr} onChangeText={setDateFr} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Heure * (HH:MM)"
                    value={heure}
                    onChangeText={setHeure}
                    placeholder="14:30"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <TextField
                label="Adresse"
                value={adresse}
                onChangeText={setAdresse}
                placeholder="Ex : Immeuble Wave, Libreville"
              />
              <TextField
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes internes…"
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' as const }}
              />
            </View>
          </Card>

          {/* Tiers (locataire ou propriétaire) — au-dessus des collaborateurs */}
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Interlocuteur</Text>
            <View style={styles.tiersToggle}>
              {(['LOCATAIRE', 'PROPRIETAIRE'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => { setTiersType(k); setTiersSelected(null); }}
                  style={[styles.tiersToggleBtn, tiersType === k && styles.tiersToggleBtnActive]}
                >
                  {k === 'LOCATAIRE'
                    ? <UserIcon size={14} color={tiersType === k ? colors.textInverse : colors.textDark} />
                    : <Building2 size={14} color={tiersType === k ? colors.textInverse : colors.textDark} />}
                  <Text style={[styles.tiersToggleLabel, tiersType === k && styles.tiersToggleLabelActive]}>
                    {k === 'LOCATAIRE' ? 'Locataire' : 'Propriétaire'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {tiersSelected ? (
              <View style={styles.tiersSelected}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tiersSelectedNom}>{tiersSelected.nom}</Text>
                  {tiersSelected.email ? <Text style={styles.tiersSelectedSub}>{tiersSelected.email}</Text> : null}
                </View>
                <Pressable onPress={() => setTiersSelected(null)} hitSlop={10}>
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setTiersPickerOpen(true)} style={styles.tiersPickerBtn}>
                <Search size={16} color={colors.textMuted} />
                <Text style={styles.tiersPickerBtnLabel}>
                  Choisir un {tiersType === 'LOCATAIRE' ? 'locataire' : 'propriétaire'}…
                </Text>
              </Pressable>
            )}
            <Text style={styles.help}>
              Facultatif — permet d'associer le rendez-vous à un {tiersType === 'LOCATAIRE' ? 'locataire' : 'propriétaire'} de la base.
            </Text>
          </Card>

          {/* Collaborateurs UPSide */}
          <Card padding="lg">
            <View style={styles.partHeader}>
              <Text style={styles.sectionTitle}>Collaborateurs invités</Text>
              <Pressable onPress={() => setPickerOpen(true)} style={styles.pickerBtn}>
                <Text style={styles.pickerBtnLabel}>+ Ajouter</Text>
              </Pressable>
            </View>
            {selectedUsers.length === 0 ? (
              <Text style={styles.emptyText}>Aucun collaborateur sélectionné.</Text>
            ) : (
              <View style={styles.chipsRow}>
                {selectedUsers.map((u) => (
                  <View key={u.id} style={styles.chip}>
                    <Text style={styles.chipText}>{u.prenom} {u.nom}</Text>
                    <Pressable
                      onPress={() => setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id))}
                      hitSlop={8}
                    >
                      <X size={14} color={colors.textDark} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.help}>
              Reçoivent les notifications push (4h + 1h avant) ET un email 4h avant.
            </Text>
          </Card>

          {/* Emails externes */}
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Emails externes</Text>
            <View style={styles.emailAddRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={emailDraft}
                  onChangeText={setEmailDraft}
                  onSubmitEditing={onAddEmail}
                  placeholder="email@exemple.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="done"
                  style={[styles.emailInput, webInputReset]}
                />
              </View>
              <Pressable onPress={onAddEmail} style={styles.pickerBtn}>
                <Text style={styles.pickerBtnLabel}>Ajouter</Text>
              </Pressable>
            </View>
            {emails.length > 0 ? (
              <View style={[styles.chipsRow, { marginTop: spacing.sm }]}>
                {emails.map((e) => (
                  <View key={e} style={styles.chip}>
                    <Text style={styles.chipText}>{e}</Text>
                    <Pressable onPress={() => onRemoveEmail(e)} hitSlop={8}>
                      <X size={14} color={colors.textDark} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.help}>
              Reçoivent uniquement un email 4h avant (pas de push, ils n'ont pas l'app).
            </Text>
          </Card>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              ⏰ Rappels automatiques pour {me?.prenom ?? 'vous'} + tous les participants
              {'\n'}• Push 4 h avant
              {'\n'}• Push 1 h avant
              {'\n'}• Email 4 h avant
            </Text>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="ghost" onPress={() => nav.goBack()} disabled={createM.isPending} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Enregistrer" onPress={onSubmit} loading={createM.isPending} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modal picker tiers (locataire/propriétaire) */}
      <Modal visible={tiersPickerOpen} animationType="slide" onRequestClose={() => setTiersPickerOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {tiersType === 'LOCATAIRE' ? 'Locataires' : 'Propriétaires'}
            </Text>
            <Pressable onPress={() => setTiersPickerOpen(false)} hitSlop={10}>
              <X size={24} color={colors.textDark} />
            </Pressable>
          </View>
          <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
            <TextField
              label={undefined}
              value={tiersSearch}
              onChangeText={setTiersSearch}
              placeholder="Rechercher par nom ou email…"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xs }}>
            {tiersQ.isLoading ? (
              <Text style={styles.emptyText}>Chargement…</Text>
            ) : tiersList.length === 0 ? (
              <Text style={styles.emptyText}>Aucun résultat.</Text>
            ) : tiersList.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => { setTiersSelected(t); setTiersPickerOpen(false); setTiersSearch(''); }}
                style={styles.userRow}
              >
                {tiersType === 'LOCATAIRE'
                  ? <UserIcon size={18} color={colors.textMuted} />
                  : <Building2 size={18} color={colors.textMuted} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userLabel}>{t.nom}</Text>
                  <Text style={styles.userSub}>{t.email ?? t.telephone ?? '—'}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal multi-select utilisateurs */}
      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Collaborateurs</Text>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
              <X size={24} color={colors.textDark} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xs }}>
            {usersQ.isLoading ? (
              <Text style={styles.emptyText}>Chargement…</Text>
            ) : users.length === 0 ? (
              <Text style={styles.emptyText}>Aucun collaborateur disponible.</Text>
            ) : users.map((u) => {
              const selected = selectedUserIds.includes(u.id);
              const isMe = me?.id === u.id;
              return (
                <Pressable
                  key={u.id}
                  onPress={() => {
                    setSelectedUserIds(selected
                      ? selectedUserIds.filter((id) => id !== u.id)
                      : [...selectedUserIds, u.id]);
                  }}
                  style={[styles.userRow, selected && styles.userRowActive]}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                    {selected ? <Check size={14} color={colors.textInverse} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userLabel}>
                      {u.prenom} {u.nom} {isMe ? '(moi)' : ''}
                    </Text>
                    <Text style={styles.userSub}>{u.email ?? '—'} · {u.user_type}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Pressable onPress={() => setPickerOpen(false)} style={styles.modalBtn}>
              <Text style={styles.modalBtnLabel}>OK ({selectedUserIds.length})</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  // Espacement vertical généreux entre les champs du bloc Détails
  detailsFields: { gap: spacing.lg },
  partHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Tiers (locataire / propriétaire)
  tiersToggle: {
    flexDirection: 'row', gap: spacing.xs,
    backgroundColor: colors.bgSoft,
    padding: 4, borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  tiersToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  tiersToggleBtnActive: { backgroundColor: colors.primary },
  tiersToggleLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textDark },
  tiersToggleLabelActive: { color: colors.textInverse },
  tiersPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md,
    backgroundColor: colors.bgCard,
  },
  tiersPickerBtnLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textMuted },
  tiersSelected: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgSoft,
    borderWidth: 1, borderColor: colors.primary,
  },
  tiersSelectedNom: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  tiersSelectedSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  emptyText: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  help: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 16 },
  pickerBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.bgSoft, borderRadius: radius.pill,
  },
  pickerBtnLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.bgSoft, borderRadius: radius.pill,
  },
  chipText: { fontSize: fontSize.xs, color: colors.textDark, fontWeight: fontWeight.semibold },

  emailAddRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emailInput: {
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md,
    fontSize: fontSize.sm, color: colors.textDark, backgroundColor: colors.bgCard,
  },

  infoCard: { backgroundColor: colors.bgSoft, padding: spacing.md, borderRadius: 12 },
  infoText: { fontSize: fontSize.xs, color: colors.textDark, lineHeight: 18 },
  errorCard: { backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: 12 },
  errorText: { fontSize: fontSize.sm, color: colors.danger, fontWeight: fontWeight.semibold },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },

  // Modal picker
  modalSafe: { flex: 1, backgroundColor: colors.bgApp },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  modalFooter: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight },
  modalBtn: {
    paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center',
    backgroundColor: colors.primary,
  },
  modalBtnLabel: { fontSize: fontSize.sm, color: colors.textInverse, fontWeight: fontWeight.bold },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md,
  },
  userRowActive: { backgroundColor: colors.bgSoft },
  checkbox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  userLabel: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },
  userSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});
