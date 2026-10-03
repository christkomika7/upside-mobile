/**
 * Pad de signature au doigt. Capture les mouvements via PanResponder et trace
 * des paths SVG en temps réel.
 *
 * Sortie : `value` est un JSON-stringifié `string[]` où chaque élément est une
 * data path SVG (ex: "M 12 34 L 15 36 L 18 39"). Cela permet :
 *   - de re-rendre la signature plus tard (lecture seule),
 *   - de l'embarquer dans un PDF généré côté mobile via expo-print
 *     (HTML inline `<svg><path d="..."/></svg>`),
 *   - de la stocker en base sans dépendre d'une rasterisation.
 *
 * Le viewBox interne est 400×150 — le composant scale visuellement à la
 * largeur disponible (via aspectRatio).
 */
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fontSize, fontWeight, radius, spacing } from '../theme';

const VIEW_W = 400;
const VIEW_H = 150;

interface Props {
  value?: string | null;             // JSON `string[]` paths existant (édition / lecture)
  onChange?: (value: string) => void;
  disabled?: boolean;
  label?: string;
  /** Si true, le pad est en lecture seule (signature déjà capturée). */
  readonly?: boolean;
  /** Notification au parent quand l'utilisateur touche/lâche le pad. Sert au
   *  parent ScrollView pour désactiver son scroll natif et ne pas voler le
   *  geste de signature. */
  onSigningChange?: (active: boolean) => void;
}

function parsePaths(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function SignaturePad({ value, onChange, disabled, label, readonly, onSigningChange }: Props) {
  const [paths, setPaths] = useState<string[]>(() => parsePaths(value));
  const currentRef = useRef<string>('');
  const [, force] = useState(0);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: VIEW_W, h: VIEW_H });

  useEffect(() => {
    // Sync depuis l'extérieur quand `value` change (chargement initial).
    setPaths(parsePaths(value));
  }, [value]);

  // Convertit les coords écran en coords SVG (viewBox 400×150).
  const toSvg = (x: number, y: number) => {
    const sx = (x / Math.max(size.w, 1)) * VIEW_W;
    const sy = (y / Math.max(size.h, 1)) * VIEW_H;
    return { x: Math.round(sx * 10) / 10, y: Math.round(sy * 10) / 10 };
  };

  const responder = useRef(
    PanResponder.create({
      // Capture phase : on revendique le geste AVANT le ScrollView parent,
      // sinon le scroll vertical/horizontal du ScrollView intercepte les
      // mouvements du doigt et la signature est inutilisable.
      onStartShouldSetPanResponderCapture: () => !readonly && !disabled,
      onMoveShouldSetPanResponderCapture: () => !readonly && !disabled,
      onStartShouldSetPanResponder: () => !readonly && !disabled,
      onMoveShouldSetPanResponder: () => !readonly && !disabled,
      // Refuse de céder le geste à un autre responder (ex. ScrollView qui
      // tente de prendre la main au milieu d'un trait).
      onPanResponderTerminationRequest: () => false,
      // Android : empêche le natif de bloquer le geste.
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        onSigningChange?.(true);
        const { locationX, locationY } = e.nativeEvent;
        const { x, y } = toSvg(locationX, locationY);
        currentRef.current = `M ${x} ${y}`;
        force((n) => n + 1);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const { x, y } = toSvg(locationX, locationY);
        currentRef.current = `${currentRef.current} L ${x} ${y}`;
        force((n) => n + 1);
      },
      onPanResponderRelease: () => {
        onSigningChange?.(false);
        const completed = currentRef.current;
        currentRef.current = '';
        if (!completed) { force((n) => n + 1); return; }
        setPaths((prev) => {
          const next = [...prev, completed];
          onChange?.(JSON.stringify(next));
          return next;
        });
      },
      onPanResponderTerminate: () => {
        onSigningChange?.(false);
        currentRef.current = '';
        force((n) => n + 1);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ w: width, h: height });
  };

  const clear = () => {
    setPaths([]);
    onChange?.(JSON.stringify([]));
  };

  const hasContent = paths.length > 0 || currentRef.current.length > 0;

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        {...responder.panHandlers}
        onLayout={onLayout}
        style={[styles.pad, readonly && styles.padReadonly]}
      >
        <Svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={styles.svg} pointerEvents="none">
          {paths.map((d, i) => (
            <Path key={i} d={d} stroke={colors.textDark} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {currentRef.current ? (
            <Path d={currentRef.current} stroke={colors.textDark} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </Svg>
        {!hasContent && !readonly ? (
          <View pointerEvents="none" style={styles.placeholder}>
            <Text style={styles.placeholderLabel}>Signez ici ✍️</Text>
          </View>
        ) : null}
      </View>
      {!readonly ? (
        <View style={styles.actions}>
          <Pressable onPress={clear} disabled={!hasContent || disabled} style={[styles.clearBtn, (!hasContent || disabled) && { opacity: 0.4 }]}>
            <Text style={styles.clearLabel}>Effacer</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  pad: {
    aspectRatio: VIEW_W / VIEW_H,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.borderLight,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  padReadonly: { backgroundColor: colors.bgSoft },
  svg: { flex: 1 },
  placeholder: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  clearBtn: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  clearLabel: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.semibold },
});
