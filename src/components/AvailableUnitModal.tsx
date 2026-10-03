/**
 * Modal détail d'un bien disponible : carrousel photos + infos complètes
 * (loyer, charges, caution, surface, chambres, parking, équipements, immeuble).
 *
 * Ouvert depuis le carrousel "Biens disponibles" de l'Accueil.
 */
import { X } from 'lucide-react-native';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { Card } from './Card';
import { resolveAmenity } from '../constants/amenities';
import type { AvailableUnit } from '../types/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';
import { fmtMontant } from '../utils/format';

interface Props {
  unit: AvailableUnit | null;
  onClose: () => void;
}

const SCREEN_W = Dimensions.get('window').width;
const HERO_H = 280;

export function AvailableUnitModal({ unit, onClose }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos = unit?.photos ?? [];
  const allAmenities = unit
    ? [...(unit.amenities ?? []), ...(unit.immeuble?.amenities ?? [])]
    : [];

  const onPhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== photoIndex) setPhotoIndex(i);
  };

  return (
    <Modal
      visible={unit !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {unit?.reference ?? unit?.nom ?? 'Bien'}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {unit?.immeuble?.nom ?? unit?.immeuble?.ville ?? ''}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.close} hitSlop={10}>
            <X size={22} color={colors.textDark} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Carrousel photos */}
          {photos.length > 0 ? (
            <View>
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onPhotoScroll}
                scrollEventThrottle={32}
                keyExtractor={(p) => String(p.id)}
                renderItem={({ item }) => (
                  <Image source={{ uri: item.data }} style={styles.heroImg} resizeMode="cover" />
                )}
              />
              {photos.length > 1 ? (
                <View style={styles.dots}>
                  {photos.map((p, idx) => (
                    <View key={p.id} style={[styles.dot, idx === photoIndex && styles.dotActive]} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroEmoji}>🏠</Text>
            </View>
          )}

          {unit ? (
            <View style={styles.body}>
              {/* Loyer */}
              <Card padding="lg">
                <Text style={styles.loyerLabel}>LOYER MENSUEL</Text>
                <Text style={styles.loyerAmount}>{fmtMontant(unit.loyer + unit.charges)}</Text>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Loyer HT</Text>
                  <Text style={styles.rowValue}>{fmtMontant(unit.loyer)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Charges</Text>
                  <Text style={styles.rowValue}>{fmtMontant(unit.charges)}</Text>
                </View>
                <View style={[styles.row, styles.rowLast]}>
                  <Text style={styles.rowLabel}>Caution</Text>
                  <Text style={styles.rowValue}>{fmtMontant(unit.caution)}</Text>
                </View>
              </Card>

              {/* Caractéristiques */}
              <Card padding="lg">
                <Text style={styles.sectionTitle}>Caractéristiques</Text>
                <View style={styles.specGrid}>
                  <Spec label="Type" value={unit.type ?? '—'} />
                  <Spec label="Surface" value={unit.surface ? `${unit.surface} m²` : '—'} />
                  <Spec label="Chambres" value={unit.nombre_chambres} />
                  <Spec
                    label={unit.nb_parking > 1 ? 'Places de parking' : 'Place de parking'}
                    value={unit.nb_parking}
                  />
                </View>
              </Card>

              {/* Immeuble */}
              {unit.immeuble ? (
                <Card padding="lg">
                  <Text style={styles.sectionTitle}>Immeuble</Text>
                  <Text style={styles.imBig}>{unit.immeuble.nom ?? '—'}</Text>
                  <Text style={styles.imSub}>
                    {[unit.immeuble.adresse, unit.immeuble.quartier, unit.immeuble.ville]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </Card>
              ) : null}

              {/* Aménités */}
              {allAmenities.length > 0 ? (
                <Card padding="lg">
                  <Text style={styles.sectionTitle}>Équipements & services</Text>
                  <View style={styles.amenityGrid}>
                    {allAmenities.map((a, idx) => {
                      const { label, Icon } = resolveAmenity(a);
                      return (
                        <View key={`${a}-${idx}`} style={styles.amenityItem}>
                          <View style={styles.amenityIcon}>
                            <Icon size={18} color={colors.primary} />
                          </View>
                          <Text style={styles.amenityLabel} numberOfLines={2}>{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              ) : null}

              {/* Description */}
              {unit.description ? (
                <Card padding="lg">
                  <Text style={styles.sectionTitle}>À propos</Text>
                  <Text style={styles.body3}>{unit.description}</Text>
                </Card>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Spec({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.spec}>
      <Text style={styles.specValue}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
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
  headerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },
  headerSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  close: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingBottom: spacing['3xl'] },
  heroImg: { width: SCREEN_W, height: HERO_H, backgroundColor: colors.bgSoft },
  heroPlaceholder: {
    width: SCREEN_W, height: HERO_H,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  heroEmoji: { fontSize: 64 },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: colors.textInverse, width: 18 },

  body: { padding: spacing.lg, gap: spacing.lg },

  loyerLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 1 },
  loyerAmount: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.textDark, marginTop: spacing.xs, marginBottom: spacing.md },

  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.md },

  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  spec: {
    flexBasis: '47%',
    backgroundColor: colors.bgSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  specValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },
  specLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  imBig: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  imSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 20 },

  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  amenityItem: {
    flexBasis: '47%',
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  amenityIcon: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  amenityLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.medium },

  body3: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },
});
