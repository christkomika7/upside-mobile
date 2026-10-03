import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Tag, User } from 'lucide-react-native';

import { Card } from '../../components/Card';
import { GlassBadge } from '../../components/DataUI';
import { PhotoBanner } from '../../components/PhotoBanner';
import { EmptyState, ErrorState, LoadingState } from '../../components/QueryState';
import { BrandGradient } from '../../components/BrandGradient';
import { HERO_OVERLAP, ScreenHero } from '../../components/ScreenHero';
import { StatusPill } from '../../components/StatusPill';
import { useProprietaireBiens } from '../../hooks/proprietaire';
import type { ProprietaireBien } from '../../types/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';
import { fmtDate, fmtMontant } from '../../utils/format';

function formatType(t?: string | null): string {
  if (!t) return '';
  return t
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

type StatusTab = 'loues' | 'dispo';

const ALL = '__all__';

export function BiensScreen() {
  const [imId, setImId] = useState<string>(ALL); // ID immeuble (string pour permettre '__all__')
  const [statusTab, setStatusTab] = useState<StatusTab>('loues');
  const { data, isLoading, isError, error, refetch, isFetching } = useProprietaireBiens();

  const biens = data ?? [];

  // Groupes par immeuble (ordre stable par nom)
  const immeubles = useMemo(() => {
    const seen = new Map<string, { id: string; nom: string; count: number }>();
    for (const b of biens) {
      const id = b.immeuble ? String(b.immeuble.id) : '__none__';
      const nom = b.immeuble?.nom ?? 'Sans immeuble';
      const prev = seen.get(id);
      if (prev) prev.count += 1;
      else seen.set(id, { id, nom, count: 1 });
    }
    return Array.from(seen.values()).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [biens]);

  // Filtrage par immeuble puis par statut loué/dispo
  const filteredByImmeuble = useMemo(
    () => biens.filter((b) =>
      imId === ALL
        ? true
        : (b.immeuble ? String(b.immeuble.id) === imId : imId === '__none__')
    ),
    [biens, imId],
  );

  const loues = filteredByImmeuble.filter((b) => b.est_loue);
  const dispo = filteredByImmeuble.filter((b) => !b.est_loue);
  const visible = statusTab === 'loues' ? loues : dispo;

  return (
    <View style={styles.safe}>
      <ScreenHero
        title="Mes biens"
        subtitle={`${biens.length} bien${biens.length > 1 ? 's' : ''} au total`}
        stats={[
          { label: 'Loués', value: String(loues.length), fort: true },
          { label: 'Disponibles', value: String(dispo.length) },
          { label: 'Immeubles', value: String(immeubles.length) },
        ]}
      />

      {/* Niveau 1 — Immeubles en CARTES défilantes, plus en pastilles plates.
          Avec 26 biens, la rangée de pastilles passait à la ligne et occupait
          deux niveaux avant même la liste ; ici tout tient sur une ligne qu'on
          fait glisser, et chaque immeuble montre son compte en grand. */}
      {/* `flexGrow: 0` n'est pas cosmétique : un ScrollView horizontal placé
          dans une colonne s'étire pour prendre toute la hauteur restante, et la
          bascule qui suit venait alors se poser par-dessus les cartes. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.imScrollVue}
        contentContainerStyle={styles.imScroll}
      >
        <ImCarte
          nom="Tous"
          compte={biens.length}
          actif={imId === ALL}
          onPress={() => setImId(ALL)}
        />
        {immeubles.map((im) => (
          <ImCarte
            key={im.id}
            nom={im.nom}
            compte={im.count}
            actif={imId === im.id}
            onPress={() => setImId(im.id)}
          />
        ))}
      </ScrollView>

      {/* Niveau 2 — Bascule segmentée unique. Deux boutons séparés ne disaient
          pas qu'ils s'excluaient ; réunis dans une même piste, le choix se lit. */}
      <View style={styles.bascule}>
        <BasculeItem
          label="Loués"
          compte={loues.length}
          actif={statusTab === 'loues'}
          onPress={() => setStatusTab('loues')}
        />
        <BasculeItem
          label="Disponibles"
          compte={dispo.length}
          actif={statusTab === 'dispo'}
          onPress={() => setStatusTab('dispo')}
        />
      </View>

      {isLoading ? (
        <LoadingState label="Chargement…" />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {visible.length === 0 ? (
            <EmptyState
              icon="🏠"
              title={statusTab === 'loues' ? 'Aucun bien loué' : 'Aucun bien disponible'}
              description={statusTab === 'loues'
                ? "Aucune unité actuellement louée dans cette sélection."
                : 'Toutes les unités de cette sélection sont louées.'}
            />
          ) : (
            visible.map((b) => <BienRow key={b.id} bien={b} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

function BienRow({ bien: b }: { bien: ProprietaireBien }) {
  const hasRetard = b.retard_count > 0;
  const retardMois = b.retard_mois ?? [];

  return (
    <Card padding="none">
      {/* Photo en bandeau plein cadre, avec la localisation en pastille dépolie
          et le statut en vis-à-vis — reprise de la carte du modèle. La photo
          devient le sujet de la carte au lieu d'une vignette de côté. */}
      <PhotoBanner
        uri={b.photo}
        type={b.type}
        overlay={
          <>
            <GlassBadge>
              {[b.immeuble?.nom, b.immeuble?.ville].filter(Boolean).join(', ') || formatType(b.type)}
            </GlassBadge>
            <StatusPill
              label={b.est_loue ? 'Occupé' : 'Disponible'}
              tone={b.est_loue ? 'danger' : 'success'}
            />
          </>
        }
      />

      <View style={styles.corps}>
        <Text style={styles.bienTitle} numberOfLines={2}>{b.reference ?? b.nom}</Text>
        <Text style={styles.bienSub} numberOfLines={1}>{formatType(b.type)}</Text>

        {b.location ? (
          <View style={styles.ligneAvecIcone}>
                      <User size={13} color={colors.textMuted} />
                      <Text style={styles.bienLocataire} numberOfLines={1}>{b.location.locataire_nom ?? '—'}</Text>
                    </View>
        ) : null}

        {/* Pied : loyer en évidence à gauche, fin de bail à droite. */}
        <View style={styles.pied}>
          <View style={styles.loyerWrap}>
            <Tag size={15} color={colors.primary} />
            <Text style={styles.loyerTexte}>{fmtMontant(b.loyer_total)} <Text style={styles.loyerUnite}>/ mois</Text></Text>
          </View>
          {b.location?.date_fin ? (
            <Text style={styles.bienBail} numberOfLines={1}>Jusqu'au {fmtDate(b.location.date_fin)}</Text>
          ) : null}
        </View>

        {/* Alertes de retard — à l'intérieur du corps, sinon elles toucheraient
            les bords de la carte devenue sans rembourrage. */}
        {hasRetard && retardMois.length > 0 ? (
          <View style={styles.retardMoisRow}>
            <Text style={styles.retardMoisHeader}>Mois en retard : </Text>
            <Text style={styles.retardMoisItem} numberOfLines={2}>{retardMois.join(' · ')}</Text>
          </View>
        ) : null}

        {hasRetard ? (
          <View style={styles.retardPill}>
            <AlertTriangle size={12} color={colors.danger} />
            <Text style={styles.retardText} numberOfLines={1}>
              {b.retard_count} loyer{b.retard_count > 1 ? 's' : ''} en retard · {fmtMontant(b.retard_montant)}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

/** Carte d'immeuble : le compte en grand, le nom dessous. */
function ImCarte({ nom, compte, actif, onPress }: { nom: string; compte: number; actif: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.imCarte, actif && styles.imCarteActive]}>
      {actif ? <BrandGradient /> : null}
      <Text style={[styles.imCompte, actif && styles.imTexteActif]}>{compte}</Text>
      <Text style={[styles.imNom, actif && styles.imTexteActif]} numberOfLines={1}>{nom}</Text>
    </Pressable>
  );
}

function BasculeItem({ label, compte, actif, onPress }: { label: string; compte: number; actif: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.basculeItem, actif && styles.basculeItemActif]}>
      <Text style={[styles.basculeLabel, actif && styles.basculeLabelActif]}>{label}</Text>
      <View style={[styles.basculePuce, actif && styles.basculePuceActive]}>
        <Text style={[styles.basculeCompte, actif && styles.basculeCompteActif]}>{compte}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imScrollVue: { flexGrow: 0, flexShrink: 0 },
  imScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
  imCarte: {
    minWidth: 84,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  imCarteActive: { backgroundColor: colors.primaryDark, borderColor: 'transparent' },
  imCompte: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark, letterSpacing: -0.4 },
  imNom: { fontSize: 11, color: colors.textMuted, maxWidth: 110 },
  imTexteActif: { color: colors.textInverse },

  bascule: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    gap: 4,
  },
  basculeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  basculeItemActif: { backgroundColor: colors.primaryDark },
  basculeLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted },
  basculeLabelActif: { color: colors.textInverse },
  basculePuce: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: radius.pill, backgroundColor: 'rgba(22,33,27,0.08)' },
  basculePuceActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  basculeCompte: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.textMuted },
  basculeCompteActif: { color: colors.textInverse },
  ligneAvecIcone: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  corps: { padding: spacing.lg, gap: 4 },
  pied: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.sm, marginTop: spacing.sm,
  },
  loyerWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loyerTexte: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  loyerUnite: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.textMuted },
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDark },
  subtitleSmall: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  // Niveau 1 : tabs immeubles (même style pill que Loués/Disponibles, wrap multi-lignes)
  imRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  imTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
  },
  imTabActive: { backgroundColor: colors.primary },
  imTabLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  imTabLabelActive: { color: colors.textInverse },

  // Niveau 2 : tabs Loués / Disponibles
  statusRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  statusBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
  },
  statusBtnActive: { backgroundColor: colors.primary },
  statusBtnLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
  statusBtnLabelActive: { color: colors.textInverse },

  list: { marginTop: -HERO_OVERLAP, padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },

  // En-tête de carte : titre + statut (la photo est dans le body, en colonne gauche)
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.bgSoft,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 28 },
  bienTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  bienSub: { fontSize: fontSize.xs, color: colors.textMuted },

  // Corps : photo à gauche, infos à droite
  bodyRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
  },
  bodyInfo: { flex: 1, gap: 2 },
  bienLocataire: { fontSize: fontSize.xs, color: colors.textDark },
  bienMeta: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.bold, marginTop: 2 },
  bienBail: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  retardMoisRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  retardPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  retardText: { fontSize: fontSize.xs, color: colors.danger, fontWeight: fontWeight.semibold },
  retardMoisHeader: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  retardMoisItem: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
});
