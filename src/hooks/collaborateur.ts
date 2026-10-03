/**
 * Hooks de fetch pour l'espace Collaborateur (TanStack Query).
 *
 * Tous les endpoints sont sous /mobile/collaborateur/* et restreints aux
 * users de type COLLABORATEUR (ou ADMIN).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../api/client';
import type {
  BienPhoto,
  CatalogueUnite,
  CatalogueUniteDetail,
  CollabInterventionDetail,
  CollabInterventionSummary,
  CollaborateurUserOption,
  EdlCreatePayload,
  EdlDetail,
  EdlSummary,
  EdlUpdatePayload,
  InterventionMessage,
  LocationForEdl,
  RendezVousCreatePayload,
  RendezVousMobile,
} from '../types/api';

export const QK_COLLAB = ['collaborateur'] as const;

export function useCollaborateurRendezVous(upcoming = true) {
  return useQuery({
    queryKey: [...QK_COLLAB, 'rdv', { upcoming }],
    queryFn: () =>
      api.get<RendezVousMobile[]>(`/mobile/collaborateur/rendez-vous?upcoming=${upcoming ? 'true' : 'false'}`),
  });
}

export function useCreateRendezVous() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RendezVousCreatePayload) =>
      api.post<RendezVousMobile>('/mobile/collaborateur/rendez-vous', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'rdv'] });
    },
  });
}

export function useDeleteRendezVous() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rdvId: number) =>
      api.delete<void>(`/mobile/collaborateur/rendez-vous/${rdvId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'rdv'] });
    },
  });
}

export function useCatalogue(search?: string) {
  return useQuery({
    queryKey: [...QK_COLLAB, 'catalogue', { search: search ?? '' }],
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return api.get<CatalogueUnite[]>(`/mobile/collaborateur/catalogue${qs}`);
    },
  });
}

export function useCatalogueUnite(id: number | null) {
  return useQuery({
    queryKey: [...QK_COLLAB, 'catalogue', 'unite', id],
    queryFn: () => api.get<CatalogueUniteDetail>(`/mobile/collaborateur/catalogue/${id}`),
    enabled: id != null,
  });
}

export function useCatalogueUnitePhotos(id: number | null) {
  return useQuery({
    queryKey: [...QK_COLLAB, 'catalogue', 'unite', id, 'photos'],
    queryFn: () => api.get<BienPhoto[]>(`/mobile/collaborateur/catalogue/${id}/photos`),
    enabled: id != null,
  });
}

export function useCollaborateurUsers() {
  return useQuery({
    queryKey: [...QK_COLLAB, 'users'],
    queryFn: () => api.get<CollaborateurUserOption[]>('/mobile/collaborateur/users'),
    staleTime: 5 * 60 * 1000,
  });
}

export interface RdvTiersOption {
  id: number;
  nom: string;
  email: string | null;
  telephone: string | null;
}

export function useCollaborateurTiers(type: 'LOCATAIRE' | 'PROPRIETAIRE', search?: string) {
  return useQuery({
    queryKey: [...QK_COLLAB, 'tiers', type, { search: search ?? '' }],
    queryFn: () => {
      const qs = new URLSearchParams({ type });
      if (search) qs.set('search', search);
      return api.get<RdvTiersOption[]>(`/mobile/collaborateur/tiers?${qs.toString()}`);
    },
    staleTime: 60_000,
  });
}

export function useCollabInterventions(open: boolean) {
  return useQuery({
    queryKey: [...QK_COLLAB, 'interventions', { open }],
    queryFn: () =>
      api.get<CollabInterventionSummary[]>(
        `/mobile/collaborateur/interventions?status=${open ? 'open' : 'closed'}`,
      ),
  });
}

export function useCollabIntervention(id: number | null) {
  return useQuery({
    queryKey: [...QK_COLLAB, 'interventions', 'detail', id],
    queryFn: () => api.get<CollabInterventionDetail>(`/mobile/collaborateur/interventions/${id}`),
    enabled: id != null,
  });
}

export interface CollabInterventionCreatePayload {
  location_id?: number;
  unite_id?: number;
  titre?: string;
  description: string;
  categorie?: string;
  priorite?: string;
  photos?: string[];
}

export function useCreateCollabIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CollabInterventionCreatePayload) =>
      api.post<CollabInterventionDetail>('/mobile/collaborateur/interventions', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'interventions'] });
    },
  });
}

export interface CollabDevisCreatePayload {
  lot: string;
  fournisseur_nom?: string;
  montant: number;
  reference?: string;
  commentaire?: string;
  fichier_nom?: string;
  fichier_mime?: string;
  fichier_taille?: number;
  fichier_data?: string;
}

export function useAddCollabDevis(interventionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CollabDevisCreatePayload) =>
      api.post(`/mobile/collaborateur/interventions/${interventionId}/devis`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'interventions', 'detail', interventionId] });
    },
  });
}

export function useSoumettreCollabDevis(interventionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lot: string) =>
      api.post(`/mobile/collaborateur/interventions/${interventionId}/devis/soumettre`, { lot }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'interventions', 'detail', interventionId] });
    },
  });
}

interface InterventionUpdate {
  statut?: string;
  priorite?: string;
  rapport?: string;
}

export function useUpdateCollabIntervention(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InterventionUpdate) =>
      api.put<CollabInterventionSummary>(`/mobile/collaborateur/interventions/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'interventions'] });
    },
  });
}

export function usePostCollabInterventionMessage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      api.post<InterventionMessage>(`/mobile/collaborateur/interventions/${id}/messages`, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'interventions', 'detail', id] });
    },
  });
}


// ── États des lieux (création terrain) ────────────────────────────────────


export function useCollabEdls(openOnly = false) {
  return useQuery({
    queryKey: [...QK_COLLAB, 'edl', { openOnly }],
    queryFn: () =>
      api.get<EdlSummary[]>(`/mobile/collaborateur/etats-lieux?open=${openOnly ? 'true' : 'false'}`),
  });
}

export function useCollabEdl(id: number | null) {
  return useQuery({
    queryKey: [...QK_COLLAB, 'edl', 'detail', id],
    queryFn: () => api.get<EdlDetail>(`/mobile/collaborateur/etats-lieux/${id}`),
    enabled: id != null,
  });
}

export function useCreateCollabEdl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EdlCreatePayload) => api.post<EdlDetail>('/mobile/collaborateur/etats-lieux', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'edl'] }),
  });
}

export function useUpdateCollabEdl(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EdlUpdatePayload) =>
      api.put<EdlDetail>(`/mobile/collaborateur/etats-lieux/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'edl'] });
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'edl', 'detail', id] });
    },
  });
}

export function useLocationsForEdl(enabled = true) {
  return useQuery({
    queryKey: [...QK_COLLAB, 'locations-for-edl'],
    queryFn: () => api.get<LocationForEdl[]>('/mobile/collaborateur/locations-for-edl'),
    enabled,
  });
}

interface EdlSignInitialPayload {
  signataire_agent: string;
  signataire_locataire: string;
  signature_agent_data: string;
  signature_locataire_data: string;
}

export function useSignInitialEdl(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EdlSignInitialPayload) =>
      api.post<EdlDetail>(`/mobile/collaborateur/etats-lieux/${id}/sign-initial`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'edl'] });
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'edl', 'detail', id] });
    },
  });
}

interface EdlSignCloturePayload {
  signataire: string;
  signature_data: string;
}

export function useSignClotureCollabEdl(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EdlSignCloturePayload) =>
      api.post<EdlDetail>(`/mobile/collaborateur/etats-lieux/${id}/sign-cloture`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'edl'] });
      qc.invalidateQueries({ queryKey: [...QK_COLLAB, 'edl', 'detail', id] });
    },
  });
}
