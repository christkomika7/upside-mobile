/**
 * Hook unifié pour permettre à un user mobile d'uploader sa photo de profil.
 *
 * Côté backend : PUT /api/v1/mobile/auth/avatar avec { avatar: "data:image/..."}
 * Le User.avatar est ensuite renvoyé dans /me et utilisable partout.
 */
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert } from 'react-native';

import { api } from '../api/client';
import { useAuth } from '../auth/store';
import type { MobileUser } from '../types/api';

export function useAvatarUpload() {
  const refreshMe = useAuth((s) => s.refreshMe);
  const [busy, setBusy] = useState(false);

  const mut = useMutation({
    mutationFn: (dataUrl: string | null) =>
      api.put<MobileUser>('/mobile/auth/avatar', { avatar: dataUrl }),
    onSuccess: () => {
      // Force le re-fetch du /me pour propager le nouvel avatar dans toute l'app
      refreshMe();
    },
  });

  const askMediaSource = () =>
    Alert.alert(
      'Photo de profil',
      'Comment voulez-vous l\'ajouter ?',
      [
        { text: 'Prendre une photo', onPress: takePhoto },
        { text: 'Choisir depuis la galerie', onPress: pickPhoto },
        { text: 'Annuler', style: 'cancel' },
      ],
    );

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à l\'appareil photo dans les Réglages.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    await submit(result);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la galerie dans les Réglages.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    await submit(result);
  };

  const submit = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets || !result.assets[0]) return;
    const a = result.assets[0];
    if (!a.base64) return;
    const mime = a.mimeType ?? 'image/jpeg';
    const dataUrl = `data:${mime};base64,${a.base64}`;
    setBusy(true);
    try {
      await mut.mutateAsync(dataUrl);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d\'enregistrer la photo.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await mut.mutateAsync(null);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de retirer la photo.');
    } finally {
      setBusy(false);
    }
  };

  return { open: askMediaSource, remove, busy };
}
