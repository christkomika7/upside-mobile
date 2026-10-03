import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, FileText, Home as HomeIcon, LifeBuoy, Wallet } from 'lucide-react-native';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AnnouncementsBanner } from '../../components/AnnouncementsBanner';
import { UpcomingRdvBanner } from '../../components/UpcomingRdvBanner';
import { AvailableUnitsCarousel } from '../../components/AvailableUnitsCarousel';
import { Card } from '../../components/Card';
import BarChart from '../../components/BarChart';
import { CardHeading } from '../../components/DataUI';
import { BrandGradient } from '../../components/BrandGradient';
import { GradientCard } from '../../components/GradientCard';
import { LoadingState, ErrorState } from '../../components/QueryState';
import { ScreenHero } from '../../components/ScreenHero';
import { StatusPill, statusLabel, statusTone } from '../../components/StatusPill';
import { useAuth } from '../../auth/store';
import {
  useLocataireAnnonces,
  useLocataireBail,
  useLocataireFactures,
  useLocataireInterventions,
  useLocataireUpcomingRdv,
  useProchaineEcheance,
} from '../../hooks/locataire';
import type { LocataireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, radius, shadow, spacing } from '../../theme';
import { fmtDate, fmtMontant } from '../../utils/format';

type Nav = NativeStackNavigationProp<LocataireStackParamList>;


export function AccueilScreen() {
  const user = useAuth((s) => s.user);
  const nav = useNavigation<Nav>();

  const bailQ = useLocataireBail();
  const facturesQ = useLocataireFactures();
  const interQ = useLocataireInterventions();
  const annoncesQ = useLocataireAnnonces();
  const echeanceQ = useProchaineEcheance();
  const rdvQ = useLocataireUpcomingRdv();
  const hasAnnonces = (annoncesQ.data?.length ?? 0) > 0;
  const hasRdv = (rdvQ.data?.length ?? 0) > 0;
  // Quand un bandeau (RDV ou annonce) s'intercale entre le ciel et les stats,
  // on annule l'overlap pour éviter que les cartes ne recouvrent le bandeau.

  const refreshing = bailQ.isFetching || facturesQ.isFetching || interQ.isFetching || echeanceQ.isFetching;
  const refresh = () => {
    bailQ.refetch();
    facturesQ.refetch();
    interQ.refetch();
    echeanceQ.refetch();
  };

  // Prochaine échéance = mois de loyer impayés (ou prochain mois si à jour),
  // pas la date d'échéance écrite sur la facture.
  const echeance = echeanceQ.data;
  const firstMonth = echeance?.months[0];
  const arrearsCount = echeance?.is_arrears ? echeance.months.length : 0;

  const facturesAPayerCount = facturesQ.data?.filter((f) => f.solde_du > 0).length ?? 0;
  const interventionsActives = (interQ.data ?? []).filter(
    (i) => i.statut !== 'CLOTURE' && i.statut !== 'ANNULE',
  );
  const interventionsActivesCount = interventionsActives.length;
  // Récentes : toutes les actives, puis on complète avec les clôturées
  // jusqu'à atteindre 3 cartes au total.
  const interventionsCloturees = (interQ.data ?? []).filter(
    (i) => i.statut === 'CLOTURE' || i.statut === 'ANNULE',
  );
  const interventionsRecentes = [
    ...interventionsActives,
    ...interventionsCloturees.slice(0, Math.max(0, 3 - interventionsActives.length)),
  ];
  const facturesPayeesCount = facturesQ.data?.filter((f) => f.solde_du <= 0).length ?? 0;
  const soldeTotal = facturesQ.data?.reduce((s, f) => s + Math.max(f.solde_du, 0), 0) ?? 0;

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
          progressBackgroundColor={colors.bgCard}
          colors={[colors.primary]}
        />
      }
      // Garanties pour que le pull-to-refresh marche même quand le contenu
      // est plus court que l'écran (sinon RN bloque le geste).
      alwaysBounceVertical
      bounces
      overScrollMode="always"
      showsVerticalScrollIndicator={false}
    >
      {/* Hero ciel (greeting EN HAUT, plus de chevauchement) */}
      {/* Pas de chiffre dans la pastille : la carte « Prochain paiement »,
          juste dessous, affiche déjà ce montant en entier. Le répéter en
          abrégé n'ajoutait rien et obligeait à le lire deux fois. */}
      {/* Le même en-tête que les espaces propriétaire et collaborateur.
          Cet écran était le SEUL de toute l'application à porter un bandeau
          vert plein — vestige de l'ancienne direction, que j'avais recoloré au
          lieu de le remplacer. C'est ce qui faisait que l'espace locataire ne
          ressemblait à aucun autre, alors que c'est le premier écran qu'il voit. */}
      <ScreenHero
        title={`Bonjour, ${user?.prenom ?? ''}`.trim()}
        subtitle={bailQ.data?.unite_nom ?? undefined}
      />

      {/* Bandeau RDV à venir (directement sous le greeting) */}
      <UpcomingRdvBanner />

      {/* Bandeau annonces */}
      <AnnouncementsBanner />

      {/* Cartes glass 2x2 — overlap visuel sur le ciel UNIQUEMENT si aucun
          bandeau (RDV ou annonce) ne s'intercale au-dessus. */}
      <View style={styles.statsBlock}>
        <View style={styles.statsRow}>
          <GlassStat
            icon={<Wallet size={20} color={colors.textInverse} />}
            value={facturesAPayerCount}
            label="À payer"
            onPress={() => nav.navigate('Tabs', { screen: 'Factures' })}
          />
          <GlassStat
            icon={<LifeBuoy size={20} color={colors.textInverse} />}
            value={interventionsActivesCount}
            label="Interventions"
            onPress={() => nav.navigate('Tabs', { screen: 'Interventions' })}
          />
        </View>
        <View style={styles.statsRow}>
          <GlassStat
            icon={<FileText size={20} color={colors.textInverse} />}
            value={facturesPayeesCount}
            label="Factures payées"
            onPress={() => nav.navigate('Tabs', { screen: 'Factures' })}
          />
          <GlassStat
            icon={<HomeIcon size={20} color={colors.textInverse} />}
            value={1}
            label="Mon logement"
            onPress={() => nav.navigate('Bien')}
          />
        </View>
      </View>

      {/* Contenu principal */}
      <View style={styles.body}>
        {/* Solde dû / prochain paiement (basé sur les MOIS de loyer, pas les
            échéances de facture). */}
        {bailQ.isLoading || echeanceQ.isLoading ? (
          <Card padding="xl"><LoadingState label="Chargement…" /></Card>
        ) : bailQ.isError ? (
          <Card padding="xl"><ErrorState error={bailQ.error} onRetry={bailQ.refetch} /></Card>
        ) : (
          <GradientCard padding="xl">
            <Text style={styles.heroLabel}>
              {arrearsCount > 0 ? 'PAIEMENT EN RETARD' : 'PROCHAIN PAIEMENT'}
            </Text>
            <Text style={styles.heroAmount}>
              {fmtMontant(echeance?.total_du ?? bailQ.data?.loyer_total ?? 0)}
            </Text>
            <Text style={styles.heroSub}>
              {arrearsCount > 1
                ? `${arrearsCount} mois en retard : ${echeance!.months.map((m) => m.label).join(', ')}`
                : firstMonth
                  ? firstMonth.label
                  : `Loyer + charges (${bailQ.data?.periodicite?.toLowerCase() ?? 'mensuel'})`}
            </Text>
            {firstMonth?.facture_id ? (
              <Pressable
                onPress={() => nav.navigate('FactureDetail', { factureId: firstMonth.facture_id! })}
                style={styles.heroCta}
              >
                <Text style={styles.heroCtaLabel}>
                  {arrearsCount > 1 ? 'Voir la première facture →' : 'Voir la facture →'}
                </Text>
              </Pressable>
            ) : null}
            {soldeTotal > (echeance?.total_du ?? 0) ? (
              <View style={styles.heroAside}>
                <Text style={styles.heroAsideLabel}>Solde total dû</Text>
                <Text style={styles.heroAsideValue}>{fmtMontant(soldeTotal)}</Text>
              </View>
            ) : null}
          </GradientCard>
        )}

        {/* Règlements des 6 derniers mois — lecture d'ensemble de la régularité
            des paiements. Purement descriptif : on regroupe par mois des
            montants DÉJÀ fournis par l'API (montant_paye), sans rien recalculer. */}
        {(() => {
          const factures = facturesQ.data ?? [];
          if (factures.length === 0) return null;
          const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
          const now = new Date();
          const seaux = Array.from({ length: 6 }, (_, k) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
            return { cle: `${d.getFullYear()}-${d.getMonth()}`, label: MOIS[d.getMonth()], total: 0 };
          });
          for (const f of factures) {
            if (!f.date_emission || !(f.montant_paye > 0)) continue;
            const d = new Date(f.date_emission);
            if (Number.isNaN(d.getTime())) continue;
            const s = seaux.find((x) => x.cle === `${d.getFullYear()}-${d.getMonth()}`);
            if (s) s.total += f.montant_paye;
          }
          if (seaux.every((s) => s.total <= 0)) return null;
          const totalPeriode = seaux.reduce((s, x) => s + x.total, 0);
          return (
            <Card padding="lg">
              <CardHeading
                overline="6 derniers mois"
                title="Vos règlements"
                right={<Text style={styles.grapheTotal}>{fmtMontant(totalPeriode)}</Text>}
              />
              <BarChart
                data={seaux.map((s, i) => ({
                  label: s.label,
                  value: s.total,
                  highlight: i === seaux.length - 1,
                }))}
                height={104}
                formatValue={(v) => (v > 0 ? `${Math.round(v / 1000)}k` : '0')}
              />
            </Card>
          );
        })()}

        {/* Mon bien */}
        {bailQ.data ? (
          <Pressable onPress={() => nav.navigate('Bien')}>
            <Card padding="lg">
              <View style={styles.bienHead}>
                <View style={styles.bienIcon}>
                  <HomeIcon size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bienLabel}>MON LOGEMENT</Text>
                  <Text style={styles.bienTitle} numberOfLines={1}>
                    {bailQ.data.unite_nom ?? `Unité #${bailQ.data.unite_id}`}
                  </Text>
                  <Text style={styles.bienSub}>
                    Bail jusqu'au {fmtDate(bailQ.data.date_fin)}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* Interventions récentes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interventions récentes</Text>
          {interQ.isLoading ? (
            <Card padding="md"><LoadingState label="Chargement…" /></Card>
          ) : interventionsRecentes.length > 0 ? (
            interventionsRecentes.map((i) => (
              <Pressable
                key={i.id}
                onPress={() => nav.navigate('InterventionDetail', { interventionId: i.id })}
              >
                <Card padding="md" style={styles.interItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.interTitle} numberOfLines={1}>{i.titre ?? `#${i.id}`}</Text>
                    <Text style={styles.interSub}>{i.categorie ?? '—'} · {fmtDate(i.created_at)}</Text>
                  </View>
                  <StatusPill label={statusLabel(i.statut)} tone={statusTone(i.statut)} />
                </Card>
              </Pressable>
            ))
          ) : (
            <Card padding="lg" style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aucune intervention en cours</Text>
              <Text style={styles.emptyText}>
                Un problème dans votre logement ? Signalez-le depuis l'onglet "Interventions".
              </Text>
            </Card>
          )}
        </View>
      </View>

      {/* Carrousel des biens disponibles — défile de droite à gauche, évolue
          automatiquement quand l'agence saisit une location dans l'ERP. */}
      <View style={styles.carouselBlock}>
        <AvailableUnitsCarousel />
      </View>
    </ScrollView>
  );
}

function GlassStat({
  icon, value, label, onPress,
}: { icon: React.ReactNode; value: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <View style={[styles.statCard, pressed && { opacity: 0.85 }]}>
          <BrandGradient />
          {/* Icône et chiffre côte à côte : en pile, la tuile carrée laissait
              la moitié de sa surface vide pour n'afficher qu'un chiffre. */}
          <View style={styles.statHaut}>
            <View style={styles.statIconWrap}>{icon}</View>
            <Text style={styles.statValue}>{value}</Text>
          </View>
          <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grapheTotal: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { paddingBottom: spacing['3xl'] },

  statsBlock: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    borderRadius: radius.card,
    padding: spacing.md,
    overflow: 'hidden',
    ...shadow.card,
    gap: 4,
  },
  statHaut: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statIconWrap: {
    width: 32, height: 32, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
      },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textInverse },
  statLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)', fontWeight: fontWeight.semibold, marginTop: 2 },

  body: { padding: spacing.lg, gap: spacing.lg, marginTop: spacing.md },

  heroCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  heroLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.textInverse, opacity: 0.85, letterSpacing: 1,
  },
  heroAmount: {
    fontSize: fontSize['2xl'], fontWeight: fontWeight.bold,
    color: colors.textInverse, marginTop: spacing.xs,
  },
  heroSub: { fontSize: fontSize.sm, color: colors.textInverse, opacity: 0.85, marginTop: spacing.xs },
  heroCta: { marginTop: spacing.md, alignSelf: 'flex-start' },
  heroCtaLabel: { color: colors.textInverse, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  heroAside: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroAsideLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  heroAsideValue: { color: colors.textInverse, fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  bienHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bienIcon: {
    width: 44, height: 44, borderRadius: radius.lg,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  bienLabel: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.semibold, letterSpacing: 1 },
  bienTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark, marginTop: spacing.xs },
  bienSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  section: { gap: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },

  interItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  interTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  interSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  emptyCard: { backgroundColor: colors.bgSoft, borderColor: 'transparent' },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },
  emptyText: { marginTop: spacing.sm, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },

  carouselBlock: { marginTop: spacing.lg, paddingBottom: spacing.lg },
});
