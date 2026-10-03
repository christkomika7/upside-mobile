/**
 * Applique ULM Grotesk à TOUT le texte de l'app, sans toucher un seul écran.
 *
 * Deux plateformes, deux mécaniques :
 *
 *  • NATIF (iOS/Android) — `Text`/`TextInput` sont des `forwardRef` : on
 *    intercepte leur `render` et, à partir du `fontWeight` du style, on injecte
 *    la bonne graisse ULM Grotesk comme `fontFamily`. Le poids étant porté par
 *    le fichier de police, on remet `fontWeight` à `normal` pour éviter un
 *    faux-bold synthétisé par-dessus.
 *
 *  • WEB (react-native-web) — `Text` est un simple function component sans
 *    `render` patchable. On enregistre alors ULM Grotesk comme UNE famille à
 *    5 graisses via `@font-face`, puis on force `font-family` sur tout le sous-
 *    arbre React (`#root *`) avec une spécificité qui l'emporte sur les classes
 *    atomiques de RNW. Le `font-weight` déjà posé par RNW sélectionne la graisse.
 *
 * Effet de bord au premier import : appeler UNE fois, très tôt (App.tsx).
 */
import { Platform, StyleSheet, Text, TextInput } from 'react-native';
import { Asset } from 'expo-asset';

import { fontFamilyForWeight } from './fonts';

let applied = false;

const FALLBACK = '-apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// ── Natif ────────────────────────────────────────────────────────────────────
function patchNative(Component: any) {
  const original = Component && Component.render;
  if (typeof original !== 'function') return;

  const patched = function patched(this: unknown, ...args: unknown[]) {
    const element = original.apply(this, args);
    // Increvable : si quoi que ce soit échoue, on rend le texte d'origine
    // (police système) plutôt que de faire planter l'app au démarrage.
    try {
      if (!element || !element.props) return element;
      const flat = StyleSheet.flatten(element.props.style) || {};
      const fontFamily = fontFamilyForWeight(flat.fontWeight as never);
      return {
        ...element,
        props: {
          ...element.props,
          style: [{ fontFamily }, element.props.style, { fontWeight: 'normal' }],
        },
      };
    } catch {
      return element;
    }
  };

  // La réaffectation de `render` peut échouer selon le build (propriété non
  // configurable) : on l'entoure pour ne jamais bloquer le démarrage.
  try {
    Component.render = patched;
  } catch {
    /* on garde le rendu natif d'origine */
  }
}

// ── Web ──────────────────────────────────────────────────────────────────────
function injectWebCss() {
  if (typeof document === 'undefined') return;

  const weights: Array<[number, number]> = [
    [300, require('../../assets/fonts/UlmGrotesk-Light.otf')],
    [400, require('../../assets/fonts/UlmGrotesk-Regular.otf')],
    [500, require('../../assets/fonts/UlmGrotesk-Medium.otf')],
    [700, require('../../assets/fonts/UlmGrotesk-Bold.otf')],
    [800, require('../../assets/fonts/UlmGrotesk-Extrabold.otf')],
  ];

  const faces = weights
    .map(([weight, mod]) => {
      const uri = Asset.fromModule(mod).uri;
      return `@font-face{font-family:"Ulm Grotesk";src:url("${uri}") format("opentype");font-weight:${weight};font-style:normal;font-display:swap;}`;
    })
    .join('\n');

  const override = `#root, #root * { font-family: "Ulm Grotesk", ${FALLBACK} !important; }`;

  const style = document.createElement('style');
  style.setAttribute('data-ulm-grotesk', 'true');
  style.textContent = `${faces}\n${override}`;
  document.head.appendChild(style);
}

export function applyGlobalFont() {
  if (applied) return;
  applied = true;
  try {
    if (Platform.OS === 'web') {
      injectWebCss();
    } else {
      patchNative(Text);
      patchNative(TextInput);
    }
  } catch {
    /* jamais bloquer le démarrage pour une question de police */
  }
}
