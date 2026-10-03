/**
 * Bandeau RDV sur l'accueil locataire : affiche tous les RDV à venir où le
 * locataire est invité (client_id = lui). Les RDV passés sont filtrés côté
 * backend, donc il suffit de masquer ceux que l'utilisateur a déjà ignorés.
 *
 * Le dismiss est persisté dans AsyncStorage par RDV id. Quand le RDV est
 * passé (et donc disparu de la liste backend), son entrée dismiss devient
 * inutile mais n'a pas d'effet — bénin.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLocataireUpcomingRdv } from '../hooks/locataire';
import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

const STORAGE_KEY = 'locataire:dismissed_rdv_ids';
const MOIS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

export function UpcomingRdvBanner() {
  const { data } = useLocataireUpcomingRdv();
  const [dismissed, setDismissed] = useState<Set<number> | null>(null);

  // Charge la liste des dismissés depuis le storage au mount
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      try {
        const arr = raw ? (JSON.parse(raw) as number[]) : [];
        setDismissed(new Set(arr));
      } catch {
        setDismissed(new Set());
      }
    });
    return () => { cancelled = true; };
  }, []);

  const onDismiss = (id: number) => {
    setDismissed((prev) => {
      const next = new Set(prev ?? []);
      next.add(id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
  };

  if (!data || dismissed === null) return null;
  const visible = data.filter((r) => !dismissed.has(r.id));
  if (visible.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {visible.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.iconWrap}>
            <Calendar size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title} numberOfLines={1}>{r.objet}</Text>
            <Text style={styles.when}>{formatDate(r.date_rdv)} à {r.heure_rdv}</Text>
            {r.adresse ? (
              <Text style={styles.where} numberOfLines={1}>📍 {r.adresse}</Text>
            ) : null}
          </View>
          <Pressable onPress={() => onDismiss(r.id)} hitSlop={10} style={styles.closeBtn}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, marginTop: -spacing.md, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.primary + '33',
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textDark },
  when: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
  where: { fontSize: fontSize.xs, color: colors.textMuted },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.bgSoft,
    alignItems: 'center', justifyContent: 'center',
  },
});
