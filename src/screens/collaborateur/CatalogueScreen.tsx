/**
 * Catalogue d'unités DISPONIBLES — pour les commerciaux en visite, leur
 * permettre de proposer une alternative immédiate au client si l'unité visitée
 * ne convient pas.
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, Tag } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '../../components/Card';
import { CircleAction, GlassBadge } from '../../components/DataUI';
import { PhotoBanner } from '../../components/PhotoBanner';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { ScreenHero } from '../../components/ScreenHero';
import { useCatalogue } from '../../hooks/collaborateur';
import type { CollaborateurStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, spacing, webInputReset } from '../../theme';
import { fmtMontant } from '../../utils/format';

type Nav = NativeStackNavigationProp<CollaborateurStackParamList>;

export function CatalogueScreen() {
  const nav = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch, isFetching } = useCatalogue(search || undefined);

  return (
    <View style={styles.safe}>
      <ScreenHero
        title="Catalogue"
        subtitle={`${data?.length ?? 0} unité${(data?.length ?? 0) > 1 ? 's' : ''} disponible${(data?.length ?? 0) > 1 ? 's' : ''}`}
      />

      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Référence, nom d'immeuble, quartier…"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, webInputReset]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {isLoading ? (
        <LoadingState label="Chargement du catalogue…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {!data || data.length === 0 ? (
            <EmptyState
              icon="🏠"
              title="Aucune unité disponible"
              description={search
                ? `Aucune correspondance pour « ${search} ».`
                : 'Toutes les unités sont actuellement louées ou indisponibles.'}
            />
          ) : (
            data.map((u) => (
              <Pressable key={u.id} onPress={() => nav.navigate('UniteDetail', { uniteId: u.id })}>
                <Card padding="none">
                  {/* Photo plein cadre + localisation en pastille dépolie :
                      la carte du modèle, appliquée au catalogue. */}
                  <PhotoBanner
                    uri={u.photo}
                    type={u.type}
                    overlay={u.immeuble?.nom ? (
                      <GlassBadge>
                        {[u.immeuble.nom, u.immeuble.quartier].filter(Boolean).join(', ')}
                      </GlassBadge>
                    ) : undefined}
                  />

                  <View style={styles.corps}>
                    <Text style={styles.ref} numberOfLines={2}>{u.reference}</Text>
                    <Text style={styles.muted} numberOfLines={1}>
                      {u.nombre_chambres} ch · {u.nombre_sdb} sdb
                      {u.nb_parking > 0 ? ` · ${u.nb_parking} pk` : ''}
                    </Text>

                    {/* Pied : loyer à gauche, bouton circulaire à droite. Il
                        mène AU MÊME détail que la carte entière — aucune
                        action nouvelle, seulement une affordance visible. */}
                    <View style={styles.pied}>
                      <View style={styles.loyerWrap}>
                        <Tag size={15} color={colors.primary} />
                        <Text style={styles.loyer}>
                          {fmtMontant(u.loyer + u.charges)} <Text style={styles.loyerUnite}>/ mois</Text>
                        </Text>
                      </View>
                      <CircleAction
                        size={46}
                        accessibilityLabel={`Ouvrir le détail de ${u.reference}`}
                        onPress={() => nav.navigate('UniteDetail', { uniteId: u.id })}
                      />
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  corps: { padding: spacing.lg, gap: 4 },
  pied: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.sm, marginTop: spacing.sm,
  },
  loyerWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  loyerUnite: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.textMuted },
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark },
  subtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgSoft,
    marginHorizontal: spacing.lg, paddingHorizontal: spacing.md,
    borderRadius: radius.pill, marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1, paddingVertical: spacing.sm,
    fontSize: fontSize.sm, color: colors.textDark,
  },

  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  card: { gap: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 72, height: 72, borderRadius: radius.md,
    backgroundColor: colors.bgSoft,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 32 },
  ref: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  muted: { fontSize: fontSize.xs, color: colors.textMuted },
  priceRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  loyer: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },
});
