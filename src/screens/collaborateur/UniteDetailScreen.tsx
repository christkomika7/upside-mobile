/**
 * Détail d'une unité disponible — vu par un commercial pendant une visite.
 * Carrousel photos + caractéristiques + amenities avec icônes (immeuble + unité).
 */
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Card } from '../../components/Card';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { resolveAmenity } from '../../constants/amenities';
import { useCatalogueUnite, useCatalogueUnitePhotos } from '../../hooks/collaborateur';
import type { CollaborateurStackParamList } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Home } from 'lucide-react-native';
import { BrandGradient } from '../../components/BrandGradient';
import { colors, fontSize, fontWeight, radius, spacing, titreEcran, sousTitre } from '../../theme';
import { fmtMontant } from '../../utils/format';

type Rt = RouteProp<CollaborateurStackParamList, 'UniteDetail'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = 240;

function formatType(t?: string | null): string {
  if (!t) return '—';
  return t
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

function formatEtage(e?: string | null): string {
  if (!e) return '';
  const t = e.trim();
  if (!t) return '';
  const norm = t.toUpperCase().replace(/[\s.]/g, '');
  if (norm === 'RDC' || norm === 'REZDECHAUSSEE') return 'Rez-de-chaussée';
  // "1", "2", "3" → "1er étage", "2e étage"…
  if (/^\d+$/.test(t)) {
    const n = parseInt(t, 10);
    return n === 1 ? '1er étage' : `${n}e étage`;
  }
  return t;
}

export function UniteDetailScreen() {
  const { params } = useRoute<Rt>();
  const detailQ = useCatalogueUnite(params.uniteId);
  const photosQ = useCatalogueUnitePhotos(params.uniteId);
  const [photoIndex, setPhotoIndex] = useState(0);

  if (detailQ.isLoading) return <LoadingState label="Chargement…" />;
  if (detailQ.isError) return <ErrorState error={detailQ.error} onRetry={detailQ.refetch} />;
  if (!detailQ.data) return null;

  const data = detailQ.data;
  const photos = photosQ.data ?? [];
  const totalMensuel = (data.loyer ?? 0) + (data.charges ?? 0);
  const allAmenities = [
    ...(data.commodites ?? []),
    ...((data.immeuble?.amenities ?? []) as string[]),
  ];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (i !== photoIndex) setPhotoIndex(i);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      style={{ backgroundColor: colors.bgApp }}
      refreshControl={
        <RefreshControl
          refreshing={detailQ.isFetching || photosQ.isFetching}
          onRefresh={() => { detailQ.refetch(); photosQ.refetch(); }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Carrousel photos OU hero placeholder */}
      {photos.length > 0 ? (
        <View>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
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
        <LinearGradient
          colors={['#DCEFED', '#B8E0DC', '#7AD0CA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroPlaceholder}
        >
          <Home size={64} color={colors.primary} strokeWidth={1.4} />
        </LinearGradient>
      )}

      <View style={styles.section}>
        <Text style={styles.title}>{data.reference}</Text>
        <Text style={styles.subtitle}>
          {[
            formatType(data.type),
            data.surface ? `${data.surface} m²` : '',
            formatEtage(data.etage),
          ].filter(Boolean).join(' · ')}
        </Text>
      </View>

      <View style={styles.body}>
        <Card padding="lg" style={styles.priceCard}>
          <BrandGradient />
          <Text style={styles.priceLabel}>LOYER MENSUEL TOTAL</Text>
          <Text style={styles.priceAmount}>{fmtMontant(totalMensuel)}</Text>
          <View style={styles.priceSplit}>
            <Row label="Loyer HT" value={fmtMontant(data.loyer)} inverse />
            <Row label="Charges" value={fmtMontant(data.charges)} inverse />
            {data.charges_exceptionnelles > 0 ? (
              <Row label="Charges exceptionnelles" value={fmtMontant(data.charges_exceptionnelles)} inverse />
            ) : null}
            <Row label="Caution" value={fmtMontant(data.caution)} inverse last />
          </View>
        </Card>

        <Card padding="lg">
          <Text style={styles.sectionTitle}>Caractéristiques</Text>
          <View style={styles.grid}>
            <Spec label="Chambres" value={String(data.nombre_chambres ?? '—')} />
            <Spec label="Salles de bain" value={String(data.nombre_sdb ?? '—')} />
            <Spec
              label={data.nb_parking > 1 ? 'Places de parking' : 'Place de parking'}
              value={String(data.nb_parking ?? 0)}
            />
            <Spec label="Surface" value={data.surface ? `${data.surface} m²` : '—'} />
          </View>
        </Card>

        {data.immeuble ? (
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Immeuble</Text>
            <Text style={styles.bigText}>{data.immeuble.nom ?? '—'}</Text>
            <Text style={styles.mutedText}>
              {[data.immeuble.adresse, data.immeuble.quartier, data.immeuble.ville].filter(Boolean).join(' · ') || '—'}
            </Text>
          </Card>
        ) : null}

        {allAmenities.length > 0 ? (
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Équipements & services</Text>
            <View style={styles.amenityGrid}>
              {allAmenities.map((a, idx) => {
                const { label, Icon } = resolveAmenity(a);
                return (
                  <View key={`${a}-${idx}`} style={styles.amenityItem}>
                    <View style={styles.amenityIconWrap}>
                      <Icon size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.amenityLabel} numberOfLines={2}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        ) : null}

        {data.description ? (
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.bodyText}>{data.description}</Text>
          </Card>
        ) : null}

        {data.date_disponibilite ? (
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Disponibilité</Text>
            <Text style={styles.bodyText}>Disponible à partir du {data.date_disponibilite}.</Text>
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.spec}>
      <Text style={styles.specValue}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

function Row({ label, value, inverse, last }: { label: string; value: string; inverse?: boolean; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={[styles.rowLabel, inverse && { color: 'rgba(255,255,255,0.85)' }]}>{label}</Text>
      <Text style={[styles.rowValue, inverse && { color: colors.textInverse }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing['3xl'] },
  heroImg: { width: SCREEN_WIDTH, height: HERO_HEIGHT, backgroundColor: colors.bgSoft },
  heroPlaceholder: {
    width: SCREEN_WIDTH, height: HERO_HEIGHT,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  dots: {
    position: 'absolute', bottom: spacing.md, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: colors.textInverse, width: 18 },

  section: { padding: spacing.lg },
  // Titre pris a la source commune (theme/typographie) : cet ecran
  // dessinait le sien, sur une taille qui n'existait nulle part ailleurs.
  title: titreEcran,
  subtitle: sousTitre,

  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.lg },

  priceCard: { borderColor: 'transparent', overflow: 'hidden' },
  priceLabel: { fontSize: fontSize.xs, color: colors.textInverse, opacity: 0.85, fontWeight: fontWeight.bold, letterSpacing: 1 },
  priceAmount: { fontSize: fontSize['3xl'], color: colors.textInverse, fontWeight: fontWeight.bold, marginTop: spacing.xs, marginBottom: spacing.md },
  priceSplit: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: spacing.md },

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.md },
  bigText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  mutedText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 20 },
  bodyText: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  spec: {
    flexBasis: '47%',
    backgroundColor: colors.bgSoft,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  specValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  specLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  amenityItem: {
    flexBasis: '47%',
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  amenityIconWrap: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  amenityLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.medium },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },
});
