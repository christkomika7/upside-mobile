/**
 * Bandeau d'annonces affiché sur l'écran d'accueil locataire entre le hero
 * "Bonjour" et les cartes statistiques.
 *
 * - Chaque annonce a un niveau : IMPORTANT (jaune) ou URGENT (rouge).
 * - Une croix permet de la fermer (mutation /dismiss) — elle ne réapparaît plus.
 * - Durée de vie côté serveur : 30 jours (filtré dans le retour API).
 */
import { AlertCircle, AlertTriangle, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useDismissAnnonce, useLocataireAnnonces } from '../hooks/locataire';
import type { Annonce } from '../types/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

export function AnnouncementsBanner() {
  const annoncesQ = useLocataireAnnonces();
  const dismissMut = useDismissAnnonce();

  if (!annoncesQ.data || annoncesQ.data.length === 0) return null;

  return (
    <View style={styles.container}>
      {annoncesQ.data.map((a) => (
        <AnnonceCard
          key={a.id}
          annonce={a}
          onDismiss={() => dismissMut.mutate(a.id)}
        />
      ))}
    </View>
  );
}

function AnnonceCard({ annonce, onDismiss }: { annonce: Annonce; onDismiss: () => void }) {
  const isUrgent = annonce.niveau === 'URGENT';
  const palette = isUrgent ? URGENT_PALETTE : IMPORTANT_PALETTE;
  const Icon = isUrgent ? AlertTriangle : AlertCircle;

  return (
    <View style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Icon size={18} color={palette.icon} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: palette.label }]}>
          {isUrgent ? 'URGENT' : 'INFORMATION'}
        </Text>
        <Text style={[styles.message, { color: palette.text }]}>
          {annonce.message}
        </Text>
      </View>
      <Pressable onPress={onDismiss} hitSlop={10} style={styles.closeBtn}>
        <X size={16} color={palette.icon} />
      </Pressable>
    </View>
  );
}

const IMPORTANT_PALETTE = {
  bg: '#FEF3C7',       // amber-100
  border: '#FCD34D',   // amber-300
  icon: '#B45309',     // amber-700
  label: '#92400E',    // amber-800
  text: '#78350F',     // amber-900
};

const URGENT_PALETTE = {
  bg: '#FEE2E2',       // red-100
  border: '#FCA5A5',   // red-300
  icon: '#B91C1C',     // red-700
  label: '#991B1B',    // red-800
  text: '#7F1D1D',     // red-900
};

const styles = StyleSheet.create({
  container: {
    // Marge négative pour remonter le bandeau sous le greeting (rapproche le
    // bloc des informations du nom de l'utilisateur).
    marginTop: -16,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
    marginBottom: 2,
  },
  message: {
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  closeBtn: {
    padding: 2,
  },
});
