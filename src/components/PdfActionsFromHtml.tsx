/**
 * Actions PDF générées localement à partir d'un HTML servi par le backend.
 *
 * Pattern : le backend renvoie le HTML identique au logiciel web ; le mobile
 * imprime ce HTML via `expo-print` (WebKit/Chromium) → PDF visuellement
 * identique à ce que produit le logiciel.
 *
 * - Voir       → modal plein écran in-app (WebView) sur le PDF généré
 * - Imprimer   → expo-print sur le HTML (AirPrint/Android)
 * - Télécharger→ expo-sharing (feuille de partage : Mail, Files, Drive…)
 *
 * Le HTML est récupéré via le client API (passe par l'intercepteur de refresh
 * automatique) — pas de problème de 401 silencieux.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Download, Eye, Printer } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { API_PREFIX, API_URL, refreshAccessToken } from '../api/client';
import { getAccessToken } from '../auth/tokenStorage';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';
import { PdfViewerModal } from './PdfViewerModal';

interface Props {
  /** Chemin relatif à l'API (sans /api/v1), ex: `/mobile/locataire/factures/8/html` */
  apiPath: string;
  /**
   * Chemin PDF côté serveur (WeasyPrint, identique au logiciel web).
   * Ex: `/mobile/proprietaire/factures/8/pdf`. Quand renseigné, l'app télécharge
   * directement le PDF binaire produit par le backend au lieu de convertir le
   * HTML côté client — garantit un rendu 100 % identique au PDF du logiciel.
   */
  pdfApiPath?: string;
  /** Nom de fichier souhaité côté utilisateur, ex: "facture-008.pdf" */
  filename: string;
  /** Titre affiché dans le modal de visualisation. */
  viewerTitle?: string;
}

type Action = 'view' | 'print' | 'download' | null;

export function PdfActionsFromHtml({ apiPath, pdfApiPath, filename, viewerTitle }: Props) {
  const [busy, setBusy] = useState<Action>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const fetchWithAuth = async (path: string): Promise<Response | null> => {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${API_URL}${API_PREFIX}${path}${sep}_ts=${Date.now()}`;
    let token = await getAccessToken();
    if (!token) {
      Alert.alert('Session expirée', 'Reconnectez-vous pour ouvrir le document.');
      return null;
    }
    let res = await fetch(url, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        Alert.alert('Session expirée', 'Reconnectez-vous pour ouvrir le document.');
        return null;
      }
      res = await fetch(url, { cache: 'no-store', headers: { Authorization: `Bearer ${newToken}` } });
    }
    if (!res.ok) {
      throw new Error(`Téléchargement échoué (HTTP ${res.status}).`);
    }
    return res;
  };

  const fetchHtml = async (): Promise<string | null> => {
    const res = await fetchWithAuth(apiPath);
    return res ? await res.text() : null;
  };

  const fetchPdfBlob = async (): Promise<Blob | null> => {
    if (!pdfApiPath) return null;
    const res = await fetchWithAuth(pdfApiPath);
    return res ? await res.blob() : null;
  };

  const generatePdfUri = async (): Promise<string | null> => {
    const html = await fetchHtml();
    if (!html) return null;
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    // Copie vers un nom de fichier lisible (sinon iOS donne un nom aléatoire)
    const target = `${FileSystem.cacheDirectory}${filename}`;
    try {
      await FileSystem.copyAsync({ from: uri, to: target });
      return target;
    } catch {
      return uri;
    }
  };

  // Web : expo-print / expo-sharing retombent tous deux sur window.print(). On
  // implémente 3 comportements distincts via l'API DOM native pour que Voir /
  // Imprimer / Télécharger fassent effectivement 3 choses différentes.
  const isWeb = Platform.OS === 'web';
  // iOS Safari (et iPadOS) bloque l'impression programmatique via un iframe
  // caché : `iframe.contentWindow.print()` ne déclenche AUCUN dialogue. On y
  // ouvre donc le document dans un onglet, d'où l'utilisateur imprime via le
  // menu Partager. Sur desktop, l'iframe reste le chemin le plus direct.
  const isIOSWeb =
    isWeb &&
    typeof navigator !== 'undefined' &&
    (/iP(hone|ad|od)/.test(navigator.userAgent) ||
      (/Safari/.test(navigator.userAgent) &&
        !/Chrome|Chromium|Edg/.test(navigator.userAgent) &&
        (navigator.maxTouchPoints ?? 0) > 1));

  const openHtmlInNewTab = (html: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    // Libère la mémoire après un délai suffisant pour laisser le tab charger.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const printHtmlViaIframe = (html: string): Promise<void> => new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        // Retire l'iframe après un délai — nécessaire pour laisser le
        // dialogue d'impression s'ouvrir avant démontage.
        setTimeout(() => { iframe.remove(); resolve(); }, 1000);
      }
    };
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });

  // Fallback web : convertit le HTML en PDF côté client via html2pdf.js
  // (utilisé uniquement quand aucune route serveur `/pdf` n'est disponible).
  const downloadPdfWebFromHtml = async (html: string) => {
    const mod = await import('html2pdf.js');
    const html2pdf = (mod as any).default ?? mod;
    await html2pdf().set({
      margin: 10,
      filename,
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }).from(html).save();
  };

  // Télécharge un PDF binaire (Blob) déjà rendu côté serveur — 100 % identique
  // au PDF téléchargé depuis le logiciel web.
  const downloadPdfBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const openPdfBlobInNewTab = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const printPdfBlobViaIframe = (blob: Blob): Promise<void> => new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          iframe.remove();
          URL.revokeObjectURL(url);
          resolve();
        }, 1000);
      }
    };
    iframe.src = url;
    document.body.appendChild(iframe);
  });

  // Priorité : si pdfApiPath est fourni, on utilise TOUJOURS le PDF serveur
  // (WeasyPrint), garantissant un rendu identique au logiciel web.
  const onView = async () => {
    setBusy('view');
    try {
      if (pdfApiPath) {
        const blob = await fetchPdfBlob();
        if (!blob) return;
        if (isWeb) { openPdfBlobInNewTab(blob); return; }
        // Natif : sauvegarde le blob en fichier puis ouvre le viewer.
        const target = `${FileSystem.cacheDirectory}${filename}`;
        const b64 = await blobToBase64(blob);
        await FileSystem.writeAsStringAsync(target, b64, { encoding: FileSystem.EncodingType.Base64 });
        setViewerUri(target);
        return;
      }
      if (isWeb) {
        const html = await fetchHtml();
        if (html) openHtmlInNewTab(html);
        return;
      }
      const uri = await generatePdfUri();
      if (uri) setViewerUri(uri);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d\'ouvrir le document.');
    } finally {
      setBusy(null);
    }
  };

  const onPrint = async () => {
    setBusy('print');
    try {
      if (pdfApiPath) {
        const blob = await fetchPdfBlob();
        if (!blob) return;
        if (isWeb) {
          // iOS Safari : l'iframe caché n'imprime pas → on ouvre le PDF dans un
          // onglet, l'utilisateur imprime via Partager. Desktop : iframe direct.
          if (isIOSWeb) openPdfBlobInNewTab(blob);
          else await printPdfBlobViaIframe(blob);
          return;
        }
        // Natif : on récupère plutôt le HTML pour utiliser expo-print, qui gère
        // le dialogue système d'impression proprement (AirPrint / Android print).
        const html = await fetchHtml();
        if (html) await Print.printAsync({ html });
        return;
      }
      const html = await fetchHtml();
      if (!html) return;
      if (isWeb) {
        if (isIOSWeb) openHtmlInNewTab(html);
        else await printHtmlViaIframe(html);
        return;
      }
      await Print.printAsync({ html });
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d\'imprimer.');
    } finally {
      setBusy(null);
    }
  };

  const onDownload = async () => {
    setBusy('download');
    try {
      if (pdfApiPath) {
        const blob = await fetchPdfBlob();
        if (!blob) return;
        if (isWeb) { downloadPdfBlob(blob); return; }
        const target = `${FileSystem.cacheDirectory}${filename}`;
        const b64 = await blobToBase64(blob);
        await FileSystem.writeAsStringAsync(target, b64, { encoding: FileSystem.EncodingType.Base64 });
        const available = await Sharing.isAvailableAsync();
        if (!available) { Alert.alert('Téléchargé', `Le fichier est enregistré : ${target}`); return; }
        await Sharing.shareAsync(target, {
          mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: filename,
        });
        return;
      }
      if (isWeb) {
        const html = await fetchHtml();
        if (html) await downloadPdfWebFromHtml(html);
        return;
      }
      const uri = await generatePdfUri();
      if (!uri) return;
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Téléchargé', `Le fichier est enregistré : ${uri}`);
        return;
      }
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

  // Blob → base64 (utilisé pour écrire un PDF binaire dans FileSystem sur natif).
  const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      const comma = dataUrl.indexOf(',');
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.readAsDataURL(blob);
  });

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
