/**
 * Hooks de fetch pour l'espace Propriétaire (TanStack Query).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../api/client';
import type {
  DecompteBienRow,
  DemoProprietaireCandidate,
  ProprietaireBien,
  ProprietaireDecompte,
  ProprietaireDecompteDetail,
  ProprietaireDecompteGlobal,
  ProprietaireDevis,
  ProprietaireInterventionDetail,
  ProprietaireInterventionSummary,
  ProprietaireProfile,
  ProprietaireTransaction,
  ProprietaireUnite,
  FactureDetail,
  FactureSummary,
} from '../types/api';

export const QK_PROPRIO = ['proprietaire'] as const;

export function useProprietaireProfile() {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'profile'],
    queryFn: () => api.get<ProprietaireProfile>('/mobile/proprietaire/profile'),
  });
}

export function useProprietaireBiens() {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'biens'],
    queryFn: () => api.get<ProprietaireBien[]>('/mobile/proprietaire/biens'),
  });
}

export function useProprietaireFactures() {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'factures'],
    queryFn: () => api.get<FactureSummary[]>('/mobile/proprietaire/factures'),
    // Liste très dynamique côté ERP — on refetch systématiquement au retour
    // sur l'onglet plutôt que de servir un snapshot cache.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useProprietaireFacture(id: number | null) {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'factures', id],
    queryFn: () => api.get<FactureDetail>(`/mobile/proprietaire/factures/${id}`),
    enabled: id != null,
    // Facture peut être modifiée à tout moment côté ERP (design, montants,
    // paiements, etc.) — on force un fetch à chaque ouverture pour toujours
    // afficher la version courante et non un snapshot en cache.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useProprietaireInterventions() {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'interventions'],
    queryFn: () => api.get<ProprietaireInterventionSummary[]>('/mobile/proprietaire/interventions'),
  });
}

export function useProprietaireIntervention(id: number | null) {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'interventions', id],
    queryFn: () => api.get<ProprietaireInterventionDetail>(`/mobile/proprietaire/interventions/${id}`),
    enabled: id != null,
  });
}

export function useDevisEnValidation() {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'devis', 'en-validation'],
    queryFn: () => api.get<ProprietaireDevis[]>('/mobile/proprietaire/devis/en-validation'),
  });
}

export function useDecompte(year: number, month: number) {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'decompte', year, month],
    queryFn: () =>
      api.get<ProprietaireDecompte>(`/mobile/proprietaire/decompte?year=${year}&month=${month}`),
  });
}

/** Décompte cumulé à ce jour (KPIs instant T de l'écran Comptes). */
export function useDecompteGlobal() {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'decompte', 'global'],
    queryFn: () => api.get<ProprietaireDecompteGlobal>('/mobile/proprietaire/decompte/global'),
  });
}

export interface DecompteDetailFilters {
  date_from?: string;     // ISO YYYY-MM-DD
  date_to?: string;       // ISO YYYY-MM-DD
  unite_ids?: number[];   // multi-select
}

/** Décompte détaillé (structure web complète) — pour l'écran Transactions et le PDF. */
export function useDecompteDetail(filters: DecompteDetailFilters) {
  const params = new URLSearchParams();
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.unite_ids && filters.unite_ids.length > 0) {
    params.append('unite_ids', filters.unite_ids.join(','));
  }
  const qs = params.toString();
  return useQuery({
    queryKey: [...QK_PROPRIO, 'decompte', 'detail', filters],
    queryFn: () =>
      api.get<ProprietaireDecompteDetail>(
        `/mobile/proprietaire/decompte/detail${qs ? `?${qs}` : ''}`,
      ),
  });
}

/** Liste des unités du propriétaire (pour le multi-select). */
export function useProprietaireUnites() {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'unites'],
    queryFn: () => api.get<ProprietaireUnite[]>('/mobile/proprietaire/unites'),
    staleTime: 60_000,
  });
}

export function useValidateDevis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ devisId, note }: { devisId: number; note?: string }) =>
      api.post<ProprietaireDevis>(`/mobile/proprietaire/devis/${devisId}/validate`, { note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_PROPRIO, 'devis'] });
      qc.invalidateQueries({ queryKey: [...QK_PROPRIO, 'interventions'] });
    },
  });
}

export function useRefuseDevis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ devisId, note }: { devisId: number; note?: string }) =>
      api.post<ProprietaireDevis>(`/mobile/proprietaire/devis/${devisId}/refuse`, { note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_PROPRIO, 'devis'] });
      qc.invalidateQueries({ queryKey: [...QK_PROPRIO, 'interventions'] });
    },
  });
}

// ── Validation coût d'intervention ──────────────────────────────────────────

export function useCoutEnValidation() {
  return useQuery({
    queryKey: [...QK_PROPRIO, 'cout-en-validation'],
    queryFn: () =>
      api.get<ProprietaireInterventionSummary[]>('/mobile/proprietaire/interventions/cout-en-validation'),
    staleTime: 15_000,
  });
}

export function useValidateCout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interventionId: number) =>
      api.post<ProprietaireInterventionSummary>(
        `/mobile/proprietaire/interventions/${interventionId}/cout/validate`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_PROPRIO, 'cout-en-validation'] });
      qc.invalidateQueries({ queryKey: [...QK_PROPRIO, 'interventions'] });
    },
  });
}

export function useRefuseCout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ interventionId, note }: { interventionId: number; note: string }) =>
      api.post<ProprietaireInterventionSummary>(
        `/mobile/proprietaire/interventions/${interventionId}/cout/refuse`,
        { note },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...QK_PROPRIO, 'cout-en-validation'] });
      qc.invalidateQueries({ queryKey: [...QK_PROPRIO, 'interventions'] });
    },
  });
}

export interface TransactionsFilters {
  date_from?: string; // ISO YYYY-MM-DD
  date_to?: string;   // ISO YYYY-MM-DD
  unite_id?: number;
}

export function useTransactions(filters: TransactionsFilters) {
  const params = new URLSearchParams();
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.unite_id != null) params.append('unite_id', String(filters.unite_id));
  const qs = params.toString();
  return useQuery({
    queryKey: [...QK_PROPRIO, 'transactions', filters],
    queryFn: () =>
      api.get<ProprietaireTransaction[]>(`/mobile/proprietaire/transactions${qs ? `?${qs}` : ''}`),
  });
}

/** Mode démo ADMIN — liste des propriétaires "incarnables". */
export function useDemoCandidates(enabled: boolean) {
  return useQuery({
    queryKey: [...QK_PROPRIO, '_demo', 'candidates'],
    queryFn: () => api.get<DemoProprietaireCandidate[]>('/mobile/proprietaire/_demo/candidates'),
    enabled,
    staleTime: 60_000,
  });
}

// Re-export pour DecompteBienRow consommé ailleurs
export type { DecompteBienRow };
