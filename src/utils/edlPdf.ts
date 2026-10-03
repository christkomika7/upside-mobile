/**
 * Génération PDF d'un EDL via expo-print. Produit un HTML print-friendly puis
 * le convertit en PDF. Mutualisé entre collab et locataire (même rendu).
 *
 * Les signatures sont des JSON `string[]` (paths SVG) — on les embarque inline
 * via `<svg viewBox=…><path d=…/></svg>` qui est supporté nativement par
 * le moteur d'impression iOS/Android.
 *
 * Les photos sont des data URLs base64 directement injectées en `<img src=…>`.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { EdlDetail, EdlPiece } from '../types/api';

function esc(s: string | null | undefined): string {
  return (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return s;
  }
}

function signatureSvg(raw: string | null | undefined): string {
  if (!raw) return '<span style="color:#9ca3af;font-style:italic">Non signée</span>';
  let paths: string[];
  try {
    const v = JSON.parse(raw);
    paths = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return '<span style="color:#9ca3af;font-style:italic">Signature illisible</span>';
  }
  if (paths.length === 0) return '<span style="color:#9ca3af;font-style:italic">Vide</span>';
  const pathsHtml = paths
    .map((d) => `<path d="${esc(d)}" stroke="#0d2015" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
  return `<svg viewBox="0 0 400 150" width="100%" height="110" style="background:#fff;border:1px solid #e5e7eb;border-radius:6px">${pathsHtml}</svg>`;
}

function pieceHtml(p: EdlPiece): string {
  const photos = (p.photos ?? []).slice(0, 8);
  const photosHtml = photos.length
    ? `<div class="photos">${photos.map((src) => `<img src="${src}" />`).join('')}</div>`
    : '';
  const okBadge = p.ok === true
    ? '<span class="badge ok">OK</span>'
    : p.ok === false
      ? '<span class="badge ko">À corriger</span>'
      : '';
  const etat = p.etat ? `<div class="meta"><strong>État :</strong> ${esc(p.etat)}</div>` : '';
  const obs = p.observations
    ? `<div class="meta"><strong>Observations :</strong> ${esc(p.observations)}</div>`
    : '';
  return `
    <div class="piece">
      <div class="piece-head"><h3>${esc(p.nom)}</h3>${okBadge}</div>
      ${etat}
      ${obs}
      ${photosHtml}
    </div>
  `;
}

export function buildEdlHtml(edl: EdlDetail): string {
  return buildHtml(edl);
}

function buildHtml(edl: EdlDetail): string {
  const typeLabel = edl.type === 'SORTIE' ? 'État des lieux de sortie' : 'État des lieux d\'entrée';
  const pieces = (edl.pieces ?? []).map(pieceHtml).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    *{box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#0d2015;padding:24px;font-size:12px}
    .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #46928A;padding-bottom:10px;margin-bottom:18px}
    .head h1{margin:0;font-size:20px;color:#46928A}
    .head .meta{text-align:right;color:#6b7280;font-size:11px}
    .stamp{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase}
    .stamp.brouillon{background:#f3f4f6;color:#374151}
    .stamp.signe{background:#d1fae5;color:#047857}
    .stamp.cloture{background:#d1fae5;color:#047857}
    .stamp.a_signer{background:#fef3c7;color:#b45309}
    .info{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;background:#f9fafb;padding:10px;border-radius:6px;margin-bottom:16px}
    .info > div{font-size:11px}
    .info strong{color:#6b7280;font-weight:600;display:block;font-size:10px;text-transform:uppercase;margin-bottom:2px}
    h2{font-size:14px;color:#0d2015;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 10px}
    .piece{border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:10px;page-break-inside:avoid}
    .piece-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
    .piece h3{margin:0;font-size:13px;color:#0d2015}
    .badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
    .badge.ok{background:#d1fae5;color:#047857}
    .badge.ko{background:#fee2e2;color:#b91c1c}
    .meta{font-size:11px;color:#374151;margin:3px 0;line-height:1.4}
    .photos{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
    .photos img{width:72px;height:72px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb}
    .sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
    .sign-box{border:1px solid #e5e7eb;border-radius:6px;padding:8px;background:#fafafa}
    .sign-box .lbl{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:700;margin-bottom:4px;letter-spacing:0.5px}
    .sign-box .nom{font-size:11px;color:#0d2015;font-weight:600;margin-bottom:6px}
  </style></head><body>
  <div class="head">
    <div>
      <h1>${esc(typeLabel)}</h1>
      <div style="font-size:11px;color:#6b7280;margin-top:4px">${esc(edl.reference)}</div>
    </div>
    <div class="meta">
      <span class="stamp ${esc((edl.statut || '').toLowerCase())}">${esc(edl.statut)}</span>
    </div>
  </div>
  <div class="info">
    <div><strong>Unité</strong>${esc(edl.unite_nom)}</div>
    <div><strong>Locataire</strong>${esc(edl.locataire_nom)}</div>
    <div><strong>Date EDL</strong>${esc(fmtDate(edl.date_edl))}</div>
    <div><strong>Date signature</strong>${esc(fmtDate(edl.date_signature))}</div>
    ${edl.date_cloture ? `<div><strong>Date clôture</strong>${esc(fmtDate(edl.date_cloture))}</div><div></div>` : ''}
  </div>

  <h2>Pièces (${(edl.pieces ?? []).length})</h2>
  ${pieces}

  <h2>Signatures — Inspection initiale</h2>
  <div class="sign-grid">
    <div class="sign-box">
      <div class="lbl">Agent UPSide</div>
      <div class="nom">${esc(edl.signataire_agent ?? '—')}</div>
      ${signatureSvg(edl.signature_agent_data)}
    </div>
    <div class="sign-box">
      <div class="lbl">Locataire</div>
      <div class="nom">${esc(edl.signataire_locataire ?? '—')}</div>
      ${signatureSvg(edl.signature_locataire_data)}
    </div>
  </div>

  ${(edl.signature_agent_cloture_data || edl.signature_locataire_cloture_data) ? `
    <h2>Signatures — Clôture après travaux</h2>
    <div class="sign-grid">
      <div class="sign-box">
        <div class="lbl">Agent UPSide</div>
        <div class="nom">${esc(edl.signataire_agent_cloture ?? '—')}</div>
        ${signatureSvg(edl.signature_agent_cloture_data)}
      </div>
      <div class="sign-box">
        <div class="lbl">Locataire</div>
        <div class="nom">${esc(edl.signataire_locataire_cloture ?? '—')}</div>
        ${signatureSvg(edl.signature_locataire_cloture_data)}
      </div>
    </div>
  ` : ''}

  </body></html>`;
}

export async function generateEdlPdf(edl: EdlDetail): Promise<string | null> {
  const html = buildHtml(edl);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const target = `${FileSystem.cacheDirectory}edl-${edl.reference ?? edl.id}.pdf`;
  try {
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  } catch {
    return uri;
  }
}

export async function printEdl(edl: EdlDetail): Promise<void> {
  const html = buildHtml(edl);
  await Print.printAsync({ html });
}

export async function shareEdlPdf(edl: EdlDetail): Promise<void> {
  const uri = await generateEdlPdf(edl);
  if (!uri) return;
  const available = await Sharing.isAvailableAsync();
  if (!available) return;
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `EDL ${edl.reference ?? ''}`,
  });
}
