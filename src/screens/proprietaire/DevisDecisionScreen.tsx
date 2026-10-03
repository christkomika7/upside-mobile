import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DevisFileButton } from '../../components/DevisFileButton';
import { GradientCard } from '../../components/GradientCard';
import { TextField } from '../../components/TextField';
import { ErrorState, LoadingState } from '../../components/QueryState';
import {
  useDevisEnValidation,
  useRefuseDevis,
  useValidateDevis,
} from '../../hooks/proprietaire';
import type { ProprietaireStackParamList } from '../../navigation/types';
import { colors, fontSize, fontWeight, spacing } from '../../theme';
import { fmtMontant } from '../../utils/format';

type Route = RouteProp<ProprietaireStackParamList, 'DevisDecision'>;
type Nav = NativeStackNavigationProp<ProprietaireStackParamList>;

export function DevisDecisionScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation<Nav>();
  const devisId = route.params.devisId;
  const [note, setNote] = useState('');

  const listQ = useDevisEnValidation();
  const validateM = useValidateDevis();
  const refuseM = useRefuseDevis();

  if (listQ.isLoading) return <LoadingState label="Chargement du devis…" />;
  if (listQ.isError) return <ErrorState error={listQ.error} onRetry={listQ.refetch} />;

  const devis = listQ.data?.find((d) => d.id === devisId);
  if (!devis) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Devis introuvable</Text>
        <Text style={styles.emptyText}>Ce devis a peut-être déjà été traité.</Text>
      </View>
    );
  }

  const handle = (action: 'validate' | 'refuse') => {
    const mut = action === 'validate' ? validateM : refuseM;
    mut.mutate(
      { devisId: devis.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          Alert.alert(
            action === 'validate' ? 'Devis validé' : 'Devis refusé',
            action === 'validate'
              ? 'Le collaborateur peut maintenant exécuter les travaux.'
              : 'Le devis est refusé. Le collaborateur en sera notifié.',
            [{ text: 'OK', onPress: () => nav.goBack() }],
          );
        },
        onError: (e) => {
          Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de traiter le devis.');
        },
      },
    );
  };

  const busy = validateM.isPending || refuseM.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.safe}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <GradientCard padding="xl">
          <Text style={styles.heroLabel}>MONTANT À VALIDER</Text>
          <Text style={styles.heroAmount}>{fmtMontant(devis.total_ttc)}</Text>
          <View style={styles.heroSplit}>
            <View style={{ flex: 1 }}>
              <Text style={styles.splitLabel}>Total HT</Text>
              <Text style={styles.splitValue}>{fmtMontant(devis.total_ht)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.splitLabel}>TVA</Text>
              <Text style={styles.splitValue}>{fmtMontant(devis.total_tva)}</Text>
            </View>
          </View>
        </GradientCard>

        {/* Prestataire + fichier joint à visualiser avant de décider */}
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Devis du prestataire</Text>
          <Text style={styles.body}>
            {[devis.fournisseur_nom, devis.lot, devis.reference].filter(Boolean).join(' · ') || 'Prestataire non précisé'}
          </Text>
          {devis.a_fichier ? (
            <DevisFileButton devisId={devis.id} fichierNom={devis.fichier_nom} />
          ) : (
            <Text style={styles.muted}>Aucun fichier joint par le collaborateur.</Text>
          )}
        </Card>

        {devis.lignes.length > 0 ? (
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Lignes du devis</Text>
            {devis.lignes.map((ln, idx) => (
              <View key={idx} style={[styles.line, idx === devis.lignes.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineDesignation}>{ln.designation ?? '—'}</Text>
                  {ln.quantite != null && ln.prix_unitaire != null ? (
                    <Text style={styles.muted}>{ln.quantite} × {fmtMontant(ln.prix_unitaire)}</Text>
                  ) : null}
                </View>
                <Text style={styles.lineTotal}>{fmtMontant(ln.total_ht ?? 0)}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {devis.note_collaborateur ? (
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Note du collaborateur</Text>
            <Text style={styles.body}>{devis.note_collaborateur}</Text>
          </Card>
        ) : null}

        <TextField
          label="Votre note (optionnel)"
          value={note}
          onChangeText={setNote}
          placeholder="Précisions, conditions, demandes…"
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' as const }}
        />

        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button label="Refuser" variant="danger" onPress={() => handle('refuse')} loading={refuseM.isPending} disabled={busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Valider" onPress={() => handle('validate')} loading={validateM.isPending} disabled={busy} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },

  heroLabel: { fontSize: fontSize.xs, color: colors.textInverse, opacity: 0.85, fontWeight: fontWeight.bold, letterSpacing: 1 },
  heroAmount: { fontSize: fontSize['3xl'], color: colors.textInverse, fontWeight: fontWeight.bold, marginTop: spacing.xs, marginBottom: spacing.md },
  heroSplit: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: spacing.md, gap: spacing.lg },
  splitLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  splitValue: { color: colors.textInverse, fontWeight: fontWeight.bold, fontSize: fontSize.base, marginTop: 2 },

  sectionTitle: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  body: { fontSize: fontSize.sm, color: colors.textDark, lineHeight: 22 },
  muted: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  line: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  lineDesignation: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark },
  lineTotal: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },

  actions: { flexDirection: 'row', gap: spacing.md },
});
