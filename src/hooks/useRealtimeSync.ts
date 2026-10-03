/**
 * Connexion WebSocket persistante au backend pour la sync temps réel.
 *
 * À chaque event reçu, on invalide les query keys correspondantes via TanStack
 * Query — l'écran courant se refetch automatiquement.
 *
 * Cycle de vie :
 *   - Connect au mount (si user connecté)
 *   - Reconnect avec backoff exponentiel sur fermeture inattendue
 *   - Disconnect propre au unmount / logout
 *   - Heartbeat ping → pong toutes les 30s
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { API_PREFIX, WS_URL } from '../api/client';
import { useAuth } from '../auth/store';
import { getAccessToken } from '../auth/tokenStorage';
import type { WsEvent } from '../types/api';
import { QK_COLLAB } from './collaborateur';
import { QK_LOCATAIRE } from './locataire';
import { QK_PROPRIO } from './proprietaire';


/** Mapping event_type → query keys à invalider. */
const EVENT_INVALIDATION: Record<string, ReadonlyArray<ReadonlyArray<unknown>>> = {
  // Factures (locataire ET propriétaire) + prochaine échéance locataire
  'facture.created':  [[...QK_LOCATAIRE, 'factures'], [...QK_LOCATAIRE, 'prochaine-echeance'], [...QK_PROPRIO, 'factures']],
  'facture.updated':  [[...QK_LOCATAIRE, 'factures'], [...QK_LOCATAIRE, 'prochaine-echeance'], [...QK_PROPRIO, 'factures']],
  'facture.paid':     [[...QK_LOCATAIRE, 'factures'], [...QK_LOCATAIRE, 'prochaine-echeance'], [...QK_PROPRIO, 'factures']],
  'facture.deleted':  [[...QK_LOCATAIRE, 'factures'], [...QK_LOCATAIRE, 'prochaine-echeance'], [...QK_PROPRIO, 'factures']],
  // Locations — impactent aussi la prochaine échéance (mois loyer changent)
  'location.created': [[...QK_LOCATAIRE, 'bail'], [...QK_LOCATAIRE, 'bien'], [...QK_LOCATAIRE, 'prochaine-echeance'], [...QK_PROPRIO, 'biens']],
  'location.updated': [[...QK_LOCATAIRE, 'bail'], [...QK_LOCATAIRE, 'bien'], [...QK_LOCATAIRE, 'prochaine-echeance'], [...QK_PROPRIO, 'biens']],
  'location.ended':   [[...QK_LOCATAIRE, 'bail'], [...QK_LOCATAIRE, 'prochaine-echeance'], [...QK_PROPRIO, 'biens']],
  // Interventions (locataire ET propriétaire) — création / màj / suppression / restauration
  'intervention.created':         [[...QK_LOCATAIRE, 'interventions'], [...QK_PROPRIO, 'interventions']],
  'intervention.updated':         [[...QK_LOCATAIRE, 'interventions'], [...QK_PROPRIO, 'interventions']],
  'intervention.deleted':         [[...QK_LOCATAIRE, 'interventions'], [...QK_PROPRIO, 'interventions']],
  'intervention.restored':        [[...QK_LOCATAIRE, 'interventions'], [...QK_PROPRIO, 'interventions']],
  'intervention.assigned':        [[...QK_LOCATAIRE, 'interventions'], [...QK_PROPRIO, 'interventions']],
  'intervention.status_changed':  [[...QK_LOCATAIRE, 'interventions'], [...QK_PROPRIO, 'interventions'], [...QK_COLLAB, 'interventions']],
  'intervention.message':         [[...QK_LOCATAIRE, 'interventions'], [...QK_COLLAB, 'interventions']],
  // Workflow validation coût propriétaire
  'intervention.cout_validation_requested': [[...QK_PROPRIO, 'cout-en-validation'], [...QK_PROPRIO, 'interventions']],
  'intervention.cout_validated':            [[...QK_PROPRIO, 'cout-en-validation'], [...QK_PROPRIO, 'interventions']],
  'intervention.cout_refused':              [[...QK_PROPRIO, 'cout-en-validation'], [...QK_PROPRIO, 'interventions']],
  // Annonces (agence → locataire)
  'annonce.created':              [[...QK_LOCATAIRE, 'annonces']],
  'annonce.deleted':              [[...QK_LOCATAIRE, 'annonces']],
  // RDV (collaborateur + locataire concerné)
  'rdv.created':                  [[...QK_COLLAB, 'rdv'], [...QK_LOCATAIRE, 'rendez-vous']],
  'rdv.updated':                  [[...QK_COLLAB, 'rdv'], [...QK_LOCATAIRE, 'rendez-vous']],
  // Unités (catalogue collaborateur) — invalide liste ET détail unitaire
  'unite.created':                [[...QK_COLLAB, 'catalogue']],
  'unite.updated':                [[...QK_COLLAB, 'catalogue']],
  'unite.deleted':                [[...QK_COLLAB, 'catalogue']],
  // États des lieux — collab (édition) + locataire (lecture seule)
  'edl.created':                  [[...QK_COLLAB, 'edl'], [...QK_LOCATAIRE, 'etats-lieux']],
  'edl.updated':                  [[...QK_COLLAB, 'edl'], [...QK_LOCATAIRE, 'etats-lieux']],
  'edl.signed':                   [[...QK_COLLAB, 'edl'], [...QK_LOCATAIRE, 'etats-lieux']],
  // Immeubles — impact biens propriétaire + catalogue collab + bien locataire
  'immeuble.created':             [[...QK_PROPRIO, 'biens'], [...QK_COLLAB, 'catalogue'], [...QK_LOCATAIRE, 'bien']],
  'immeuble.updated':             [[...QK_PROPRIO, 'biens'], [...QK_COLLAB, 'catalogue'], [...QK_LOCATAIRE, 'bien']],
  'immeuble.deleted':             [[...QK_PROPRIO, 'biens'], [...QK_COLLAB, 'catalogue'], [...QK_LOCATAIRE, 'bien']],
  // Clients — impact profil locataire + noms dénormalisés (bail, factures)
  'client.updated':               [[...QK_LOCATAIRE, 'profile'], [...QK_LOCATAIRE, 'bail'], [...QK_LOCATAIRE, 'factures'], [...QK_LOCATAIRE, 'bien']],
  'client.deleted':               [[...QK_LOCATAIRE, 'profile'], [...QK_LOCATAIRE, 'bail']],
  // Propriétaires — impact profil et décompte
  'proprietaire.updated':         [[...QK_PROPRIO, 'profile'], [...QK_PROPRIO, 'decompte'], [...QK_PROPRIO, 'biens']],
  'proprietaire.deleted':         [[...QK_PROPRIO, 'profile']],
  // Fournisseurs — impact intervenant_nom sur interventions
  'fournisseur.updated':          [[...QK_LOCATAIRE, 'interventions'], [...QK_PROPRIO, 'interventions'], [...QK_COLLAB, 'interventions']],
  'fournisseur.deleted':          [[...QK_LOCATAIRE, 'interventions'], [...QK_PROPRIO, 'interventions'], [...QK_COLLAB, 'interventions']],
};


/**
 * À monter une fois dans `RootNavigator` quand le user est connecté.
 * Le hook ouvre une seule connexion WS et la maintient ouverte.
 */
export function useRealtimeSync() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedByUs = useRef(false);

  useEffect(() => {
    if (!user) return;

    closedByUs.current = false;
    let cancelled = false;

    const cleanup = () => {
      if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
      if (wsRef.current) {
        closedByUs.current = true;
        try { wsRef.current.close(1000, 'unmount'); } catch { /* noop */ }
        wsRef.current = null;
      }
    };

    const connect = async () => {
      if (cancelled) return;
      const token = await getAccessToken();
      if (!token) return;

      const url = `${WS_URL}${API_PREFIX}/mobile/ws?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts.current = 0;
        // Heartbeat — keep socket alive et évite le timeout serveur (120s).
        pingTimer.current = setInterval(() => {
          try { ws.send('ping'); } catch { /* noop */ }
        }, 30_000);
      };

      ws.onmessage = (evt) => {
        const raw = typeof evt.data === 'string' ? evt.data : '';
        if (raw === 'pong') return;
        try {
          const message = JSON.parse(raw) as WsEvent;
          handleEvent(message, qc);
        } catch {
          // Ignorer les messages non-JSON
        }
      };

      ws.onerror = () => { /* géré par onclose */ };

      ws.onclose = (e) => {
        if (pingTimer.current) { clearInterval(pingTimer.current); pingTimer.current = null; }
        if (closedByUs.current || cancelled) return;
        // 4401 = token invalide → on laisse le client API refresh sur le prochain call
        // et le store auth basculera vers Auth si nécessaire. Ne pas reconnecter en boucle.
        if (e.code === 4401) return;

        // Backoff exponentiel borné à 30s
        const attempt = reconnectAttempts.current + 1;
        reconnectAttempts.current = attempt;
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
        reconnectTimer.current = setTimeout(connect, delay);
      };
    };

    connect();
    return () => { cancelled = true; cleanup(); };
  }, [user, qc]);
}


function handleEvent(evt: WsEvent, qc: ReturnType<typeof useQueryClient>): void {
  const keys = EVENT_INVALIDATION[evt.type];
  if (!keys) return;
  for (const key of keys) {
    qc.invalidateQueries({ queryKey: [...key] });
  }
}
