import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClipboardCheck, ChevronRight, Home } from 'lucide-react-native';
import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Card } from '../../components/Card';
import { resolveAmenity } from '../../constants/amenities';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { useLocataireBien, useLocataireBienPhotos } from '../../hooks/locataire';
import type { LocataireStackParamList } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassBadge } from '../../components/DataUI';
import { colors, fontSize, fontWeight, radius, spacing, titreEcran, sousTitre } from '../../theme';

type Nav = NativeStackNavigationProp<LocataireStackParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = 240;

export function BienScreen() {
  const nav = useNavigation<Nav>();
  const { data, isLoading, isError, error, refetch, isFetching } = useLocataireBien();
  const photosQ = useLocataireBienPhotos();
  const [photoIndex, setPhotoIndex] = useState(0);

  if (isLoading) return <LoadingState label="Chargement du logement…" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const photos = photosQ.data ?? [];
  const allAmenities = [...(data.amenities ?? []), ...(data.immeuble?.amenities ?? [])];

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
          refreshing={isFetching || photosQ.isFetching}
          onRefresh={() => { refetch(); photosQ.refetch(); }}
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
          {data.immeuble?.nom ? (
            <View style={styles.heroBadge}>
              <GlassBadge>
                {[data.immeuble.nom, data.immeuble.quartier].filter(Boolean).join(', ')}
              </GlassBadge>
            </View>
          ) : null}
          {photos.length > 1 ? (
            <View style={styles.dots}>
              {photos.map((p, idx) => (
                <View
                  key={p.id}
                  style={[styles.dot, idx === photoIndex && styles.dotActive]}
                />
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

      {/* Titre + infos (référence = code unique saisi côté logiciel, ex: US-WAV-101) */}
      <View style={styles.section}>
        <Text style={styles.title}>{data.reference ?? `Unité #${data.id}`}</Text>
        <Text style={styles.subtitle}>
          {data.type ?? '—'}
          {data.surface ? ` · ${data.surface} m²` : ''}
          {data.etage ? ` · Étage ${data.etage}` : ''}
        </Text>
      </View>

      {/* Bloc contenu avec padding latéral */}
      <View style={styles.body}>
        {/* Bouton EDL */}
        <Pressable onPress={() => nav.navigate('EdlList')}>
          <Card padding="lg" style={styles.edlCard}>
            <View style={styles.edlRow}>
              <View style={styles.edlIcon}>
                <ClipboardCheck size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.edlTitle}>État des lieux</Text>
                <Text style={styles.edlSub}>Consulter le document signé et ajouter des observations</Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </View>
          </Card>
        </Pressable>

        {/* Caractéristiques */}
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Caractéristiques</Text>
          <View style={styles.grid}>
            <Spec label="Chambres" value={data.nombre_chambres ?? '—'} />
            <Spec
              label={data.nb_parking > 1 ? 'Places de parking' : 'Place de parking'}
              value={data.nb_parking ?? 0}
            />
            <Spec label="Surface" value={data.surface ? `${data.surface} m²` : '—'} />
            <Spec label="Étage" value={data.etage ?? '—'} />
          </View>
        </Card>

        {/* Immeuble */}
        {data.immeuble ? (
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Immeuble</Text>
            <Text style={styles.bigText}>{data.immeuble.nom ?? '—'}</Text>
            <Text style={styles.mutedText}>
              {[data.immeuble.adresse, data.immeuble.quartier, data.immeuble.ville].filter(Boolean).join(' · ')}
            </Text>
          </Card>
        ) : null}

        {/* Équipements & services — icônes + texte (parité web) */}
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

        {/* Description */}
        {data.description ? (
          <Card padding="lg">
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.bodyText}>{data.description}</Text>
          </Card>
        ) : null}
      </View>
    </ScrollView>
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
  scroll: { paddingBottom: spacing['3xl'] },
  heroImg: { width: SCREEN_WIDTH, height: HERO_HEIGHT, backgroundColor: colors.bgSoft },
  heroPlaceholder: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: { position: 'absolute', left: spacing.lg, bottom: spacing.xl },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: colors.textInverse, width: 18 },

  section: { padding: spacing.lg },
  // Titre pris a la source commune (theme/typographie) : cet ecran
  // dessinait le sien, sur une taille qui n'existait nulle part ailleurs.
  title: titreEcran,
  subtitle: sousTitre,

  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  bigText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  mutedText: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 20 },
  bodyText: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },

  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, paddingBottom: spacing.lg },
  edlCard: { backgroundColor: colors.bgSoft, borderColor: 'transparent' },
  edlRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  edlIcon: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  edlTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  edlSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  spec: {
    flexBasis: '48%',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  amenityIconWrap: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  amenityLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textDark,
    fontWeight: fontWeight.medium,
  },
});
