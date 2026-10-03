/**
 * Carrousel horizontal des biens disponibles à la location.
 *
 * Affiché en bas de l'accueil locataire. Défile de droite à gauche.
 * Tap sur une carte → ouvre `AvailableUnitModal` avec photos + infos.
 */
import { MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AvailableUnitModal } from './AvailableUnitModal';
import { useAvailableUnits } from '../hooks/locataire';
import type { AvailableUnit } from '../types/api';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../theme';
import { fmtMontant } from '../utils/format';

const CARD_W = 220;
const CARD_H = 240;
const IMG_H = 130;

export function AvailableUnitsCarousel() {
  const { data, isLoading } = useAvailableUnits();
  const [selected, setSelected] = useState<AvailableUnit | null>(null);

  if (isLoading || !data || data.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Biens disponibles</Text>
        <Text style={styles.count}>{data.length}</Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={styles.list}
        snapToInterval={CARD_W + spacing.md}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelected(item)} style={styles.cardWrap}>
            <View style={styles.card}>
              {item.photos.length > 0 && item.photos[0] ? (
                <Image
                  source={{ uri: item.photos[0].data }}
                  style={styles.img}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.img, styles.imgPlaceholder]}>
                  <Text style={styles.imgEmoji}>🏠</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.reference ?? item.nom}
                </Text>
                <View style={styles.locRow}>
                  <MapPin size={11} color={colors.textMuted} />
                  <Text style={styles.locText} numberOfLines={1}>
                    {item.immeuble?.nom
                      ? `${item.immeuble.nom}${item.immeuble.ville ? ` · ${item.immeuble.ville}` : ''}`
                      : item.immeuble?.ville ?? '—'}
                  </Text>
                </View>
                <Text style={styles.price}>
                  {fmtMontant(item.loyer + item.charges)}
                  <Text style={styles.priceUnit}> / mois</Text>
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <AvailableUnitModal unit={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark, flex: 1 },
  count: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    backgroundColor: colors.bgSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },

  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingVertical: spacing.xs },
  cardWrap: { width: CARD_W },
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  img: { width: CARD_W, height: IMG_H, backgroundColor: colors.bgSoft },
  imgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imgEmoji: { fontSize: 40 },
  info: { padding: spacing.md, gap: 4, flex: 1, justifyContent: 'space-between' },
  cardTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  price: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.primary },
  priceUnit: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
});
