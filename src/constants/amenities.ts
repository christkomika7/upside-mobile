/**
 * Mapping commodités/aménités → icônes Lucide, identique au web
 * (frontend/src/constants/immeubles.ts pour les codes immeuble + une couche
 * label-based pour les commodités d'unité qui sont stockées en clair).
 */
import {
  ArrowUpDown, Bath, BedDouble, Building, Building2, Camera, Car, ChefHat,
  Cylinder, Droplet, Dumbbell, Fence, Flame, Flower2, Gamepad2, Grid3x3, Home,
  Key, Layers, Leaf, Lightbulb, Lock, Microwave, Package, Phone, Plug, Refrigerator,
  Sailboat, Shield, ShieldCheck, Shirt, Snowflake, Sofa, Sparkles, Sprout, Sun,
  Sunrise, Trash2, Trees, Trophy, Tv, Utensils, Video, WashingMachine, Waves,
  Wifi, Wind, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react-native';

// ── Aménités IMMEUBLE (stockées en codes) ─────────────────────────────────
// Identique à AMENITIES côté web.
export const BUILDING_AMENITY: Record<string, { label: string; icon: LucideIcon }> = {
  piscine:              { label: 'Piscine',                 icon: Waves },
  parking:              { label: 'Parking',                 icon: Car },
  parking_sous_sol:     { label: 'Parking sous-sol',        icon: Car },
  gardien:              { label: 'Gardien',                 icon: Shield },
  video_surveillance:   { label: 'Vidéo surveillance',      icon: Video },
  ascenseur:            { label: 'Ascenseur',               icon: ArrowUpDown },
  groupe_electrogene:   { label: 'Groupe électrogène',      icon: Zap },
  bache_eau:            { label: 'Bâche à eau',             icon: Droplet },
  salle_sport:          { label: 'Salle de sport',          icon: Dumbbell },
  jardin:               { label: 'Jardin',                  icon: Trees },
  tennis:               { label: 'Tennis',                  icon: Trophy },
  basket:               { label: 'Terrain de basket',       icon: Trophy },
  clim_centrale:        { label: 'Climatisation centrale',  icon: Snowflake },
  fibre:                { label: 'Fibre internet',          icon: Wifi },
  portail_electrique:   { label: 'Portail électrique',      icon: Lock },
  interphone:           { label: 'Interphone',              icon: Phone },
  securite_24:          { label: 'Sécurité 24h/24',         icon: ShieldCheck },
  salle_evenementielle: { label: 'Salle événementielle',    icon: Sparkles },
  aire_jeux:            { label: 'Aire de jeux enfants',    icon: Gamepad2 },
  local_technique:      { label: 'Local technique',         icon: Wrench },
  local_poubelle:       { label: 'Local poubelle',          icon: Trash2 },
  terrasse:             { label: 'Terrasse',                icon: Sun },
  rooftop:              { label: 'Rooftop',                 icon: Building2 },
  panneaux_solaires:    { label: 'Panneaux solaires',       icon: Sunrise },
  vue_mer:              { label: 'Vue mer',                 icon: Sailboat },
  vue_ville:            { label: 'Vue ville',               icon: Building },
  vue_vegetation:       { label: 'Vue végétation',          icon: Leaf },
};

// ── Commodités UNITÉ (stockées en labels) ────────────────────────────────
// Le web stocke ces commodités en clair (chaîne FR). On mappe label → icône
// pour avoir l'équivalent visuel.
const UNIT_LABEL_ICONS: Array<[RegExp, LucideIcon]> = [
  [/balcon/i, Sun],
  [/terrasse/i, Sun],
  [/buanderie/i, WashingMachine],
  [/cave/i, Package],
  [/chauffe[- ]eau/i, Flame],
  [/climatisation/i, Snowflake],
  [/cuisine.*am[ée]ricaine/i, ChefHat],
  [/cuisine.*[ée]quip[ée]e/i, Utensils],
  [/coin cuisine/i, Utensils],
  [/dressing/i, Shirt],
  [/wc.*invit/i, Bath],
  [/salle.*bain/i, Bath],
  [/sdb/i, Bath],
  [/garage/i, Car],
  [/parking/i, Car],
  [/d[ée]pendance/i, Home],
  [/cour/i, Fence],
  [/jardin/i, Trees],
  [/four/i, Microwave],
  [/micro[- ]?onde/i, Microwave],
  [/r[ée]frig/i, Refrigerator],
  [/frigo/i, Refrigerator],
  [/m[ée]nag[ée]r/i, Sofa],
  [/meubl[ée]/i, Sofa],
  [/wifi/i, Wifi],
  [/internet/i, Wifi],
  [/t[eé]l[eé]vision/i, Tv],
  [/tv/i, Tv],
  [/lit/i, BedDouble],
  [/chambre/i, BedDouble],
  [/c[âa]blage.*r[eé]seau/i, Plug],
  [/cloison/i, Grid3x3],
  [/archives|r[ée]serve/i, Package],
  [/acc[eè]s.*pmr/i, Key],
  [/ascenseur/i, ArrowUpDown],
  [/chambre.*froide/i, Cylinder],
  [/enseigne/i, Lightbulb],
  [/v[eé]g[eé]tation|verdure/i, Sprout],
  [/chemin[ée]e/i, Flame],
  [/ventilation/i, Wind],
  [/v[ée]randa/i, Flower2],
  [/cam[eé]ra/i, Camera],
];

/**
 * Renvoie un libellé + icône pour une commodité, qu'elle soit fournie en code
 * (codes immeuble) ou en label brut (commodités unité). Pour les labels libres,
 * l'icône est devinée par regex et fallback sur `Layers` si rien ne match.
 */
export function resolveAmenity(value: string): { label: string; Icon: LucideIcon } {
  const key = (value || '').trim();
  if (!key) return { label: '—', Icon: Layers };

  // 1) Code immeuble ?
  const direct = BUILDING_AMENITY[key.toLowerCase()];
  if (direct) return { label: direct.label, Icon: direct.icon };

  // 2) Label texte → icône devinée
  for (const [re, Icon] of UNIT_LABEL_ICONS) {
    if (re.test(key)) return { label: key, Icon };
  }

  // 3) Fallback
  return { label: key, Icon: Layers };
}
