/**
 * Hooks de fetch pour l'espace Locataire (TanStack Query).
 *
 * Convention de query keys :
 *   ['locataire','profile']
 *   ['locataire','bail']
 *   ['locataire','bien']
 *   ['locataire','factures']
 *   ['locataire','factures', id]
 *   ['locataire','interventions']
 *   ['locataire','interventions', id]
 *
 * Les events WebSocket invalideront ces keys quand un changement survient
 * côté ERP (cf. Phase 2.10 — WS hookup).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../api/client';
import type {
  Annonce,
  AvailableUnit,
  BailsHistory,
  BienPhoto,
  EdlDetail,
  EdlSummary,
  FactureDetail,
  FactureSummary,
  InterventionCreatePayload,
  InterventionDetail,
  InterventionSummary,
  LocataireBail,
  LocataireBien,
  LocataireProfile,
  LocataireUpcomingRdv,
  ProchaineEcheance,
} from '../types/api';

export const QK_LOCATAIRE = ['locataire'] as const;

export function useLocataireProfile() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'profile'],
    queryFn: () => api.get<LocataireProfile>('/mobile/locataire/profile'),
  });
}

export function useLocataireBail() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'bail'],
    queryFn: () => api.get<LocataireBail>('/mobile/locataire/bail'),
  });
}

export function useLocataireBien() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'bien'],
    queryFn: () => api.get<LocataireBien>('/mobile/locataire/bien'),
  });
}

export function useAvailableUnits() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'units', 'available'],
    queryFn: () => api.get<AvailableUnit[]>('/mobile/locataire/units/available'),
    // Le catalogue suit les locations saisies côté ERP — on rafraîchit toutes
    // les 60s tant que l'écran est visible.
    staleTime: 60_000,
  });
}

export function useLocataireBienPhotos() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'bien', 'photos'],
    queryFn: () => api.get<BienPhoto[]>('/mobile/locataire/bien/photos'),
  });
}

export function useLocataireBails() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'bails'],
    queryFn: () => api.get<BailsHistory>('/mobile/locataire/bails'),
  });
}

export function useProchaineEcheance() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'prochaine-echeance'],
    queryFn: () => api.get<ProchaineEcheance>('/mobile/locataire/prochaine-echeance'),
  });
}

export function useLocataireUpcomingRdv() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'rendez-vous'],
    queryFn: () => api.get<LocataireUpcomingRdv[]>('/mobile/locataire/rendez-vous'),
  });
}

export function useLocataireEdls() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'etats-lieux'],
    queryFn: () => api.get<EdlSummary[]>('/mobile/locataire/etats-lieux'),
  });
}

export function useLocataireEdl(id: number | null) {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'etats-lieux', id],
    queryFn: () => api.get<EdlDetail>(`/mobile/locataire/etats-lieux/${id}`),
    enabled: id != null,
  });
}

export function useBailDocumentAvailable(locationId: number | null | undefined) {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'bails', locationId, 'document', 'check'],
    queryFn: () => api.get<{ available: boolean }>(`/mobile/locataire/bails/${locationId}/document/check`),
    enabled: locationId != null,
  });
}

export function useEdlDocumentAvailable(edlId: number | null | undefined) {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'etats-lieux', edlId, 'document', 'check'],
    queryFn: () => api.get<{ available: boolean }>(`/mobile/locataire/etats-lieux/${edlId}/document/check`),
    enabled: edlId != null,
  });
}

// useAddEdlObservation retiré : l'app mobile locataire est en lecture seule
// sur les états des lieux. Les observations sont saisies par l'agence.

export function useLocataireFactures() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'factures'],
    queryFn: () => api.get<FactureSummary[]>('/mobile/locataire/factures'),
  });
}

export function useLocataireFacture(id: number | null) {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'factures', id],
    queryFn: () => api.get<FactureDetail>(`/mobile/locataire/factures/${id}`),
    enabled: id != null,
  });
}

export function useLocataireInterventions() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'interventions'],
    queryFn: () => api.get<InterventionSummary[]>('/mobile/locataire/interventions'),
  });
}

export function useLocataireIntervention(id: number | null) {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'interventions', id],
    queryFn: () => api.get<InterventionDetail>(`/mobile/locataire/interventions/${id}`),
    enabled: id != null,
  });
}

export function useCreateIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterventionCreatePayload) =>
      api.post<InterventionDetail>('/mobile/locataire/interventions', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_LOCATAIRE, 'interventions'] });
    },
  });
}

// Annulation/suppression de sa propre demande — répercutée sur le logiciel web
// (soft-delete + event temps réel côté backend).
export function useCancelIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/mobile/locataire/interventions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_LOCATAIRE, 'interventions'] });
    },
  });
}

// Le locataire renseigne les disponibilités demandées par l'agence.
export interface DisponibilitesPayload {
  dispo_jours?: string;
  dispo_heures?: string;
  contact_nom?: string;
  contact_tel?: string;
}
export function useSetDisponibilites(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DisponibilitesPayload) =>
      api.post<InterventionDetail>(`/mobile/locataire/interventions/${id}/disponibilites`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_LOCATAIRE, 'interventions', id] });
      qc.invalidateQueries({ queryKey: [...QK_LOCATAIRE, 'interventions'] });
    },
  });
}

export function useLocataireInterventionMessages(id: number | null) {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'interventions', id, 'messages'],
    queryFn: () => api.get<import('../types/api').InterventionMessage[]>(`/mobile/locataire/interventions/${id}/messages`),
    enabled: id != null,
  });
}

export function usePostLocataireInterventionMessage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      api.post<import('../types/api').InterventionMessage>(`/mobile/locataire/interventions/${id}/messages`, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_LOCATAIRE, 'interventions', id, 'messages'] });
    },
  });
}

interface LocataireEdlSignCloturePayload {
  signataire: string;
  signature_data: string;
}

export function useSignClotureLocataireEdl(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LocataireEdlSignCloturePayload) =>
      api.post<{ id: number; statut: string; date_cloture: string | null }>(
        `/mobile/locataire/etats-lieux/${id}/sign-cloture`, data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_LOCATAIRE, 'etats-lieux'] });
    },
  });
}

// ── Annonces (bandeau accueil) ─────────────────────────────────────────────

export function useLocataireAnnonces() {
  return useQuery({
    queryKey: [...QK_LOCATAIRE, 'annonces'],
    queryFn: () => api.get<Annonce[]>('/mobile/locataire/annonces'),
    staleTime: 30_000,
  });
}

export function useDismissAnnonce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (annonceId: number) =>
      api.post(`/mobile/locataire/annonces/${annonceId}/dismiss`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_LOCATAIRE, 'annonces'] });
    },
  });
}
