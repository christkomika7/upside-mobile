/**
 * Galerie de contrôle — écran de DÉVELOPPEMENT, hors navigation.
 *
 * Il n'est atteignable depuis aucun onglet : on le monte à la main dans
 * `App.tsx` le temps de regarder les composants, puis on remet le navigateur.
 * Il sert à vérifier le rendu sans backend, les écrans de liste exigeant des
 * données. À supprimer avec `mobile-v2` si la direction n'est pas retenue.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Lightbulb, Tag } from 'lucide-react-native';
import { useState } from 'react';

import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import { CardHeading, InfoNote, Legend, PeriodToggle, Surface } from '../components/DataUI';
import { DetailHero } from '../components/DetailHero';
import { PhotoHeroCard } from '../components/PhotoHeroCard';
import { ScreenHero } from '../components/ScreenHero';
import { TipCard } from '../components/TipCard';
import { colors, fontSize, fontWeight, spacing } from '../theme';

export function Galerie() {
  const [periode, setPeriode] = useState<'J' | 'S' | 'M'>('M');

  return (
    <View style={styles.ecran}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <ScreenHero
          title="Mes biens"
          subtitle="4 unités · 3 louées"
          stats={[
            { label: 'Loyers perçus', value: '15 M', fort: true },
            { label: 'En attente', value: '2,4 M' },
            { label: 'Impayés', value: '0' },
          ]}
        />

        <View style={styles.bloc}>
          <Surface>
            <CardHeading
              overline="Vue mensuelle"
              title="Encaissements"
              right={
                <PeriodToggle
                  value={periode}
                  onChange={setPeriode}
                  options={['J', 'S', 'M'] as const}
                />
              }
            />
            <DonutChart
              data={[
                { label: 'Loyers', value: 30 },
                { label: 'Charges', value: 25 },
                { label: 'Caution', value: 20 },
                { label: 'Agence', value: 15 },
                { label: 'Divers', value: 10 },
              ]}
            />
          </Surface>

          <Surface>
            <Legend
              items={[
                { label: 'Loyers', value: '210 000', percent: 30 },
                { label: 'Charges', value: '175 000', percent: 25 },
                { label: 'Caution', value: '140 000', percent: 20 },
                { label: 'Agence', value: '105 000', percent: 15 },
                { label: 'Divers', value: '70 000', percent: 10 },
              ]}
            />
            <InfoNote>Les loyers représentent votre principal poste.</InfoNote>
          </Surface>

          <Surface>
            <CardHeading overline="Vue hebdomadaire" title="Encaissements (XAF)" />
            <BarChart
              data={[
                { label: 'Lun', value: 300 },
                { label: 'Mar', value: 340 },
                { label: 'Mer', value: 260 },
                { label: 'Jeu', value: 280 },
                { label: 'Ven', value: 60 },
                { label: 'Sam', value: 0 },
                { label: 'Dim', value: 0 },
              ]}
            />
          </Surface>

          <TipCard
            icone={Lightbulb}
            titre="Astuce du jour"
            texte="Relancer les loyers en retard dès le 5 du mois réduit vos impayés de"
            valeur="12 %"
            lien="En savoir plus"
            onPress={() => {}}
          />

          <PhotoHeroCard
            type="APPARTEMENT"
            lieu="Libreville, Akanda"
            titre="Résidence Les Acacias — Unité 303D"
            description="Appartement 3 chambres, 2 salles de bain, un parking."
            pied={
              <View style={styles.piedLoyer}>
                <Tag size={15} color={colors.primary} />
                <Text style={styles.loyer}>
                  850 000 XAF <Text style={styles.loyerUnite}>/ mois</Text>
                </Text>
              </View>
            }
            onPress={() => {}}
          />

          <DetailHero
            overline="Facture"
            title="US-F-1042"
            statut="Partiellement payée"
            amountLabel="Solde dû"
            amount="1 275 000 XAF"
            meta={[
              { label: 'Total TTC', value: '2 550 000' },
              { label: 'Déjà payé', value: '1 275 000' },
              { label: 'Échéance', value: '15/09/2026' },
            ]}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: colors.bgApp },
  contenu: { paddingBottom: spacing['3xl'] },
  bloc: { padding: spacing.lg, gap: spacing.md },
  piedLoyer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loyer: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textDark },
  loyerUnite: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.textMuted },
});
