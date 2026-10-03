import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, Home, Store, Trees, Warehouse, type LucideIcon } from 'lucide-react-native';

import { colors, spacing } from '../theme';

/**
 * Bandeau photo d'une carte de bien, avec surcouche libre (pastille de
 * localisation, statut…).
 *
 * Sans photo, un simple emoji au centre d'un aplat gris laissait un grand vide
 * terne — et beaucoup de biens n'ont pas de photo. Le repli est donc un
 * dégradé vert clair portant l'icône du TYPE de bien : la carte reste
 * habillée, et l'absence de photo devient une information (on voit tout de
 * suite s'il s'agit d'une boutique, d'un bureau ou d'un logement).
 *
 * Factorisé : Mes biens et le Catalogue dessinaient chacun leur version.
 */

/** Icône par type d'unité, sur le vocabulaire du back (APPARTEMENT, VILLA…). */
function iconePourType(type?: string | null): LucideIcon {
  const t = (type || '').toUpperCase();
  if (t.includes('COMMERCIAL') || t.includes('BOUTIQUE')) return Store;
  if (t.includes('BUREAU')) return Building2;
  if (t.includes('DEPOT') || t.includes('ENTREPOT')) return Warehouse;
  if (t.includes('TERRAIN')) return Trees;
  return Home;
}

interface Props {
  uri?: string | null;
  /** Type d'unité — choisit l'icône du repli. */
  type?: string | null;
  /** Pastilles posées en bas du bandeau. */
  overlay?: React.ReactNode;
  /** Rapport largeur/hauteur AVEC photo ; 16/10 par défaut. */
  ratio?: number;
  /**
   * Rapport appliqué SANS photo. Nettement plus plat : le repli n'a qu'une
   * icône à montrer, et à 16/10 il occupait la moitié de la carte pour ne rien
   * dire — sur un catalogue où presque aucune unité n'a de photo, la liste
   * devenait une suite d'aplats vides qu'il fallait faire défiler.
   */
  ratioSansPhoto?: number;
}

export function PhotoBanner({
  uri,
  type,
  overlay,
  ratio = 16 / 10,
  ratioSansPhoto = 16 / 5,
}: Props) {
  const Icone = iconePourType(type);
  return (
    <View style={[styles.media, { aspectRatio: uri ? ratio : ratioSansPhoto }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={['#DCEFED', '#B8E0DC', '#7AD0CA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.image, styles.repli]}
        >
          <Icone size={44} color={colors.primary} strokeWidth={1.6} />
        </LinearGradient>
      )}
      {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  media: { width: '100%', backgroundColor: colors.bgSoft },
  image: { width: '100%', height: '100%' },
  // Icône en haut à DROITE, et non centrée : la pastille de localisation
  // occupe le bas à gauche, et sur le bandeau aplati du repli les deux se
  // chevauchaient.
  repli: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: spacing.md,
  },
  overlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
