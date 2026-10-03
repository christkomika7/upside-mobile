/** Types des params de navigation — partagés par tous les navigators. */
import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
};

export type LocataireTabsParamList = {
  Accueil: undefined;
  Bail: undefined;
  Factures: undefined;
  Interventions: undefined;
  EtatsLieux: undefined;
  Profil: undefined;
};

export type LocataireStackParamList = {
  Tabs: NavigatorScreenParams<LocataireTabsParamList>;
  Bien: undefined;
  BailDetail: { bailId: number };
  FactureDetail: { factureId: number };
  Attestation: undefined;
  InterventionDetail: { interventionId: number };
  InterventionCreate: undefined;
  EdlList: undefined;
  EdlDetail: { edlId: number };
};

// ── Propriétaire ────────────────────────────────────────────────────────────

export type ProprietaireTabsParamList = {
  Decompte: undefined;
  Biens: undefined;
  Factures: undefined;
  Interventions: undefined;
  Profil: undefined;
};

export type ProprietaireStackParamList = {
  Tabs: NavigatorScreenParams<ProprietaireTabsParamList>;
  BienDetail: { bienId: number };
  FactureDetail: { factureId: number };
  InterventionDetail: { interventionId: number };
  DevisDecision: { devisId: number };
  Transactions: undefined;
};

// ── Collaborateur (commerciaux + techniciens) ───────────────────────────────

export type CollaborateurTabsParamList = {
  RendezVous: undefined;
  Catalogue: undefined;
  Interventions: undefined;
  EtatsLieux: undefined;
  Profil: undefined;
};

export type CollaborateurStackParamList = {
  Tabs: NavigatorScreenParams<CollaborateurTabsParamList>;
  RdvCreate: undefined;
  UniteDetail: { uniteId: number };
  InterventionDetail: { interventionId: number };
  InterventionCreate: undefined;
  EdlCreate: undefined;
  EdlEdit: { edlId: number };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Locataire: NavigatorScreenParams<LocataireStackParamList>;
  Proprietaire: NavigatorScreenParams<ProprietaireStackParamList>;
  Collaborateur: NavigatorScreenParams<CollaborateurStackParamList>;
};
