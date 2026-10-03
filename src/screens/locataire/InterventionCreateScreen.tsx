import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useCreateIntervention, useLocataireBails } from '../../hooks/locataire';
import type { InterventionCreatePayload, InterventionPortee, InterventionPriorite } from '../../types/api';
import type { LocataireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';

type Nav = NativeStackNavigationProp<LocataireStackParamList>;

const PRIORITES: { value: InterventionPriorite; label: string; color: string }[] = [
  { value: 'BASSE', label: 'Faible', color: colors.info },
  { value: 'NORMALE', label: 'Normale', color: colors.success },
  { value: 'HAUTE', label: 'Haute', color: colors.warning },
  { value: 'URGENTE', label: 'Urgente', color: colors.danger },
];

const CATEGORIES = [
  'PLOMBERIE',
  'ELECTRICITE',
  'MENUISERIE',
  'SERRURERIE',
  'PEINTURE',
  'CLIMATISATION',
  'NETTOYAGE',
  'AUTRE',
];

const MAX_PHOTOS = 5;

export function InterventionCreateScreen() {
  const nav = useNavigation<Nav>();
  const mut = useCreateIntervention();
  const bailsQ = useLocataireBails();
  const actuels = bailsQ.data?.actuels ?? (bailsQ.data?.actuel ? [bailsQ.data.actuel] : []);

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState<InterventionPriorite>('NORMALE');
  const [categorie, setCategorie] = useState<string>('PLOMBERIE');
  const [contactTel, setContactTel] = useState('');
  const [dispoJours, setDispoJours] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [portee, setPortee] = useState<InterventionPortee>('LOGEMENT');

  // Présélection : si un seul bail actif, on le choisit automatiquement.
  if (locationId === null && actuels.length === 1) {
    setLocationId(actuels[0].id);
  }

  // Pour valider : on exige une location_id si plusieurs baux actifs.
  const needsLocationChoice = actuels.length > 1 && locationId === null;
  const canSubmit = description.trim().length >= 5 && !mut.isPending && !needsLocationChoice;

  const askMediaSource = () => {
    Alert.alert(
      'Ajouter une photo',
      'Comment souhaitez-vous l\'ajouter ?',
      [
        { text: 'Prendre une photo', onPress: takePhoto },
        { text: 'Choisir depuis la galerie', onPress: pickPhoto },
        { text: 'Annuler', style: 'cancel' },
      ],
    );
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Activez l\'accès à l\'appareil photo dans les Réglages.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    addResult(result);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Activez l\'accès aux photos dans les Réglages.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    addResult(result);
  };

  const addResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const a = result.assets[0];
    if (!a) return;
    const mime = a.mimeType ?? 'image/jpeg';
    const dataUrl = a.base64 ? `data:${mime};base64,${a.base64}` : a.uri;
    setPhotos((prev) => [...prev, dataUrl].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = () => {
    if (!canSubmit) return;
    const payload: InterventionCreatePayload = {
      titre: titre.trim() || undefined,
      description: description.trim(),
      priorite,
      categorie,
      contact_tel: contactTel.trim() || undefined,
      dispo_jours: dispoJours.trim() || undefined,
      photos: photos.length > 0 ? photos : undefined,
      location_id: locationId ?? undefined,
      portee,
    };
    mut.mutate(payload, {
      onSuccess: (result) => {
        nav.replace('InterventionDetail', { interventionId: result.id });
      },
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.safe}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Décrivez votre problème — votre agence sera notifiée immédiatement et vous tiendra
          au courant en temps réel.
        </Text>

        {/* Sélecteur de bail / unité — affiché si plusieurs baux actifs */}
        {actuels.length > 1 ? (
          <View>
            <Text style={styles.label}>Logement concerné *</Text>
            <View style={styles.chips}>
              {actuels.map((b) => {
                const selected = b.id === locationId;
                const label = b.unite_nom ?? b.reference ?? `Bail #${b.id}`;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => setLocationId(b.id)}
                    style={[styles.chip, selected && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {needsLocationChoice ? (
              <Text style={styles.helperWarn}>Choisissez l'unité concernée par cette demande.</Text>
            ) : null}
          </View>
        ) : null}

        {/* Portée : dans le logement ou parties communes */}
        <View>
          <Text style={styles.label}>Où se situe le problème ?</Text>
          <View style={styles.porteeRow}>
            <Pressable
              onPress={() => setPortee('LOGEMENT')}
              style={[styles.porteeBtn, portee === 'LOGEMENT' && styles.porteeBtnActive]}
            >
              <Text style={[styles.porteeLabel, portee === 'LOGEMENT' && styles.porteeLabelActive]}>
                Dans mon logement / bureau
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setPortee('PARTIES_COMMUNES')}
              style={[styles.porteeBtn, portee === 'PARTIES_COMMUNES' && styles.porteeBtnActive]}
            >
              <Text style={[styles.porteeLabel, portee === 'PARTIES_COMMUNES' && styles.porteeLabelActive]}>
                Parties communes de l'immeuble
              </Text>
            </Pressable>
          </View>
        </View>

        <TextField
          label="Titre (optionnel)"
          value={titre}
          onChangeText={setTitre}
          placeholder="Ex. Fuite robinet cuisine"
        />

        <TextField
          label="Description *"
          value={description}
          onChangeText={setDescription}
          placeholder="Que se passe-t-il ? Depuis quand ? Détails utiles…"
          multiline
          numberOfLines={5}
          style={{ minHeight: 120, textAlignVertical: 'top' as const }}
        />

        <View>
          <Text style={styles.label}>Catégorie</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategorie(c)}
                style={[styles.chip, categorie === c && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, categorie === c && styles.chipLabelActive]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.label}>Urgence</Text>
          <View style={styles.priorities}>
            {PRIORITES.map((p) => (
              <Pressable
                key={p.value}
                onPress={() => setPriorite(p.value)}
                style={[
                  styles.prio,
                  priorite === p.value && { backgroundColor: p.color, borderColor: p.color },
                ]}
              >
                <Text style={[
                  styles.prioLabel,
                  priorite === p.value && { color: colors.textInverse },
                ]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TextField
          label="Téléphone de contact (optionnel)"
          value={contactTel}
          onChangeText={setContactTel}
          placeholder="+241 …"
          keyboardType="phone-pad"
        />

        <TextField
          label="Disponibilités (optionnel)"
          value={dispoJours}
          onChangeText={setDispoJours}
          placeholder="Ex. Lundi/Mercredi 9h-12h"
        />

        {/* Photos */}
        <View>
          <Text style={styles.label}>Photos ({photos.length}/{MAX_PHOTOS})</Text>
          <View style={styles.photoGrid}>
            {photos.map((p, i) => (
              <View key={i} style={styles.photoCell}>
                <Image source={{ uri: p }} style={styles.photo} />
                <Pressable onPress={() => removePhoto(i)} style={styles.removeBtn}>
                  <Trash2 size={14} color={colors.textInverse} />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <Pressable onPress={askMediaSource} style={styles.addCell}>
                <Camera size={28} color={colors.primary} />
                <Text style={styles.addCellLabel}>Photo</Text>
              </Pressable>
            ) : null}
          </View>
          {photos.length === 0 ? (
            <View style={styles.actionsRow}>
              <Pressable onPress={takePhoto} style={styles.iconBtn}>
                <Camera size={18} color={colors.primary} />
                <Text style={styles.iconBtnLabel}>Appareil photo</Text>
              </Pressable>
              <Pressable onPress={pickPhoto} style={styles.iconBtn}>
                <ImageIcon size={18} color={colors.primary} />
                <Text style={styles.iconBtnLabel}>Galerie</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {mut.isError ? (
          <Text style={styles.error}>{(mut.error as Error)?.message ?? 'Une erreur est survenue.'}</Text>
        ) : null}

        <Button
          label="Envoyer ma demande"
          onPress={onSubmit}
          disabled={!canSubmit}
          loading={mut.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  intro: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    backgroundColor: colors.bgSoft,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  chipLabelActive: { color: colors.textInverse },

  helperWarn: { fontSize: fontSize.xs, color: colors.danger, marginTop: spacing.xs, fontWeight: fontWeight.semibold },

  porteeRow: { flexDirection: 'row', gap: spacing.sm },
  porteeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  porteeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  porteeLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, textAlign: 'center' },
  porteeLabelActive: { color: colors.textInverse },

  priorities: { flexDirection: 'row', gap: spacing.sm },
  prio: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  prioLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted },

  error: {
    fontSize: fontSize.sm,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    textAlign: 'center',
  },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoCell: { width: 92, height: 92, borderRadius: radius.md, overflow: 'hidden' },
  photo: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.bgSoft },
  removeBtn: {
    position: 'absolute',
    top: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  addCell: {
    width: 92, height: 92, borderRadius: radius.md,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
    gap: 4,
  },
  addCellLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  actionsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  iconBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.lg,
  },
  iconBtnLabel: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
});
