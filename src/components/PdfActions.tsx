/**
 * Actions communes à tous les documents PDF du locataire (facture, EDL, bail).
 *
 * - Voir       → modal plein écran in-app (WebView), bouton "Fermer" pour sortir
 * - Imprimer   → expo-print (panneau d'impression système, AirPrint/Android)
 * - Télécharger→ expo-sharing (feuille de partage : Mail, Files, Drive, etc.)
 *
 * Le PDF est toujours téléchargé d'abord en cache local (avec le token
 * d'authentification mobile), puis utilisé via son URI local.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Download, Eye, Printer } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { API_PREFIX, API_URL, refreshAccessToken } from '../api/client';
import { getAccessToken } from '../auth/tokenStorage';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';
import { PdfViewerModal } from './PdfViewerModal';

interface Props {
  /** Chemin relatif à l'API (sans /api/v1), ex: `/mobile/locataire/factures/8/pdf` */
  apiPath: string;
  /** Nom de fichier souhaité côté utilisateur, ex: "facture-008.pdf" */
  filename: string;
  /** Titre affiché dans le modal de visualisation. */
  viewerTitle?: string;
}

type Action = 'view' | 'print' | 'download' | null;

export function PdfActions({ apiPath, filename, viewerTitle }: Props) {
  const [busy, setBusy] = useState<Action>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const download = async (): Promise<string | null> => {
    const target = `${FileSystem.cacheDirectory}${filename}`;
    const url = `${API_URL}${API_PREFIX}${apiPath}`;

    // FileSystem.downloadAsync bypasse l'intercepteur axios → on doit gérer
    // manuellement le refresh sur 401 (sinon, après expiration du token, l'user
    // doit redémarrer l'app pour ouvrir un PDF).
    const attempt = async (tok: string) =>
      FileSystem.downloadAsync(url, target, { headers: { Authorization: `Bearer ${tok}` } });

    let token = await getAccessToken();
    if (!token) {
      Alert.alert('Session expirée', 'Reconnectez-vous pour télécharger le document.');
      return null;
    }
    let res = await attempt(token);

    if (res.status === 401) {
      // Tentative de refresh, puis nouvel essai.
      const newToken = await refreshAccessToken();
      if (!newToken) {
        Alert.alert('Session expirée', 'Reconnectez-vous pour télécharger le document.');
        return null;
      }
      res = await attempt(newToken);
    }

    if (res.status !== 200) {
      throw new Error(`Téléchargement échoué (HTTP ${res.status}).`);
    }
    return res.uri;
  };

  const onView = async () => {
    setBusy('view');
    try {
      const uri = await download();
      if (!uri) return;
      // Ouvre le modal in-app — l'utilisateur le ferme avec le bouton ✕
      setViewerUri(uri);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d\'ouvrir le document.');
    } finally {
      setBusy(null);
    }
  };

  const onPrint = async () => {
    setBusy('print');
    try {
      const uri = await download();
      if (!uri) return;
      await Print.printAsync({ uri });
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d\'imprimer.');
    } finally {
      setBusy(null);
    }
  };

  const onDownload = async () => {
    setBusy('download');
    try {
      const uri = await download();
      if (!uri) return;
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Téléchargé', `Le fichier est enregistré sur l'appareil : ${uri}`);
        return;
      }
      // Feuille de partage iOS/Android : Enregistrer, Mail, Drive, AirDrop…
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: filename,
      });
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de télécharger.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <View style={styles.row}>
        <ActionButton
          icon={<Eye size={18} color={colors.primary} />}
          label="Voir"
          onPress={onView}
          loading={busy === 'view'}
          disabled={busy !== null && busy !== 'view'}
        />
        <ActionButton
          icon={<Printer size={18} color={colors.primary} />}
          label="Imprimer"
          onPress={onPrint}
          loading={busy === 'print'}
          disabled={busy !== null && busy !== 'print'}
        />
        <ActionButton
          icon={<Download size={18} color={colors.primary} />}
          label="Télécharger"
          onPress={onDownload}
          loading={busy === 'download'}
          disabled={busy !== null && busy !== 'download'}
        />
      </View>

      <PdfViewerModal
        visible={viewerUri !== null}
        uri={viewerUri}
        title={viewerTitle ?? filename}
        onClose={() => setViewerUri(null)}
      />
    </>
  );
}

function ActionButton({
  icon, label, onPress, loading, disabled,
}: { icon: React.ReactNode; label: string; onPress: () => void; loading: boolean; disabled: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <>
          {icon}
          <Text style={styles.btnLabel}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.lg,
  },
  btnLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
});
