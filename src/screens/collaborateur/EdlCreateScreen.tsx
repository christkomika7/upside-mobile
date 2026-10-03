/**
 * Création d'un EDL : on choisit la location + le type (entrée/sortie) + la date.
 * Le backend auto-génère les pièces (chambres, sdb, cuisine, salon, balcon…)
 * à partir du type d'unité — l'agent les édite ensuite dans EdlEditScreen.
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, X } from 'lucide-react-native';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TextField } from '../../components/TextField';
import { useCreateCollabEdl, useLocationsForEdl } from '../../hooks/collaborateur';
import type { CollaborateurStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';

type Nav = NativeStackNavigationProp<CollaborateurStackParamList>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

export function EdlCreateScreen() {
  const nav = useNavigation<Nav>();
  const locsQ = useLocationsForEdl();
  const createM = useCreateCollabEdl();

  const [type, setType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');
  const [date, setDate] = useState(todayISO());
  const [locationId, setLocationId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = locsQ.data?.find((l) => l.id === locationId);

  const onSubmit = () => {
    setError(null);
    if (!locationId) { setError('Sélectionnez une location.'); return; }
    if (!ISO_DATE_RE.test(date)) { setError('Date invalide (AAAA-MM-JJ).'); return; }
    createM.mutate(
      { type, location_id: locationId, date_edl: date },
      {
        onSuccess: (created) => {
          // @ts-ignore — react-query api wrapper retourne le payload directement
          const id = (created as { id?: number })?.id ?? (created as { data?: { id: number } })?.data?.id;
          if (id) {
            nav.replace('EdlEdit', { edlId: id });
          } else {
            nav.goBack();
          }
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Création impossible.'),
      },
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Type</Text>
            <View style={styles.typeRow}>
              <Pressable onPress={() => setType('ENTREE')} style={[styles.typeBtn, type === 'ENTREE' && styles.typeBtnActive]}>
                <Text style={[styles.typeBtnLabel, type === 'ENTREE' && styles.typeBtnLabelActive]}>Entrée</Text>
              </Pressable>
              <Pressable onPress={() => setType('SORTIE')} style={[styles.typeBtn, type === 'SORTIE' && styles.typeBtnActive]}>
                <Text style={[styles.typeBtnLabel, type === 'SORTIE' && styles.typeBtnLabelActive]}>Sortie</Text>
              </Pressable>
            </View>
          </Card>

          <Card padding="lg">
            <Text style={styles.sectionTitle}>Location</Text>
            <Pressable onPress={() => setPickerOpen(true)} style={styles.locBtn}>
              <Text style={selected ? styles.locBtnLabel : styles.locBtnPlaceholder} numberOfLines={1}>
                {selected
                  ? `${selected.locataire_nom ?? 'Locataire'} — ${selected.unite_nom ?? `Unité #${selected.unite_id}`}`
                  : 'Choisir une location en cours…'}
              </Text>
            </Pressable>
          </Card>

          <Card padding="lg">
            <Text style={styles.sectionTitle}>Date de l'EDL</Text>
            <TextField
              label="Date (AAAA-MM-JJ)"
              value={date}
              onChangeText={setDate}
              placeholder="2026-05-30"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Card>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              📋 Les pièces (chambres, salle de bain, cuisine, séjour…) sont auto-générées
              depuis le type d'unité saisi dans le logiciel. Tu pourras les éditer juste après.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>
          ) : null}

          <View style={styles.actions}>
            <View style={{ flex: 1 }}>
              <Button label="Annuler" variant="ghost" onPress={() => nav.goBack()} disabled={createM.isPending} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Créer" onPress={onSubmit} loading={createM.isPending} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Location</Text>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
              <X size={24} color={colors.textDark} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xs }}>
            {locsQ.isLoading ? (
              <Text style={styles.muted}>Chargement…</Text>
            ) : (locsQ.data ?? []).length === 0 ? (
              <Text style={styles.muted}>Aucune location en cours.</Text>
            ) : (
              (locsQ.data ?? []).map((l) => {
                const active = l.id === locationId;
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => { setLocationId(l.id); setPickerOpen(false); Alert.prompt; }}
                    style={[styles.locRow, active && styles.locRowActive]}
                  >
                    <View style={[styles.checkbox, active && styles.checkboxActive]}>
                      {active ? <Check size={14} color={colors.textInverse} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locLabel}>{l.locataire_nom ?? 'Locataire'}</Text>
                      <Text style={styles.muted}>{l.unite_nom ?? `Unité #${l.unite_id}`}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },

  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    borderRadius: radius.lg, backgroundColor: colors.bgSoft,
    borderWidth: 1, borderColor: 'transparent',
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted },
  typeBtnLabelActive: { color: colors.textInverse },

  locBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight,
    backgroundColor: colors.bgCard,
  },
  locBtnLabel: { fontSize: fontSize.sm, color: colors.textDark },
  locBtnPlaceholder: { fontSize: fontSize.sm, color: colors.textMuted },

  infoCard: { backgroundColor: colors.bgSoft, padding: spacing.md, borderRadius: 12 },
  infoText: { fontSize: fontSize.xs, color: colors.textDark, lineHeight: 18 },
  errorCard: { backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: 12 },
  errorText: { fontSize: fontSize.sm, color: colors.danger, fontWeight: fontWeight.semibold },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },

  modalSafe: { flex: 1, backgroundColor: colors.bgApp },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  locRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md,
  },
  locRowActive: { backgroundColor: colors.bgSoft },
  checkbox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  locLabel: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },
  muted: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});
