/**
 * Helpers pour récupérer un PDF déjà rendu côté serveur (WeasyPrint) et
 * exécuter les 3 actions attendues sur les 2 plateformes :
 *   - Voir       : ouvre le PDF (nouvel onglet web / viewer natif)
 *   - Imprimer   : dialogue d'impression système
 *   - Télécharger: partage natif (iOS/Android) OU téléchargement navigateur
 *
 * Ces helpers garantissent que le PDF affiché/imprimé/téléchargé est **exactement
 * celui produit par le backend** — même moteur que le logiciel web, donc rendu
 * strictement identique.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

import { API_PREFIX, API_URL, refreshAccessToken } from '../api/client';
import { getAccessToken } from '../auth/tokenStorage';

async function fetchWithAuth(path: string): Promise<Response | null> {
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
  if (!res.ok) throw new Error(`Téléchargement échoué (HTTP ${res.status}).`);
  return res;
}

async function fetchPdfBlob(pdfApiPath: string): Promise<Blob | null> {
  const res = await fetchWithAuth(pdfApiPath);
  return res ? await res.blob() : null;
}

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

/** Écrit le blob PDF dans le cache local et renvoie l'URI file:// utilisable. */
async function saveBlobToCache(blob: Blob, filename: string): Promise<string> {
  const target = `${FileSystem.cacheDirectory}${filename}`;
  const b64 = await blobToBase64(blob);
  await FileSystem.writeAsStringAsync(target, b64, { encoding: FileSystem.EncodingType.Base64 });
  return target;
}

/**
 * Action « Voir » : télécharge le PDF puis l'affiche.
 * - Web : ouvre le blob dans un nouvel onglet du navigateur.
 * - Natif : sauvegarde en cache et renvoie l'URI (à donner au PdfViewerModal).
 * Retourne l'URI natif ou null sur web.
 */
export async function viewBackendPdf(pdfApiPath: string, filename: string): Promise<string | null> {
  const blob = await fetchPdfBlob(pdfApiPath);
  if (!blob) return null;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return null;
  }
  return await saveBlobToCache(blob, filename);
}

/**
 * Action « Imprimer » : ouvre le dialogue d'impression système sur le PDF backend.
 * - Web : injecte le blob dans un iframe et déclenche print().
 * - Natif : télécharge le PDF puis appelle `expo-print.printAsync({ uri })`
 *   (AirPrint sur iOS, dialogue système sur Android).
 */
export async function printBackendPdf(pdfApiPath: string, filename: string): Promise<void> {
  const blob = await fetchPdfBlob(pdfApiPath);
  if (!blob) return;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(blob);
    await new Promise<void>((resolve) => {
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
    return;
  }
  const uri = await saveBlobToCache(blob, filename);
  await Print.printAsync({ uri });
}

/**
 * Action « Télécharger » : donne le fichier PDF à l'utilisateur.
 * - Web : anchor `<a download>` sur le blob → sauvegarde navigateur.
 * - Natif : sauvegarde + feuille de partage système
 *   (iOS UIActivityViewController / Android SEND intent → Files, Drive, Mail…).
 */
export async function downloadBackendPdf(pdfApiPath: string, filename: string, dialogTitle?: string): Promise<void> {
  const blob = await fetchPdfBlob(pdfApiPath);
  if (!blob) return;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const uri = await saveBlobToCache(blob, filename);
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    Alert.alert('Téléchargé', `Le fichier est enregistré : ${uri}`);
    return;
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: dialogTitle ?? filename,
  });
}
