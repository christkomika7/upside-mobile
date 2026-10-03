/**
 * Helpers PDF spécifiques au web (React Native Web).
 *
 * Sur natif, `expo-print` et `expo-sharing` couvrent tous les cas ; sur web ils
 * retombent tous deux sur `window.print()`, ce qui empêche d'avoir 3 actions
 * distinctes (Voir / Imprimer / Télécharger). Ces helpers utilisent l'API DOM
 * directement pour restaurer les 3 comportements.
 *
 * À N'APPELER QUE lorsque `Platform.OS === 'web'`. Les fonctions supposent la
 * présence de `window` / `document` — elles crasheraient sur mobile natif.
 */

/** Ouvre le HTML dans un nouvel onglet — pour l'action « Voir » côté web. */
export function openHtmlInNewTab(html: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Injecte le HTML dans un iframe caché puis déclenche le dialogue d'impression
 * du navigateur sur ce contenu (et non sur la page courante).
 */
export function printHtmlViaIframeWeb(html: string): Promise<void> {
  return new Promise((resolve) => {
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
}

/**
 * Télécharge un vrai PDF (A4 portrait par défaut) en convertissant le HTML via
 * `html2pdf.js`. Le paquet est chargé dynamiquement — pas de coût si aucune
 * action de téléchargement web n'est jamais déclenchée dans la session.
 */
export async function downloadPdfWebFromHtml(
  html: string,
  filename: string,
  opts?: { orientation?: 'portrait' | 'landscape'; margin?: number },
): Promise<void> {
  const mod = await import('html2pdf.js');
  const html2pdf = (mod as any).default ?? mod;
  await html2pdf().set({
    margin: opts?.margin ?? 10,
    filename,
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: opts?.orientation ?? 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  }).from(html).save();
}
