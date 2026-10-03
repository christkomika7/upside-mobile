/**
 * Échelle d'espacement, rayons, typographie et ombres.
 *
 * Refonte « forêt » : rayons plus généreux et ombres nettement plus diffuses,
 * pour des cartes qui semblent posées sur le fond plutôt que découpées dedans.
 * Les CLÉS existantes sont conservées — seules leurs valeurs évoluent — afin
 * que les écrans déjà écrits adoptent la nouvelle allure sans modification.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  '2xl': 28,
  card: 24,   // rayon de référence des cartes
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Ombres — larges, très peu opaques, teintées de vert plutôt que de noir pur :
 * une ombre neutre sur un fond tiède grise l'ensemble et ternit les blancs.
 */
export const shadow = {
  card: {
    shadowColor: '#313A39',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  cardHeavy: {
    shadowColor: '#313A39',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 28,
    elevation: 6,
  },
  // Bouton circulaire (action principale d'une carte) — ombre teal de marque.
  action: {
    shadowColor: '#046A63',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
