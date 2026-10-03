import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Building2, Calendar, Check, ChevronDown, Download, Eye, Filter, Home, Minus, Printer, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '../../api/client';
import { Card } from '../../components/Card';
import { DateField } from '../../components/DateField';
import { PdfViewerModal } from '../../components/PdfViewerModal';
import { ErrorState, LoadingState } from '../../components/QueryState';
import { useDecompteDetail, useProprietaireUnites } from '../../hooks/proprietaire';
import type { ProprietaireDecompteDetail, ProprietaireUnite } from '../../types/api';
import { colors, fontSize, fontWeight, radius, spacing } from '../../theme';
import { fmtDate, fmtMontant, frToIso, isoToFr } from '../../utils/format';

type PdfAction = 'view' | 'print' | 'download' | null;

export function TransactionsScreen() {
  const unitesQ = useProprietaireUnites();

  // Filtres — état appliqué (envoyé au backend) vs édité (formulaire)
  const [appliedFrom, setAppliedFrom] = useState<string>('');
  const [appliedTo, setAppliedTo] = useState<string>('');
  const [appliedUniteIds, setAppliedUniteIds] = useState<number[]>([]);

  const [editFrom, setEditFrom] = useState<string>('');
  const [editTo, setEditTo] = useState<string>('');
  const [editUniteIds, setEditUniteIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showUniteModal, setShowUniteModal] = useState(false);

  // Le hook attend un ISO YYYY-MM-DD ; on convertit depuis le format FR affiché.
  const detailQ = useDecompteDetail({
    date_from: frToIso(appliedFrom) || undefined,
    date_to: frToIso(appliedTo) || undefined,
    unite_ids: appliedUniteIds.length > 0 ? appliedUniteIds : undefined,
  });

  const unites = unitesQ.data ?? [];
  const uniteLabels = useMemo(() => {
    const map = new Map<number, string>();
    for (const u of unites) map.set(u.id, u.reference);
    return map;
  }, [unites]);

  // Groupement par immeuble pour le sélecteur hiérarchique
  const groupedUnites = useMemo(() => {
    const map = new Map<string, ProprietaireUnite[]>();
    for (const u of unites) {
      const key = u.immeuble_nom || 'Sans immeuble';
      const list = map.get(key);
      if (list) list.push(u);
      else map.set(key, [u]);
    }
    return [...map.entries()]
      .map(([nom, list]) => ({ nom, list: [...list].sort((a, b) => a.reference.localeCompare(b.reference)) }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [unites]);

  const openFilters = () => {
    setEditFrom(appliedFrom);
    setEditTo(appliedTo);
    setEditUniteIds([...appliedUniteIds]);
    setShowFilters(true);
  };
  const applyFilters = () => {
    setAppliedFrom(editFrom.trim());
    setAppliedTo(editTo.trim());
    setAppliedUniteIds([...editUniteIds]);
    setShowFilters(false);
  };
  const clearFilters = () => {
    setAppliedFrom('');
    setAppliedTo('');
    setAppliedUniteIds([]);
    setEditFrom('');
    setEditTo('');
    setEditUniteIds([]);
    setShowFilters(false);
  };

  // PDF (généré côté mobile via expo-print sur le HTML identique au web)
  const [pdfBusy, setPdfBusy] = useState<PdfAction>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  // Popup Export (Imprimer / Télécharger) — le propriétaire choisit période + biens
  // avant génération. Voir reste direct sur les filtres appliqués à l'écran.
  const [showExport, setShowExport] = useState(false);
  const [exportAction, setExportAction] = useState<'print' | 'download'>('print');
  const [exportFrom, setExportFrom] = useState<string>('');
  const [exportTo, setExportTo] = useState<string>('');
  const [exportUniteIds, setExportUniteIds] = useState<number[]>([]);

  // Sur RN Web, expo-print / expo-sharing retombent tous deux sur window.print().
  // On implémente 3 comportements distincts via l'API DOM native.
  const isWeb = Platform.OS === 'web';
  const openHtmlInNewTab = (html: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const printHtmlViaIframe = (html: string): Promise<void> => new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => { iframe.remove(); resolve(); }, 1000);
      }
    };
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
  // Web : télécharge un vrai PDF (paysage) en convertissant le HTML via
  // html2pdf.js (chargé dynamiquement pour ne pas alourdir le bundle initial).
  const downloadPdfWeb = async (html: string, filename: string) => {
    const mod = await import('html2pdf.js');
    const html2pdf = (mod as any).default ?? mod;
    await html2pdf().set({
      margin: 8,
      filename,
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    }).from(html).save();
  };

  // Native : expo-print génère un PDF A4 paysage (842 × 595 pt = 297 × 210 mm).
  const generatePdfUriFromHtml = async (html: string): Promise<string | null> => {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
      width: 842,
      height: 595,
    });
    const target = `${FileSystem.cacheDirectory}decompte.pdf`;
    try {
      await FileSystem.copyAsync({ from: uri, to: target });
      return target;
    } catch {
      return uri;
    }
  };

  const runAction = async (action: 'view' | 'print' | 'download', html: string) => {
    if (action === 'view') {
      if (isWeb) { openHtmlInNewTab(html); return; }
      const uri = await generatePdfUriFromHtml(html);
      if (uri) setViewerUri(uri);
      return;
    }
    if (action === 'print') {
      if (isWeb) { await printHtmlViaIframe(html); return; }
      await Print.printAsync({ html });
      return;
    }
    // download
    if (isWeb) { await downloadPdfWeb(html, 'decompte-proprietaire.pdf'); return; }
    const uri = await generatePdfUriFromHtml(html);
    if (!uri) return;
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Téléchargé', `Le PDF est enregistré : ${uri}`);
      return;
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Décompte propriétaire',
    });
  };

  // Récupère un décompte "à la volée" avec filtres custom (utilisé pour l'export
  // via la popup — indépendant des filtres de la vue).
  const fetchDecompte = async (filters: {
    from: string; to: string; unite_ids: number[];
  }): Promise<ProprietaireDecompteDetail> => {
    const qs: string[] = [];
    if (filters.from) qs.push(`date_from=${encodeURIComponent(filters.from)}`);
    if (filters.to) qs.push(`date_to=${encodeURIComponent(filters.to)}`);
    if (filters.unite_ids.length > 0) qs.push(`unite_ids=${filters.unite_ids.join(',')}`);
    const path = `/mobile/proprietaire/decompte/detail${qs.length ? `?${qs.join('&')}` : ''}`;
    return await api.get<ProprietaireDecompteDetail>(path);
  };

  // Voir : direct, utilise les filtres actuellement appliqués à l'écran.
  const onPdfView = async () => {
    if (!detailQ.data) return;
    setPdfBusy('view');
    try {
      const html = buildDecompteHtml(detailQ.data);
      await runAction('view', html);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de générer le PDF.');
    } finally {
      setPdfBusy(null);
    }
  };

  // Imprimer / Télécharger : ouvre la popup Export (choix biens + période).
  const openExportPopup = (action: 'print' | 'download') => {
    setExportAction(action);
    // Pré-remplit avec les filtres actuellement appliqués (utile si l'utilisateur
    // vient de filtrer et veut juste exporter la vue).
    setExportFrom(appliedFrom);
    setExportTo(appliedTo);
    setExportUniteIds([...appliedUniteIds]);
    setShowExport(true);
  };

  // Confirme l'export : fetch les données avec les filtres de la popup puis
  // déclenche l'action (impression ou téléchargement).
  const confirmExport = async () => {
    setShowExport(false);
    setPdfBusy(exportAction);
    try {
      // exportFrom/To sont en format FR ; on convertit vers ISO pour l'API.
      const data = await fetchDecompte({
        from: frToIso(exportFrom.trim()),
        to: frToIso(exportTo.trim()),
        unite_ids: exportUniteIds,
      });
      const html = buildDecompteHtml(data);
      await runAction(exportAction, html);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de générer le PDF.');
    } finally {
      setPdfBusy(null);
    }
  };

  if (detailQ.isLoading || unitesQ.isLoading) return <LoadingState label="Chargement…" />;
  if (detailQ.isError) return <ErrorState error={detailQ.error} onRetry={detailQ.refetch} />;
  if (!detailQ.data) return null;

  // Aplatir les mouvements en lignes de tableau
  const rows = flattenRows(detailQ.data);

  const hasActiveFilters = appliedFrom || appliedTo || appliedUniteIds.length > 0;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={detailQ.isFetching}
            onRefresh={detailQ.refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Filtres */}
        <View style={styles.filtersBar}>
          <Pressable onPress={openFilters} style={styles.filterBtn}>
            <Filter size={14} color={colors.primary} />
            <Text style={styles.filterBtnLabel}>
              {hasActiveFilters ? 'Filtres actifs' : 'Filtrer'}
            </Text>
          </Pressable>
          {hasActiveFilters ? (
            <Pressable onPress={clearFilters} style={styles.clearBtn}>
              <X size={12} color={colors.danger} />
              <Text style={styles.clearBtnLabel}>Réinitialiser</Text>
            </Pressable>
          ) : null}
        </View>

        {hasActiveFilters ? (
          <Card padding="md" style={styles.activeFiltersCard}>
            {appliedFrom || appliedTo ? (
              <Text style={styles.activeFiltersText}>
                <Text style={styles.activeFiltersLabel}>Période : </Text>
                {appliedFrom || '…'} → {appliedTo || '…'}
              </Text>
            ) : null}
            {appliedUniteIds.length > 0 ? (
              <Text style={styles.activeFiltersText}>
                <Text style={styles.activeFiltersLabel}>
                  Unité{appliedUniteIds.length > 1 ? 's' : ''} :{' '}
                </Text>
                {appliedUniteIds.map((id) => uniteLabels.get(id) ?? `#${id}`).join(', ')}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* Actions PDF — Voir : direct ; Imprimer/Télécharger : ouvre la popup Export */}
        <View style={styles.pdfRow}>
          <PdfBtn icon={<Eye size={18} color={colors.primary} />} label="Voir" onPress={onPdfView} loading={pdfBusy === 'view'} disabled={pdfBusy !== null} />
          <PdfBtn icon={<Printer size={18} color={colors.primary} />} label="Imprimer" onPress={() => openExportPopup('print')} loading={pdfBusy === 'print'} disabled={pdfBusy !== null} />
          <PdfBtn icon={<Download size={18} color={colors.primary} />} label="Télécharger" onPress={() => openExportPopup('download')} loading={pdfBusy === 'download'} disabled={pdfBusy !== null} />
        </View>

        {/* Tableau transactions — colonnes pleine largeur, scroll horizontal pour
            voir Encaissé/Décaissé/Commission/Net à droite (identique au logiciel) */}
        <Card padding="md">
          <Text style={styles.sectionTitle}>Transactions ({rows.length})</Text>
          {rows.length === 0 ? (
            <Text style={styles.emptyText}>Aucune transaction sur les filtres sélectionnés.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.colDate]}>Date</Text>
                  <Text style={[styles.th, styles.colUnit]}>Unité</Text>
                  <Text style={[styles.th, styles.colNat]}>Nature</Text>
                  <Text style={[styles.th, styles.colPer]}>Période</Text>
                  <Text style={[styles.th, styles.colNum]}>Encaissé</Text>
                  <Text style={[styles.th, styles.colNum]}>Décaissé</Text>
                  <Text style={[styles.th, styles.colNum]}>Commission</Text>
                  <Text style={[styles.th, styles.colNum]}>Net</Text>
                </View>
                {rows.map((r, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.td, styles.colDate]} numberOfLines={1}>{fmtDate(r.date)}</Text>
                    <Text style={[styles.td, styles.colUnit]} numberOfLines={1}>{r.unite_ref}</Text>
                    <Text style={[styles.td, styles.colNat]} numberOfLines={1}>{r.motif}</Text>
                    <Text style={[styles.td, styles.colPer]} numberOfLines={1}>{r.periode || '—'}</Text>
                    <Text style={[styles.td, styles.colNum, styles.tdIn]} numberOfLines={1}>{r.encaisse ? fmtMontant(r.encaisse) : ''}</Text>
                    <Text style={[styles.td, styles.colNum, styles.tdOut]} numberOfLines={1}>{r.decaisse ? fmtMontant(r.decaisse) : ''}</Text>
                    <Text style={[styles.td, styles.colNum]} numberOfLines={1}>{r.commission ? fmtMontant(r.commission) : ''}</Text>
                    <Text style={[styles.td, styles.colNum, styles.tdNet]} numberOfLines={1}>{fmtMontant(r.net)}</Text>
                  </View>
                ))}
                {/* Total */}
                <View style={[styles.tableRow, styles.totalRow]}>
                  <Text style={[styles.td, styles.colDate, styles.totalLabel]}>TOTAL</Text>
                  <View style={styles.colUnit} />
                  <View style={styles.colNat} />
                  <View style={styles.colPer} />
                  <Text style={[styles.td, styles.colNum, styles.totalLabel]} numberOfLines={1}>{fmtMontant(detailQ.data.total.encaisse)}</Text>
                  <Text style={[styles.td, styles.colNum, styles.totalLabel]} numberOfLines={1}>{fmtMontant(detailQ.data.total.decaisse)}</Text>
                  <Text style={[styles.td, styles.colNum, styles.totalLabel]} numberOfLines={1}>{fmtMontant(detailQ.data.total.commission)}</Text>
                  <Text style={[styles.td, styles.colNum, styles.totalLabel, { color: colors.success }]} numberOfLines={1}>{fmtMontant(detailQ.data.total.net)}</Text>
                </View>
              </View>
            </ScrollView>
          )}
          <Text style={styles.swipeHint}>← Glissez pour voir toutes les colonnes →</Text>
        </Card>

        {/* Résumé par bien (encaissé · décaissé commission comprise · TSIL reversée) */}
        {detailQ.data.immeubles.length > 0 ? (
          <Card padding="md">
            <Text style={styles.sectionTitle}>Résumé par bien</Text>

            {/* Empilé, et non plus en tableau qui défile. Dans le tableau, la
                colonne des montants sortait du cadre : « 2 085 000 XAF »
                s'affichait « 2 085 ». Un libellé tronqué se voit ; un MONTANT
                tronqué reste un nombre valide, et se lisait donc comme un
                total complet — à un facteur mille près. Ici, plus rien ne peut
                être coupé. */}
            {[
              ...detailQ.data.immeubles.map((im) => ({
                cle: String(im.id),
                nom: im.nom,
                encaisse: im.encaisse,
                decaisse: im.decaisse + im.commission,
                tsil: im.tsil_reverse ?? 0,
                total: false,
              })),
              {
                cle: 'tous',
                nom: 'Tous les biens',
                encaisse: detailQ.data.total.encaisse,
                decaisse: detailQ.data.total.decaisse + detailQ.data.total.commission,
                tsil: detailQ.data.total.tsil_reverse ?? 0,
                total: true,
              },
            ].map((b) => (
              <View key={b.cle} style={[styles.bienBloc, b.total && styles.bienBlocTotal]}>
                <Text style={[styles.bienNom, b.total && styles.totalLabel]} numberOfLines={2}>
                  {b.nom}
                </Text>
                {/* Jauges plutôt que trois lignes de chiffres : la part de
                    chaque poste se voit avant d'être lue. L'échelle est celle du
                    plus gros poste DU BIEN, si bien qu'on compare les postes
                    entre eux — comparer d'un bien à l'autre serait faux, leurs
                    ordres de grandeur n'ayant rien à voir. */}
                {(() => {
                  const postes = [
                    { cle: 'Encaissé', montant: b.encaisse, ton: 'in' as const },
                    { cle: 'Décaissé (comm.)', montant: b.decaisse, ton: 'out' as const },
                    { cle: 'TSIL reversée', montant: b.tsil, ton: 'neutre' as const },
                  ];
                  const max = Math.max(...postes.map((x) => x.montant), 1);
                  return postes.map((x) => (
                    <View key={x.cle} style={styles.bienPoste}>
                      <View style={styles.bienLigne}>
                        <Text style={styles.bienCle}>{x.cle}</Text>
                        <Text
                          style={[
                            styles.bienValeur,
                            x.ton === 'in' ? styles.tdIn : x.ton === 'out' ? styles.tdOut : null,
                          ]}
                        >
                          {fmtMontant(x.montant)}
                        </Text>
                      </View>
                      <View style={styles.bienJauge}>
                        <View
                          style={[
                            styles.bienJaugeRemplie,
                            x.ton === 'in'
                              ? styles.bienJaugeIn
                              : x.ton === 'out'
                                ? styles.bienJaugeOut
                                : styles.bienJaugeNeutre,
                            { width: `${Math.max(2, (x.montant / max) * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  ));
                })()}
              </View>
            ))}
            <Text style={styles.tsilNote}>La TSIL reversée à l'État est un suivi séparé : elle n'entre pas dans le solde à reverser au propriétaire.</Text>
          </Card>
        ) : null}
      </ScrollView>

      {/* Modal Filtres */}
      <Modal visible={showFilters} animationType="slide" onRequestClose={() => setShowFilters(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <Pressable onPress={() => setShowFilters(false)} hitSlop={10}>
              <X size={24} color={colors.textDark} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Période */}
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.modalLabel}>Période</Text>
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <DateField label="Du" value={editFrom} onChangeText={setEditFrom} />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField label="Au" value={editTo} onChangeText={setEditTo} />
                </View>
              </View>
              <View style={styles.quickRow}>
                <QuickDate label="Ce mois" onPress={() => { const [f, t] = currentMonthRange(); setEditFrom(f); setEditTo(t); }} />
                <QuickDate label="Mois dernier" onPress={() => { const [f, t] = previousMonthRange(); setEditFrom(f); setEditTo(t); }} />
                <QuickDate label="Cette année" onPress={() => { const [f, t] = currentYearRange(); setEditFrom(f); setEditTo(t); }} />
                <QuickDate label="Tout" onPress={() => { setEditFrom(''); setEditTo(''); }} />
              </View>
            </View>

            {/* Multi-select unités */}
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.modalLabel}>Unités</Text>
              <Pressable onPress={() => setShowUniteModal(true)} style={styles.selectField}>
                <Calendar size={16} color={colors.textMuted} />
                <Text style={[styles.selectFieldText, editUniteIds.length === 0 && styles.selectFieldPlaceholder]}>
                  {editUniteIds.length === 0
                    ? 'Toutes les unités'
                    : editUniteIds.map((id) => uniteLabels.get(id) ?? `#${id}`).join(', ')}
                </Text>
                <ChevronDown size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <Pressable onPress={clearFilters} style={[styles.modalBtn, styles.modalBtnGhost]}>
              <Text style={styles.modalBtnGhostLabel}>Réinitialiser</Text>
            </Pressable>
            <Pressable onPress={applyFilters} style={[styles.modalBtn, styles.modalBtnPrimary]}>
              <Text style={styles.modalBtnPrimaryLabel}>Appliquer</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Multi-select unités */}
      <Modal visible={showUniteModal} animationType="slide" onRequestClose={() => setShowUniteModal(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélection des unités</Text>
            <Pressable onPress={() => setShowUniteModal(false)} hitSlop={10}>
              <X size={24} color={colors.textDark} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xs }}>
            <Pressable
              onPress={() => setEditUniteIds([])}
              style={[styles.uniteRow, editUniteIds.length === 0 && styles.uniteRowActive]}
            >
              <View style={[styles.checkbox, editUniteIds.length === 0 && styles.checkboxActive]}>
                {editUniteIds.length === 0 ? <Check size={14} color={colors.textInverse} /> : null}
              </View>
              <Text style={styles.uniteLabel}>Toutes les unités</Text>
            </Pressable>
            {unites.map((u) => {
              const selected = editUniteIds.includes(u.id);
              return (
                <Pressable
                  key={u.id}
                  onPress={() => {
                    setEditUniteIds((prev) => (
                      prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]
                    ));
                  }}
                  style={[styles.uniteRow, selected && styles.uniteRowActive]}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                    {selected ? <Check size={14} color={colors.textInverse} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uniteLabel}>{u.reference}</Text>
                    {u.immeuble_nom ? <Text style={styles.uniteImm}>{u.immeuble_nom}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.modalFooter}>
            <Pressable onPress={() => setShowUniteModal(false)} style={[styles.modalBtn, styles.modalBtnPrimary]}>
              <Text style={styles.modalBtnPrimaryLabel}>OK ({editUniteIds.length === 0 ? 'toutes' : editUniteIds.length})</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Export — s'ouvre au clic sur Imprimer ou Télécharger */}
      <Modal visible={showExport} animationType="slide" onRequestClose={() => setShowExport(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.exportHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportKicker}>
                {exportAction === 'print' ? 'Imprimer' : 'Télécharger'}
              </Text>
              <Text style={styles.exportTitle}>Décompte propriétaire</Text>
              <Text style={styles.exportSub}>
                Choisissez la période et les biens à inclure dans le document.
              </Text>
            </View>
            <Pressable onPress={() => setShowExport(false)} hitSlop={10} style={styles.exportClose}>
              <X size={20} color={colors.textDark} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.exportBody}>
            {/* Section Période */}
            <View style={styles.exportSection}>
              <View style={styles.exportSectionHead}>
                <Calendar size={16} color={colors.primary} />
                <Text style={styles.exportSectionTitle}>Période</Text>
              </View>
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <DateField label="Du" value={exportFrom} onChangeText={setExportFrom} />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField label="Au" value={exportTo} onChangeText={setExportTo} />
                </View>
              </View>
              <View style={styles.quickRow}>
                <QuickDate label="Ce mois" onPress={() => { const [f, t] = currentMonthRange(); setExportFrom(f); setExportTo(t); }} />
                <QuickDate label="Mois dernier" onPress={() => { const [f, t] = previousMonthRange(); setExportFrom(f); setExportTo(t); }} />
                <QuickDate label="Cette année" onPress={() => { const [f, t] = currentYearRange(); setExportFrom(f); setExportTo(t); }} />
                <QuickDate label="Tout" onPress={() => { setExportFrom(''); setExportTo(''); }} />
              </View>
            </View>

            {/* Section Biens — hiérarchie immeuble → unités */}
            <View style={styles.exportSection}>
              <View style={styles.exportSectionHead}>
                <Building2 size={16} color={colors.primary} />
                <Text style={styles.exportSectionTitle}>Biens à inclure</Text>
                <Text style={styles.exportSectionCount}>
                  {exportUniteIds.length === 0 ? 'Tous' : `${exportUniteIds.length} sélectionné${exportUniteIds.length > 1 ? 's' : ''}`}
                </Text>
              </View>

              {/* Master : tous les biens */}
              <Pressable
                onPress={() => setExportUniteIds([])}
                style={[styles.allBiensRow, exportUniteIds.length === 0 && styles.allBiensRowActive]}
              >
                <View style={[styles.checkbox, exportUniteIds.length === 0 && styles.checkboxActive]}>
                  {exportUniteIds.length === 0 ? <Check size={14} color={colors.textInverse} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.allBiensLabel}>Tous les biens</Text>
                  <Text style={styles.allBiensSub}>{unites.length} bien{unites.length > 1 ? 's' : ''} au total</Text>
                </View>
              </Pressable>

              {/* Immeubles */}
              {groupedUnites.map((g) => {
                const ids = g.list.map((u) => u.id);
                const selectedCount = ids.filter((id) => exportUniteIds.includes(id)).length;
                const allSelected = selectedCount === ids.length && ids.length > 0;
                const partial = selectedCount > 0 && !allSelected;
                const toggleAll = () => {
                  setExportUniteIds((prev) => {
                    if (allSelected) return prev.filter((id) => !ids.includes(id));
                    const merged = new Set(prev);
                    for (const id of ids) merged.add(id);
                    return [...merged];
                  });
                };
                return (
                  <View key={g.nom} style={styles.immBlock}>
                    <Pressable onPress={toggleAll} style={styles.immHeader}>
                      <View style={[
                        styles.checkbox,
                        (allSelected || partial) && styles.checkboxActive,
                      ]}>
                        {allSelected ? (
                          <Check size={14} color={colors.textInverse} />
                        ) : partial ? (
                          <Minus size={14} color={colors.textInverse} />
                        ) : null}
                      </View>
                      <Building2 size={16} color={colors.textDark} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.immName}>{g.nom}</Text>
                        <Text style={styles.immMeta}>
                          {selectedCount === 0
                            ? `${g.list.length} bien${g.list.length > 1 ? 's' : ''}`
                            : `${selectedCount}/${g.list.length} sélectionné${selectedCount > 1 ? 's' : ''}`}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.uniteList}>
                      {g.list.map((u) => {
                        const selected = exportUniteIds.includes(u.id);
                        return (
                          <Pressable
                            key={u.id}
                            onPress={() => {
                              setExportUniteIds((prev) => (
                                prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]
                              ));
                            }}
                            style={styles.uniteRowFlat}
                          >
                            <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                              {selected ? <Check size={12} color={colors.textInverse} /> : null}
                            </View>
                            <Home size={14} color={colors.textMuted} />
                            <Text style={styles.uniteRefText} numberOfLines={1}>{u.reference}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable onPress={() => setShowExport(false)} style={[styles.modalBtn, styles.modalBtnGhost]}>
              <Text style={styles.modalBtnGhostLabel}>Annuler</Text>
            </Pressable>
            <Pressable onPress={confirmExport} style={[styles.modalBtn, styles.modalBtnPrimary]}>
              {exportAction === 'print' ? (
                <Printer size={16} color={colors.textInverse} />
              ) : (
                <Download size={16} color={colors.textInverse} />
              )}
              <Text style={styles.modalBtnPrimaryLabel}>
                {exportAction === 'print' ? 'Imprimer' : 'Télécharger'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <PdfViewerModal
        visible={viewerUri !== null}
        uri={viewerUri}
        title="Décompte"
        onClose={() => setViewerUri(null)}
      />
    </SafeAreaView>
  );
}

// ── Helpers UI ─────────────────────────────────────────────────────────────

function PdfBtn({ icon, label, onPress, loading, disabled }: {
  icon: React.ReactNode; label: string; onPress: () => void; loading: boolean; disabled: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [styles.pdfBtn, disabled && { opacity: 0.5 }, pressed && !disabled && { opacity: 0.85 }]}
    >
      {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <>{icon}<Text style={styles.pdfBtnLabel}>{label}</Text></>}
    </Pressable>
  );
}

function QuickDate({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickBtn}>
      <Text style={styles.quickBtnLabel}>{label}</Text>
    </Pressable>
  );
}

// ── Helpers dates rapides ──────────────────────────────────────────────────

function frDay(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}
function currentMonthRange(): [string, string] {
  const now = new Date();
  return [frDay(new Date(now.getFullYear(), now.getMonth(), 1)), frDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
}
function previousMonthRange(): [string, string] {
  const now = new Date();
  return [frDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)), frDay(new Date(now.getFullYear(), now.getMonth(), 0))];
}
function currentYearRange(): [string, string] {
  const now = new Date();
  return [frDay(new Date(now.getFullYear(), 0, 1)), frDay(new Date(now.getFullYear(), 11, 31))];
}

// ── Aplatissage des mouvements en lignes de tableau ────────────────────────

interface FlatRow {
  date: string | null;
  unite_ref: string;
  motif: string;
  periode: string;
  encaisse: number;
  decaisse: number;
  commission: number;
  net: number;
}

function flattenRows(d: ProprietaireDecompteDetail): FlatRow[] {
  const out: FlatRow[] = [];
  for (const im of d.immeubles) {
    for (const u of im.unites) {
      for (const mv of u.mouvements ?? []) {
        const enc = mv.type === 'entree' ? mv.montant : 0;
        const dec = mv.type === 'sortie' ? mv.montant : 0;
        const comm = mv.type === 'entree' ? round2(enc * (u.gestion_pourcent || 0) / 100) : 0;
        const net = round2(enc - comm - dec);
        const periode = (mv.mois && mv.mois.length)
          ? mv.mois.map((m) => `${m.label} (${m.pct ?? 100}%)`).join(', ')
          : '';
        out.push({
          date: mv.date,
          unite_ref: u.nom,
          motif: mv.motif,
          periode,
          encaisse: enc,
          decaisse: dec,
          commission: comm,
          net,
        });
      }
    }
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── HTML PDF Décompte propriétaire — mise en page soignée ──────────────────
//
// Sections (dans l'ordre) :
//   1. Header dégradé (logo à gauche, coordonnées société à droite)
//   2. Bloc identité propriétaire + période + date d'émission
//   3. Tableau détaillé des transactions (groupé par immeuble avec sous-totaux)
//   4. Résumé par bien
//   5. Bloc TSIL (si applicable)
//   6. Bloc Reversements + solde à reverser
//   7. Pied de page
//
// Aucun élément d'UI de l'app (icônes Voir/Imprimer/Télécharger, filtres, etc.)
// n'est inclus — c'est un document autonome.

function buildDecompteHtml(dd: ProprietaireDecompteDetail): string {
  const esc = (s?: string | null) => (s ?? '').toString().replace(/[<>&"']/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
  const dash = (s?: string | null) => (s && s.trim() ? esc(s) : '—');
  const m = (n: number) => fmtMontant(n);
  const r2 = round2;
  const logo = dd.settings.logo_base64;
  const company = dd.settings.company_name || 'UPSide';
  const tel = dd.settings.telephone;
  const emailSoc = dd.settings.email_societe;

  // 3. Corps du tableau transactions (groupé par immeuble)
  let body = '';
  for (const im of dd.immeubles) {
    body += `<tr class="imm-header"><td colspan="8">${esc(im.nom)}</td></tr>`;
    let hasRows = false;
    for (const u of im.unites) {
      for (const mv of (u.mouvements ?? [])) {
        hasRows = true;
        const enc = mv.type === 'entree' ? mv.montant : 0;
        const dec = mv.type === 'sortie' ? mv.montant : 0;
        const comm = mv.type === 'entree' ? r2(enc * (u.gestion_pourcent || 0) / 100) : 0;
        const net = r2(enc - comm - dec);
        const periode = (mv.mois && mv.mois.length)
          ? mv.mois.map(mo => `${esc(mo.label)} <span class="pct">(${mo.pct ?? 100}%)</span>`).join(', ')
          : '—';
        body += `<tr>
          <td class="c-date">${dash(fmtDate(mv.date))}</td>
          <td>${esc(u.nom)}</td>
          <td>${esc(mv.motif)}</td>
          <td>${periode}</td>
          <td class="r c-in">${enc ? m(enc) : ''}</td>
          <td class="r c-out">${dec ? m(dec) : ''}</td>
          <td class="r">${comm ? m(comm) : ''}</td>
          <td class="r b">${m(net)}</td>
        </tr>`;
      }
    }
    if (!hasRows) {
      body += `<tr><td colspan="8" class="empty-row">Aucune transaction sur la période sélectionnée pour ${esc(im.nom)}.</td></tr>`;
    }
    body += `<tr class="imm-subtotal">
      <td colspan="4">Sous-total ${esc(im.nom)}</td>
      <td class="r">${m(im.encaisse)}</td>
      <td class="r">${m(im.decaisse)}</td>
      <td class="r">${m(im.commission)}</td>
      <td class="r b">${m(im.net)}</td>
    </tr>`;
  }
  if (dd.immeubles.length === 0) {
    body = `<tr><td colspan="8" class="empty-row">Aucune transaction sur la période sélectionnée.</td></tr>`;
  }

  // 4. Résumé par bien
  const resumeRows = dd.immeubles.map((im) => `<tr>
    <td class="b">${esc(im.nom)}</td>
    <td class="r c-in">${m(im.encaisse)}</td>
    <td class="r c-out">${m(im.decaisse + im.commission)}</td>
    <td class="r">${m(im.tsil_reverse ?? 0)}</td>
  </tr>`).join('');
  const resumeBlock = dd.immeubles.length > 0 ? `
    <div class="section-title">Résumé par bien</div>
    <table class="tbl">
      <thead>
        <tr>
          <th style="width:45%">Bien</th>
          <th class="r" style="width:20%">Encaissé</th>
          <th class="r" style="width:20%">Décaissé (comm. comprise)</th>
          <th class="r" style="width:15%">TSIL reversée</th>
        </tr>
      </thead>
      <tbody>${resumeRows}</tbody>
      <tfoot>
        <tr>
          <td class="b">Tous les biens</td>
          <td class="r b">${m(dd.total.encaisse ?? 0)}</td>
          <td class="r b">${m((dd.total.decaisse ?? 0) + (dd.total.commission ?? 0))}</td>
          <td class="r b">${m(dd.total.tsil_reverse ?? 0)}</td>
        </tr>
      </tfoot>
    </table>
    <p class="note">La TSIL reversée à l'État est un suivi séparé : elle n'entre pas dans le solde à reverser au propriétaire.</p>
  ` : '';

  // 5. Bloc TSIL
  const tsilBlock = (dd.tsil.tsil_brut > 0 || dd.tsil.tsil_paye > 0 || dd.tsil.tsil_du > 0)
    ? `
    <div class="section-title">TSIL — Taxe à reverser à l'État</div>
    <table class="tbl">
      <tbody>
        <tr><td>TSIL due (15 % loyers HT encaissés)</td><td class="r">${m(dd.tsil.tsil_brut)}</td></tr>
        <tr><td>Déjà payée à l'État</td><td class="r c-out">−${m(dd.tsil.tsil_paye)}</td></tr>
      </tbody>
      <tfoot>
        <tr><td class="b">RESTE À REVERSER À L'ÉTAT</td><td class="r b" style="color:#b91c1c">${m(dd.tsil.tsil_du)}</td></tr>
      </tfoot>
    </table>` : '';

  // 6. Bloc reversements + solde
  const netOwner = (dd.total.net ?? 0) - (dd.tsil?.tsil_brut ?? 0);
  const solde = dd.total.solde ?? netOwner;
  const revBlock = `
    <div class="section-title">Reversements au propriétaire</div>
    <table class="tbl">
      <tbody>
        <tr><td>Net à reverser</td><td class="r">${m(netOwner)}</td></tr>
        <tr><td>Déjà versé</td><td class="r c-out">−${m(dd.total.reverse ?? 0)}</td></tr>
      </tbody>
      <tfoot>
        <tr>
          <td class="solde-label">SOLDE À REVERSER</td>
          <td class="r solde-value">${m(solde)}</td>
        </tr>
      </tfoot>
    </table>`;

  // Métadonnées
  const emisLe = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const periodeFrom = dd.date_from ? esc(fmtDate(dd.date_from)) : '';
  const periodeTo = dd.date_to ? esc(fmtDate(dd.date_to)) : '';
  const periodeStr = (periodeFrom || periodeTo) ? `${periodeFrom || '…'} → ${periodeTo || '…'}` : 'Toutes les périodes';

  return `<!doctype html><html><head><meta charset="utf-8"><title>Décompte propriétaire</title></head>
<body>
<style>
  /* Format A4 paysage (297 × 210 mm) — imposé pour l'impression et la conversion PDF */
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0d2015; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .doc { padding: 20px 28px; }

  /* 1. Header dégradé */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-radius: 12px;
    background: linear-gradient(135deg, #5AE1A3, #2EC48A);
    color: #fff; margin-bottom: 24px;
  }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .header-logo { max-height: 64px; max-width: 220px; object-fit: contain; background: #fff; padding: 6px 10px; border-radius: 8px; }
  .header-brand { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
  .header-right { text-align: right; font-size: 11px; line-height: 1.5; opacity: 0.95; }
  .header-right .name { font-weight: 700; font-size: 13px; margin-bottom: 4px; }

  /* 2. Bloc identité propriétaire */
  .doc-title { font-size: 24px; font-weight: 800; color: #0d2015; margin: 0 0 4px; }
  .doc-subtitle { font-size: 12px; color: #6b7280; margin: 0 0 20px; }
  .id-card {
    background: #f8faf9; border-left: 4px solid #2EC48A;
    padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;
  }
  .id-card .id-name { font-size: 16px; font-weight: 700; color: #0d2015; margin: 0 0 4px; }
  .id-card .id-meta { font-size: 11px; color: #6b7280; margin: 2px 0; }
  .id-card .id-meta strong { color: #0d2015; font-weight: 600; }

  /* Section titles */
  .section-title {
    font-size: 12px; font-weight: 700; color: #0d2015;
    text-transform: uppercase; letter-spacing: 1.2px;
    margin: 24px 0 10px;
    padding-bottom: 6px; border-bottom: 2px solid #2EC48A;
  }

  /* Tables */
  .tbl { width: 100%; border-collapse: collapse; font-size: 11px; }
  .tbl th {
    background: #f3faf6; color: #0d2015; font-weight: 700;
    text-align: left; padding: 10px 8px; border-bottom: 2px solid #2EC48A;
    text-transform: uppercase; letter-spacing: 0.6px; font-size: 10px;
  }
  .tbl th.r, .tbl td.r { text-align: right; }
  .tbl td {
    padding: 8px; border-bottom: 1px solid #eef2ef; color: #0d2015;
    vertical-align: top;
  }
  .tbl tbody tr:nth-child(even) td { background: #fafcfb; }
  .tbl tbody tr:hover td { background: #f3faf6; }
  .tbl .b { font-weight: 700; }
  .tbl .c-date { white-space: nowrap; color: #6b7280; }
  .tbl .c-in { color: #067a52; font-weight: 600; }
  .tbl .c-out { color: #b91c1c; font-weight: 600; }
  .tbl .pct { color: #b91c1c; font-size: 10px; }
  .tbl .imm-header td {
    background: #0d2015; color: #fff; font-weight: 700;
    padding: 8px 12px; letter-spacing: 0.4px; font-size: 11px;
  }
  .tbl .imm-subtotal td {
    background: #eaf7f0; font-weight: 700; border-top: 1px solid #2EC48A;
  }
  .tbl .empty-row { text-align: center; color: #9ca3af; font-style: italic; padding: 16px; }
  .tbl tfoot td {
    background: #f3faf6; font-weight: 800; padding: 12px 8px;
    border-top: 2px solid #0d2015; border-bottom: none;
  }

  /* Bloc solde à reverser — mis en avant */
  .tbl .solde-label { font-size: 12px; font-weight: 800; color: #0d2015; letter-spacing: 0.6px; }
  .tbl .solde-value { font-size: 16px; font-weight: 800; color: #067a52; }

  .note { font-size: 10px; color: #6b7280; margin: 8px 0 0; font-style: italic; }

  /* Pied de page */
  .footer {
    margin-top: 40px; padding-top: 16px;
    border-top: 1px solid #e5e7eb; text-align: center;
    font-size: 10px; color: #9ca3af;
  }

  /* Impression : évite les coupures moches */
  @media print {
    .doc { padding: 16px 20px; }
    .tbl { page-break-inside: auto; }
    .tbl tr { page-break-inside: avoid; }
    .imm-header, .imm-subtotal { page-break-after: avoid; }
    .section-title { page-break-after: avoid; }
  }
</style>

<div class="doc">
  <!-- 1. Header dégradé -->
  <div class="header">
    <div class="header-left">
      ${logo
        ? `<img src="${logo}" alt="${esc(company)}" class="header-logo"/>`
        : `<div class="header-brand">${esc(company)}</div>`}
    </div>
    <div class="header-right">
      <div class="name">${esc(company)}</div>
      ${tel ? `<div>Tél : ${esc(tel)}</div>` : ''}
      ${emailSoc ? `<div>${esc(emailSoc)}</div>` : ''}
    </div>
  </div>

  <!-- 2. Bloc titre + identité propriétaire -->
  <h1 class="doc-title">Décompte de reversement</h1>
  <p class="doc-subtitle">Émis le ${emisLe} · Période : ${periodeStr}</p>

  <div class="id-card">
    <div class="id-name">${esc(dd.proprietaire.nom)}</div>
    ${dd.proprietaire.numero ? `<div class="id-meta"><strong>Réf. :</strong> ${esc(dd.proprietaire.numero)}</div>` : ''}
    ${dd.proprietaire.email ? `<div class="id-meta"><strong>Email :</strong> ${esc(dd.proprietaire.email)}</div>` : ''}
    ${dd.proprietaire.telephone ? `<div class="id-meta"><strong>Téléphone :</strong> ${esc(dd.proprietaire.telephone)}</div>` : ''}
    ${dd.proprietaire.infos_bancaires ? `<div class="id-meta"><strong>Banque :</strong> ${esc(dd.proprietaire.infos_bancaires)}</div>` : ''}
  </div>

  <!-- 3. Détail des transactions -->
  <div class="section-title">Détail des transactions</div>
  <table class="tbl">
    <thead>
      <tr>
        <th style="width:11%">Date</th>
        <th style="width:12%">Unité</th>
        <th style="width:22%">Nature</th>
        <th style="width:15%">Période</th>
        <th class="r" style="width:10%">Encaissé</th>
        <th class="r" style="width:10%">Décaissé</th>
        <th class="r" style="width:10%">Commission</th>
        <th class="r" style="width:10%">Net</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">TOTAL GÉNÉRAL</td>
        <td class="r">${m(dd.total.encaisse ?? 0)}</td>
        <td class="r">${m(dd.total.decaisse ?? 0)}</td>
        <td class="r">${m(dd.total.commission ?? 0)}</td>
        <td class="r" style="color:#067a52">${m(dd.total.net ?? 0)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- 4. Résumé par bien -->
  ${resumeBlock}

  <!-- 5. TSIL -->
  ${tsilBlock}

  <!-- 6. Reversements -->
  ${revBlock}

  <!-- Pied de page -->
  <div class="footer">
    ${esc(company)} — Décompte généré le ${emisLe}
  </div>
</div>
</body></html>`;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bienPoste: { gap: 4, marginTop: 6 },
  bienJauge: { height: 6, borderRadius: 3, backgroundColor: 'rgba(22,33,27,0.07)', overflow: 'hidden' },
  bienJaugeRemplie: { height: '100%', borderRadius: 3 },
  bienJaugeIn: { backgroundColor: colors.primary },
  bienJaugeOut: { backgroundColor: colors.warning },
  bienJaugeNeutre: { backgroundColor: colors.primaryLight },
  bienBloc: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 4,
  },
  bienBlocTotal: { borderTopWidth: 2, borderTopColor: colors.primary },
  bienNom: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark, marginBottom: 2 },
  bienLigne: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  bienCle: { fontSize: fontSize.xs, color: colors.textMuted },
  // `flexShrink: 0` : c'est la garantie que le montant ne sera jamais rogné.
  bienValeur: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textDark, flexShrink: 0 },
  safe: { flex: 1, backgroundColor: colors.bgApp },
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },

  filtersBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgSoft,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  filterBtnLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  clearBtnLabel: { fontSize: fontSize.xs, color: colors.danger, fontWeight: fontWeight.semibold },

  activeFiltersCard: { backgroundColor: colors.bgSoft, borderColor: 'transparent' },
  activeFiltersText: { fontSize: fontSize.xs, color: colors.textDark, marginBottom: 2 },
  activeFiltersLabel: { fontWeight: fontWeight.semibold, color: colors.textMuted },

  pdfRow: { flexDirection: 'row', gap: spacing.sm },
  pdfBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, gap: spacing.xs,
    backgroundColor: colors.bgSoft, borderRadius: radius.lg,
    flexDirection: 'column',
  },
  pdfBtnLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm,
  },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted, paddingVertical: spacing.md, fontStyle: 'italic' },

  tableHeader: {
    flexDirection: 'row', paddingVertical: spacing.xs,
    borderBottomWidth: 2, borderBottomColor: colors.primary, gap: 4,
  },
  tableRow: {
    flexDirection: 'row', paddingVertical: spacing.xs,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: 4,
  },
  th: { fontSize: 12, fontWeight: fontWeight.bold, color: colors.textDark, paddingRight: spacing.sm },
  td: { fontSize: 12, color: colors.textDark, paddingRight: spacing.sm },
  tdMuted: { color: colors.textMuted },
  tdIn: { color: '#067a52', fontWeight: fontWeight.semibold },
  tdOut: { color: '#b91c1c', fontWeight: fontWeight.semibold },
  tdNet: { fontWeight: fontWeight.bold },
  // Largeurs fixes — total ~870 px, donc scroll horizontal nécessaire sur mobile
  colDate: { width: 90 },
  colUnit: { width: 90 },
  colNat: { width: 180 },
  colPer: { width: 130 },
  colNum: { width: 130, textAlign: 'right' as const },
  // Tables TSIL / Reversements
  colLabel: { width: 260 },
  colMotif: { width: 220 },
  swipeHint: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  tsilNote: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 16,
  },

  totalRow: { borderTopWidth: 2, borderTopColor: colors.textDark, borderBottomWidth: 0, paddingTop: spacing.sm, marginTop: spacing.xs },
  totalLabel: { fontWeight: fontWeight.bold, color: colors.textDark },

  // Modals
  modalSafe: { flex: 1, backgroundColor: colors.bgApp },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark },
  modalBody: { padding: spacing.lg, gap: spacing.lg },
  modalLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  modalFooter: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhost: { backgroundColor: colors.bgSoft },
  modalBtnGhostLabel: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },
  modalBtnPrimary: { backgroundColor: colors.primary },
  modalBtnPrimaryLabel: { fontSize: fontSize.sm, color: colors.textInverse, fontWeight: fontWeight.bold },

  // === Popup Export — nouvelle version ===
  exportHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.bgCard,
  },
  exportKicker: {
    fontSize: 10, fontWeight: fontWeight.bold,
    color: colors.primary, letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 4,
  },
  exportTitle: {
    fontSize: fontSize.xl, fontWeight: fontWeight.bold,
    color: colors.textDark, lineHeight: 26,
  },
  exportSub: {
    fontSize: fontSize.xs, color: colors.textMuted,
    marginTop: spacing.xs, lineHeight: 18,
  },
  exportClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  exportBody: {
    padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'],
  },
  exportSection: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  exportSectionHead: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  exportSectionTitle: {
    flex: 1,
    fontSize: fontSize.sm, fontWeight: fontWeight.bold,
    color: colors.textDark, letterSpacing: 0.3,
  },
  exportSectionCount: {
    fontSize: 10, fontWeight: fontWeight.bold,
    color: colors.primary,
    backgroundColor: colors.bgSoft,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.pill,
  },

  // Master row "Tous les biens"
  allBiensRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
    backgroundColor: colors.bgCard,
  },
  allBiensRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.bgSoft,
  },
  allBiensLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark,
  },
  allBiensSub: {
    fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2,
  },

  // Bloc immeuble
  immBlock: {
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  immHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSoft,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  immName: {
    fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark,
  },
  immMeta: {
    fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2,
  },
  uniteList: {
    backgroundColor: colors.bgCard,
  },
  uniteRowFlat: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  uniteRefText: {
    flex: 1,
    fontSize: fontSize.xs, color: colors.textDark, fontWeight: fontWeight.semibold,
  },

  dateRow: { flexDirection: 'row', gap: spacing.sm },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  quickBtn: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    borderRadius: radius.pill, backgroundColor: colors.bgSoft,
  },
  quickBtnLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },

  selectField: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md,
    backgroundColor: colors.bgCard,
  },
  selectFieldText: { flex: 1, fontSize: fontSize.sm, color: colors.textDark },
  selectFieldPlaceholder: { color: colors.textMuted },

  uniteRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  uniteRowActive: { backgroundColor: colors.bgSoft },
  checkbox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  uniteLabel: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: fontWeight.semibold },
  uniteImm: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});
