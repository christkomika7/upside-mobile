/**
 * Bouton « Voir le devis » + visionneuse du fichier joint (photo/scan/PDF).
 *
 * Récupère le fichier à la demande via `/mobile/proprietaire/devis/{id}/fichier`
 * (base64), puis :
 *  • image → aperçu plein écran (Image, web + natif) ;
 *  • PDF/autre → nouvel onglet sur le web, WebView (PdfViewerModal) sur natif.
 *
 * Mutualisé entre l'écran de décision et le comparatif par lot.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { Eye, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../api/client';
import type { DevisFichier } from '../types/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';
import { PdfViewerModal } from './PdfViewerModal';

interface Props {
  devisId: number;
  fichierNom?: string | null;
  /** Libellé compact (dans une liste) plutôt que pleine largeur. */
  compact?: boolean;
}

export function DevisFileButton({ devisId, fichierNom, compact }: Props) {
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onView = async () => {
    setBusy(true);
    try {
      const f = await api.get<DevisFichier>(`/mobile/proprietaire/devis/${devisId}/fichier`);
      const mime = f.mime || 'application/octet-stream';
      if (mime.startsWith('image/')) {
        setImgUri(`data:${mime};base64,${f.data}`);
      } else if (Platform.OS === 'web') {
        const bin = atob(f.data);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([arr], { type: mime }));
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        const ext = mime.includes('pdf') ? 'pdf' : (fichierNom?.split('.').pop() || 'bin');
        const target = `${FileSystem.cacheDirectory}devis-${devisId}.${ext}`;
        await FileSystem.writeAsStringAsync(target, f.data, { encoding: FileSystem.EncodingType.Base64 });
        setPdfUri(target);
      }
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : "Impossible d'ouvrir le fichier du devis.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={onView}
        disabled={busy}
        style={({ pressed }) => [compact ? styles.btnCompact : styles.btn, pressed && { opacity: 0.85 }]}
      >
        {busy ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <>
            <Eye size={compact ? 15 : 18} color={colors.primary} />
            <Text style={compact ? styles.labelCompact : styles.label} numberOfLines={1}>
              {compact ? 'Voir' : `Voir le devis${fichierNom ? ` · ${fichierNom}` : ''}`}
            </Text>
          </>
        )}
      </Pressable>

      <Modal visible={imgUri !== null} transparent animationType="fade" onRequestClose={() => setImgUri(null)}>
        <View style={styles.imgBackdrop}>
          <Pressable style={styles.imgClose} onPress={() => setImgUri(null)} hitSlop={12}>
            <X size={24} color="#fff" />
          </Pressable>
          {imgUri ? <Image source={{ uri: imgUri }} style={styles.imgFull} resizeMode="contain" /> : null}
        </View>
      </Modal>

      <PdfViewerModal
        visible={pdfUri !== null}
        uri={pdfUri}
        title={fichierNom ?? 'Devis'}
        onClose={() => setPdfUri(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.lg,
  },
  label: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold, flexShrink: 1 },
  btnCompact: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill,
  },
  labelCompact: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  imgBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  imgFull: { width: '100%', height: '85%' },
  imgClose: {
    position: 'absolute', top: 44, right: 20, zIndex: 2,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
});
