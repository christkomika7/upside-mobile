/**
 * Création d'une intervention par le technicien, depuis le mobile.
 *
 * Il choisit le logement, décrit le problème, règle priorité + métier (lot),
 * et PREND LES PHOTOS DES DÉGÂTS (appareil photo ou galerie). Les devis se
 * saisissent ensuite depuis le détail de l'intervention.
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { LoadingState } from '../../components/QueryState';
import { TextField } from '../../components/TextField';
import { useCreateCollabIntervention, useLocationsForEdl } from '../../hooks/collaborateur';
import type { CollaborateurStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';

type Nav = NativeStackNavigationProp<CollaborateurStackParamList>;

const PRIORITES = [
  { value: 'BASSE', label: 'Faible' },
  { value: 'NORMALE', label: 'Normale' },
  { value: 'HAUTE', label: 'Haute' },
  { value: 'URGENTE', label: 'Urgente' },
];

const CATEGORIES = ['PLOMBERIE', 'ELECTRICITE', 'MENUISERIE', 'SERRURERIE', 'PEINTURE', 'CLIMATISATION', 'NETTOYAGE', 'AUTRE'];
const MAX_PHOTOS = 6;

export function InterventionCreateScreen() {
  const nav = useNavigation<Nav>();
  const mut = useCreateCollabIntervention();
  const locsQ = useLocationsForEdl();

  const [locationId, setLocationId] = useState<number | null>(null);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [priorite, setPriorite] = useState('NORMALE');
  const [categorie, setCategorie] = useState('PLOMBERIE');
  const [photos, setPhotos] = useState<string[]>([]);

  const locs = locsQ.data ?? [];
  const canSubmit = locationId != null && description.trim().length >= 5 && !mut.isPending;

  const addResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.length) return;
    const a = result.assets[0];
    if (!a) return;
    const mime = a.mimeType ?? 'image/jpeg';
    const dataUrl = a.base64 ? `data:${mime};base64,${a.base64}` : a.uri;
    setPhotos((prev) => [...prev, dataUrl].slice(0, MAX_PHOTOS));
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Activez l'accès à l'appareil photo."); return; }
    addResult(await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true }));
  };
  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Activez l'accès aux photos."); return; }
    addResult(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6, base64: true }));
  };
  const askPhoto = () => Alert.alert('Photo des dégâts', 'Ajouter une photo', [
    { text: 'Prendre une photo', onPress: takePhoto },
    { text: 'Depuis la galerie', onPress: pickPhoto },
    { text: 'Annuler', style: 'cancel' },
  ]);

  const onSubmit = () => {
    if (!canSubmit) return;
    mut.mutate(
      {
        location_id: locationId!,
        titre: titre.trim() || undefined,
        description: description.trim(),
        priorite,
        categorie,
        photos,
      },
      {
        onSuccess: () => {
          Alert.alert('Intervention créée', 'Vous pouvez maintenant ajouter les devis.', [
            { text: 'OK', onPress: () => nav.goBack() },
          ]);
        },
        onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Création impossible.'),
      },
    );
  };

  if (locsQ.isLoading) return <LoadingState label="Chargement des logements…" />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Logement concerné</Text>
        <View style={styles.chips}>
          {locs.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => setLocationId(l.id)}
              style={[styles.chip, locationId === l.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, locationId === l.id && styles.chipTextActive]} numberOfLines={1}>
                {l.unite_nom ?? `Unité #${l.unite_id ?? '—'}`}{l.locataire_nom ? ` · ${l.locataire_nom}` : ''}
              </Text>
            </Pressable>
          ))}
          {locs.length === 0 ? <Text style={styles.muted}>Aucun logement disponible.</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Problème</Text>
        <TextField label="Titre (optionnel)" value={titre} onChangeText={setTitre} placeholder="Ex : Fuite d'eau salle de bain" />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez le problème constaté…"
          multiline
          numberOfLines={4}
          style={{ minHeight: 100, textAlignVertical: 'top' as const }}
        />

        <Text style={styles.sectionTitle}>Métier (lot)</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setCategorie(c)} style={[styles.chip, categorie === c && styles.chipActive]}>
              <Text style={[styles.chipText, categorie === c && styles.chipTextActive]}>{c.charAt(0) + c.slice(1).toLowerCase()}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Priorité</Text>
        <View style={styles.chips}>
          {PRIORITES.map((p) => (
            <Pressable key={p.value} onPress={() => setPriorite(p.value)} style={[styles.chip, priorite === p.value && styles.chipActive]}>
              <Text style={[styles.chipText, priorite === p.value && styles.chipTextActive]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Photos des dégâts ({photos.length})</Text>
        <View style={styles.photoGrid}>
          {photos.map((p, idx) => (
            <View key={idx} style={styles.photoThumb}>
              <Image source={{ uri: p }} style={styles.photoThumbImg} resizeMode="cover" />
              <Pressable style={styles.photoDel} onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))} hitSlop={8}>
                <Trash2 size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <Pressable style={styles.photoAdd} onPress={askPhoto}>
              <Camera size={22} color={colors.primary} />
              <Text style={styles.photoAddLabel}>Ajouter</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Button label="Créer l'intervention" onPress={onSubmit} loading={mut.isPending} disabled={!canSubmit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing['3xl'] },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginTop: spacing.md, marginBottom: spacing.xs },
  muted: { fontSize: fontSize.sm, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.xs, color: colors.textDark, fontWeight: fontWeight.medium, maxWidth: 220 },
  chipTextActive: { color: colors.textInverse },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumb: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bgSoft },
  photoThumbImg: { width: '100%', height: '100%' },
  photoDel: { position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  photoAdd: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoAddLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
});
