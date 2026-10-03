/**
 * Helpers de formatage — équivalents `frontend/src/utils/format.ts`.
 *
 * Toujours travailler en XAF / fr-FR pour le MVP (devise unique côté ERP).
 */

const _intl = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function fmtMontant(value: number | null | undefined, currency: string = 'XAF'): string {
  if (value == null || Number.isNaN(value)) return `0 ${currency}`;
  return `${_intl.format(value)} ${currency}`;
}

/**
 * Montant abrégé pour les espaces contraints (tuiles d'en-tête, axes de
 * graphique) : « 14,7 M » plutôt que « 14 723 415 XAF ».
 *
 * Un montant complet y était tronqué par le milieu — « 14 723 41… » — ce qui
 * est pire que d'arrondir : le lecteur ne sait plus s'il manque un chiffre ou
 * six. L'ordre de grandeur, lui, reste juste.
 */
export function fmtMontantCourt(value: number | null | undefined, currency: string = 'XAF'): string {
  const v = value == null || Number.isNaN(value) ? 0 : value;
  const abs = Math.abs(v);
  const signe = v < 0 ? '−' : '';
  const dec = (n: number) => n.toFixed(n < 10 ? 1 : 0).replace('.', ',').replace(',0', '');
  if (abs >= 1_000_000_000) return `${signe}${dec(abs / 1_000_000_000)} Md ${currency}`;
  if (abs >= 1_000_000) return `${signe}${dec(abs / 1_000_000)} M ${currency}`;
  if (abs >= 10_000) return `${signe}${dec(abs / 1_000)} k ${currency}`;
  return `${signe}${_intl.format(abs)} ${currency}`;
}

/** ISO YYYY-MM-DD → format FR JJ/MM/AAAA (retourne '' pour valeur vide/invalide). */
export function isoToFr(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Format FR JJ/MM/AAAA → ISO YYYY-MM-DD (retourne '' si incomplet/invalide). */
export function frToIso(fr: string | null | undefined): string {
  if (!fr) return '';
  const m = fr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/** Applique le masque JJ/MM/AAAA à une saisie utilisateur (auto-insère les slashes). */
export function maskDateFr(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function fmtDateRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `il y a ${diffD}j`;
  return fmtDate(d);
}

/** Initiales pour avatar par défaut. "Jean Dupont" -> "JD". */
export function initials(prenom?: string | null, nom?: string | null): string {
  const p = (prenom || '').trim().charAt(0).toUpperCase();
  const n = (nom || '').trim().charAt(0).toUpperCase();
  return `${p}${n}` || '?';
}

/**
 * Format humain d'une durée en jours → "X années, Y mois, Z jours".
 *
 * Convention : on suppose mois = 30 jours, année = 365 jours (suffisant pour
 * l'affichage indicatif d'un reste de bail). Les composantes nulles sont omises.
 *
 * Exemples :
 *   fmtDuree(97)  → "3 mois et 7 jours"
 *   fmtDuree(800) → "2 ans, 2 mois et 10 jours"
 *   fmtDuree(30)  → "1 mois"
 *   fmtDuree(1)   → "1 jour"
 *   fmtDuree(0)   → "0 jour"
 */
export function fmtDuree(totalJours: number): string {
  if (!Number.isFinite(totalJours)) return '—';
  const j = Math.max(0, Math.floor(totalJours));
  if (j === 0) return '0 jour';

  const annees = Math.floor(j / 365);
  const restApresAnnees = j - annees * 365;
  const mois = Math.floor(restApresAnnees / 30);
  const jours = restApresAnnees - mois * 30;

  const parts: string[] = [];
  if (annees > 0) parts.push(`${annees} ${annees > 1 ? 'ans' : 'an'}`);
  if (mois > 0) parts.push(`${mois} mois`);
  if (jours > 0) parts.push(`${jours} ${jours > 1 ? 'jours' : 'jour'}`);

  // "A, B et C" — virgule entre les premières parties, "et" pour la dernière.
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} et ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}`;
}
