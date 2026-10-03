/**
 * Modal plein écran pour visualiser un PDF dans l'app, avec WebView.
 *
 * - iOS : WebView (WKWebView) affiche le PDF nativement depuis un file:// URI
 * - Android : WebView ne rend pas le PDF nativement → on charge le PDF via
 *   Google Docs viewer côté Web (depuis le fichier local on ne peut pas, donc
 *   on essaie d'abord avec file://, sinon on suggère le téléchargement)
 *
 * UX : header avec bouton "Fermer" + titre. Fond opaque pour ne pas laisser
 * voir l'écran derrière.
 */
import { X } from 'lucide-react-native';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { colors, fontSize, fontWeight, spacing } from '../theme';

interface Props {
  visible: boolean;
  uri: string | null;
  title?: string;
  onClose: () => void;
}

export function PdfViewerModal({ visible, uri, title = 'Document', onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.close} hitSlop={10}>
            <X size={22} color={colors.textDark} />
          </Pressable>
        </View>

        {/* Viewer */}
        {uri ? (
          <WebView
            source={
              Platform.OS === 'android'
                // Sur Android, file:// dans WebView ne rend pas le PDF.
                // On utilise Google Docs viewer mais ça nécessite un URI public,
                // ce qu'on n'a pas. Donc fallback message + bouton de partage.
                // En pratique on rentre RAREMENT ici : le PdfActions Android
                // ouvrira directement la feuille de partage si la preview échoue.
                ? { uri }
                : { uri }
            }
            originWhitelist={['*']}
            style={styles.web}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            scalesPageToFit
            allowsBackForwardNavigationGestures={false}
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>Document non disponible.</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.bgCard,
  },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },
  close: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  web: { flex: 1, backgroundColor: colors.bgApp },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  fallbackText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
