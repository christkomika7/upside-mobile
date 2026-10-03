/**
 * Palette UPSide — alignée sur le site vitrine 2026.
 *
 * Direction : la charte du nouveau site upside-gabon.com, à l'identique.
 * Vert UPSIDE #00887F, anthracite #313A39, fond sable #F4EFE8, touches de
 * marron doux #CFB695. Fini le « vert forêt » : l'app doit donner exactement la
 * même sensation que le site — mêmes couleurs, mêmes contrastes.
 *
 * IMPORTANT — toutes les CLÉS historiques sont conservées : seules leurs
 * valeurs changent. Les écrans qui importent `colors.primary`, `colors.bgApp`
 * etc. adoptent la nouvelle identité sans une seule modification.
 *
 * Source unique de vérité : aucune couleur en dur dans les écrans.
 */
export const colors = {
  // ── Brand : vert UPSIDE (charte site) ─────────────────────────────────────
  primary: '#00887F',       // vert UPSIDE — accent principal (valeurs, liens, icônes)
  primaryLight: '#7AD0CA',  // vert clair (survols, barres)
  primaryDark: '#046A63',   // vert profond — boutons pleins, nav active, cercles d'action
  // Aliases historiques — conservés pour ne rien casser.
  teal: '#046A63',
  tealLight: '#7AD0CA',

  // ── Fonds ─────────────────────────────────────────────────────────────────
  // TRANSPARENT : le décor sable est peint une seule fois par `AppBackground`,
  // derrière toute la navigation.
  bgApp: 'transparent',
  // Cartes blanches nettes posées sur le sable, comme sur le site. Un rien
  // translucide pour laisser le sable réchauffer les blancs.
  bgCard: 'rgba(255,255,255,0.92)',
  bgSoft: '#ECE5DA',        // encarts secondaires (sable foncé — astuce du jour)
  bgMuted: '#EFEAE1',       // encarts d'information neutres (sable clair)

  // ── Texte ─────────────────────────────────────────────────────────────────
  textDark: '#313A39',      // anthracite (ink)
  textMuted: '#5C6664',     // ink-soft
  textInverse: '#FFFFFF',

  // ── États ─────────────────────────────────────────────────────────────────
  danger: '#D64545',
  dangerSoft: '#FBE9E9',
  warning: '#C98A2E',
  warningSoft: '#FBF1DF',
  success: '#00887F',
  successSoft: '#DCEFED',
  info: '#3E6B8F',
  infoSoft: '#E4EDF5',

  // ── Bordures ──────────────────────────────────────────────────────────────
  border: '#E7E2D9',        // line (sable)
  borderLight: '#EFEAE1',   // line-soft

  // ── Pastilles d'état (factures, interventions, EDL) ───────────────────────
  statusEnAttente: '#C98A2E',
  statusPayee: '#00887F',
  statusRetard: '#D64545',
  statusBrouillon: '#A3AAA5',
} as const;

/**
 * Nuancier des graphiques — teals de marque + sable/marron doux.
 *
 * Ordonné pour que deux segments voisins d'un donut restent distinguables, y
 * compris en niveaux de gris. À utiliser via `chartPalette[i % length]`.
 */
export const chartPalette = [
  '#00887F',
  '#7AD0CA',
  '#046A63',
  '#CFB695',
  '#3FA9A0',
  '#B8E0DC',
] as const;

// Gradient de marque — conservé pour les en-têtes et cartes en dégradé.
export const gradients = {
  primary: ['#7AD0CA', '#00887F', '#046A63'] as [string, string, string],
  primaryHorizontal: ['#00887F', '#046A63'] as [string, string],
} as const;

export type ColorToken = keyof typeof colors;
