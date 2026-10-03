/**
 * Types miroir des schémas Pydantic backend mobile.
 *
 * Convention : un champ optionnel côté Python (`Optional[T] = None`) devient
 * `T | null` ici (et non `T | undefined`) — c'est ce que renvoie le JSON.
 */

// ── Auth ────────────────────────────────────────────────────────────────────

export type UserType = 'ADMIN' | 'COLLABORATEUR' | 'LOCATAIRE' | 'PROPRIETAIRE';

export interface MobileUser {
  id: number;
  email: string;
  prenom: string;
  nom: string;
  user_type: UserType;
  role: string;
  telephone: string | null;
  avatar: string | null;
  linked_locataire_id: number | null;
  linked_proprietaire_id: number | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  access_expires_in: number; // secondes
  refresh_expires_in: number; // secondes
  user: MobileUser;
}

export interface LoginPayload {
  email: string;
  password: string;
  device_platform?: 'ios' | 'android';
  device_name?: string;
  app_version?: string;
  os_version?: string;
  push_token?: string;
}

// ── Locataire ───────────────────────────────────────────────────────────────

export interface LocataireProfile {
  id: number;
  nom: string;
  type: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
  locations_actives: number;
}

export interface LocataireBail {
  id: number;
  reference: string | null;
  date_debut: string | null;
  date_fin: string | null;
  jours_restants: number | null;
  renouvellement_auto: boolean;
  periodicite: string;
  meuble: boolean;
  semi_meuble: boolean;
  loyer_ht: number;
  charges: number;
  charges_exceptionnelles: number;
  loyer_total: number;
  caution: number;
  statut: string;
  unite_id: number;
  unite_nom: string | null;
  today: string;
}

export interface LocataireImmeuble {
  id: number;
  nom: string | null;
  adresse: string | null;
  ville: string | null;
  quartier: string | null;
  amenities: string[];
}

export interface AvailableUnitPhoto {
  id: number;
  nom: string | null;
  mime: string | null;
  data: string; // data URL base64
}

export interface AvailableUnit {
  id: number;
  reference: string | null;
  nom: string;
  type: string;
  etage: string | null;
  surface: number | null;
  nombre_chambres: number;
  nombre_sdb: number;
  nb_parking: number;
  loyer: number;
  charges: number;
  caution: number;
  description: string | null;
  amenities: string[];
  immeuble: {
    id: number;
    nom: string | null;
    ville: string | null;
    quartier: string | null;
    adresse: string | null;
    amenities: string[];
  } | null;
  photos: AvailableUnitPhoto[];
}

export interface LocataireBien {
  id: number;
  reference: string | null;
  nom: string | null;
  type: string | null;
  surface: number | null;
  nombre_chambres: number | null;
  nombre_sdb: number | null;
  nb_parking: number;
  parking: boolean;
  etage: string | null;
  description: string | null;
  amenities: string[];
  immeuble: LocataireImmeuble | null;
}

export type FactureStatut = 'BROUILLON' | 'EN_ATTENTE' | 'PARTIELLEMENT_PAYEE' | 'PAYEE';

export interface FactureSummary {
  id: number;
  numero: string;
  statut: FactureStatut | string;
  date_emission: string | null;
  date_echeance: string | null;
  total_ht: number;
  tva_montant: number;
  total_ttc: number;
  montant_paye: number;
  solde_du: number;
  /** Cas multi-baux : permet de filtrer/grouper les factures par bien. */
  location_id?: number | null;
  unite_id?: number | null;
  unite_nom?: string | null;
}

export interface FactureLigne {
  designation: string;
  quantite: number;
  prix_unitaire: number;
  tva: number;
  total_ht: number;
}

export interface TaxBreakdown {
  nom: string;
  taux: number;
  sur_tva: boolean;
  montant: number;
}

export interface FactureDetail extends FactureSummary {
  lignes: FactureLigne[];
  taxes_breakdown?: TaxBreakdown[];
  notes: string | null;
}

export type InterventionStatut = 'EN_COURS' | 'BLOCAGE' | 'CLOTURE' | string;
export type InterventionPriorite = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export type InterventionPortee = 'LOGEMENT' | 'PARTIES_COMMUNES';

export interface InterventionSummary {
  id: number;
  reference: string | null;
  categorie: string | null;
  statut: InterventionStatut;
  priorite: InterventionPriorite | string;
  titre: string | null;
  unite_id: number | null;
  unite_nom: string | null;
  portee?: InterventionPortee | string;
  created_at: string | null;
}

export interface InterventionDetail extends InterventionSummary {
  description: string | null;
  dispo_jours: string | null;
  dispo_heures: string | null;
  contact_nom: string | null;
  contact_tel: string | null;
  dispo_demandee?: boolean;
  intervenant_nom: string | null;
  // `cout` n'est volontairement pas exposé côté locataire — seuls le
  // propriétaire et l'agence ont accès au coût d'une intervention.
  date_cloture: string | null;
  photos: string[];
  rapport: string | null;
}

export interface BienPhoto {
  id: number;
  nom: string | null;
  categorie: string;
  mime: string | null;
  ordre: number;
  data: string; // data URL "data:image/...;base64,..."
}

export interface BailsHistory {
  /** Premier bail actif (rétrocompat — pratique pour les KPIs accueil). */
  actuel: LocataireBail | null;
  /** Tous les baux actifs simultanés (cas locataire avec plusieurs logements). */
  actuels: LocataireBail[];
  passes: LocataireBail[];
}

// État des lieux
export type EdlType = 'ENTREE' | 'SORTIE';
export type EdlStatut = 'BROUILLON' | 'EN_COURS' | 'SIGNE' | string;

export interface EdlSummary {
  id: number;
  reference: string | null;
  type: EdlType | string;
  statut: EdlStatut;
  date_edl: string | null;
  date_signature: string | null;
  location_id: number | null;
  unite_nom: string | null;
  locataire_nom?: string | null;
  signataire_agent: string | null;
  signataire_locataire: string | null;
  delai_chauffe_jours_restants?: number | null;
}

export interface EdlObservation {
  id?: string;
  auteur?: string;
  date?: string;
  texte: string;
  photos?: string[];
}

export interface EdlPiece {
  nom: string;
  etat?: string | null;
  observations?: string | null;
  /** Conformité après travaux (workflow clôture) : null = non évalué, true = OK, false = à corriger. */
  ok?: boolean | null;
  elements?: Array<{ nom?: string; etat?: string; commentaire?: string }>;
  photos?: string[];
  videos?: string[];
  observations_locataire?: EdlObservation[];
}

export interface EdlDetail extends EdlSummary {
  pieces: EdlPiece[];
  interventions: Array<{ libelle: string; fait: boolean }>;
  notes: string | null;
  signature_agent_data?: string | null;
  signature_locataire_data?: string | null;
  // Workflow clôture (après travaux)
  date_cloture?: string | null;
  signature_agent_cloture_data?: string | null;
  signature_locataire_cloture_data?: string | null;
  signataire_agent_cloture?: string | null;
  signataire_locataire_cloture?: string | null;
}

// EdlObservationPayload retiré : l'app mobile locataire est en lecture seule
// sur les états des lieux.

// ── EDL côté collaborateur (création + édition terrain) ─────────────────────

export interface EdlCreatePayload {
  type: 'ENTREE' | 'SORTIE';
  location_id: number;
  date_edl?: string | null;
}

export interface EdlUpdatePayload {
  pieces?: EdlPiece[];
  interventions?: Array<{ libelle: string; fait: boolean }>;
  statut?: EdlStatut;
  date_edl?: string | null;
  date_signature?: string | null;
  signataire_agent?: string | null;
  signataire_locataire?: string | null;
  notes?: string | null;
}

export interface LocationForEdl {
  id: number;
  locataire_nom: string | null;
  unite_nom: string | null;
  unite_id: number | null;
}

export interface InterventionCreatePayload {
  titre?: string;
  description: string;
  priorite?: InterventionPriorite;
  categorie?: string;
  contact_nom?: string;
  contact_tel?: string;
  dispo_jours?: string;
  dispo_heures?: string;
  photos?: string[]; // data URLs base64
  /** Cas multi-baux : précise le bail concerné. */
  location_id?: number;
  /** LOGEMENT (par défaut) | PARTIES_COMMUNES */
  portee?: InterventionPortee;
}

// ── Propriétaire ────────────────────────────────────────────────────────────

export interface DemoProprietaireCandidate {
  id: number;
  nom: string;
  type: string;
  ville: string | null;
  numero: string | null;
}

export interface ProprietaireProfile {
  id: number;
  numero: string | null;
  nom: string;
  type: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
  societe_nom: string | null;
  representant: string | null;
  infos_bancaires: string | null;
  biens_total: number;
  biens_loues: number;
  biens_vacants: number;
}

export interface ProprietaireBien {
  id: number;
  reference: string | null;
  nom: string;
  type: string;
  surface: number | null;
  etage: string | null;
  statut: string;
  loyer: number;
  charges: number;
  loyer_total: number;
  gestion_pourcent: number;
  immeuble: {
    id: number;
    nom: string | null;
    ville: string | null;
    quartier: string | null;
  } | null;
  photo: string | null; // data URL de la 1ère photo
  location: {
    id: number;
    locataire_id: number | null;
    locataire_nom: string | null;
    date_debut: string | null;
    date_fin: string | null;
    loyer_ht: number;
    charges: number;
  } | null;
  est_loue: boolean;
  retard_montant: number;
  retard_count: number;
  retard_mois?: string[];
}

export type TransactionKind = 'INCOME' | 'EXPENSE' | 'COMMISSION';

export interface ProprietaireTransaction {
  id: string;
  kind: TransactionKind;
  date: string | null;
  amount: number;
  label: string;
  description: string | null;
  unite_id: number | null;
  unite_ref: string | null;
  facture_id?: number;
}

export interface ProprietaireInterventionSummary {
  id: number;
  reference: string | null;
  categorie: string | null;
  statut: string;
  priorite: string;
  titre: string | null;
  unite_id: number | null;
  unite_nom: string | null;
  locataire_nom: string | null;
  created_at: string | null;
  cout: number;
  cout_validation_statut?: 'NONE' | 'PENDING' | 'VALIDATED' | 'REFUSED';
  cout_validation_note?: string | null;
}

export interface DevisLigne {
  designation?: string;
  quantite?: number;
  prix_unitaire?: number;
  total_ht?: number;
}

export interface ProprietaireDevis {
  id: number;
  intervention_id: number;
  reference: string | null;
  statut: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  lignes: DevisLigne[];
  note_collaborateur: string | null;
  note_proprietaire: string | null;
  lot: string | null;
  fournisseur_nom: string | null;
  /** Un fichier (photo/scan/PDF) est joint au devis et peut être visualisé. */
  a_fichier: boolean;
  fichier_nom: string | null;
  fichier_mime: string | null;
  valide_at: string | null;
  refuse_at: string | null;
  created_at: string | null;
}

/** Fichier joint d'un devis, renvoyé par `/devis/{id}/fichier` (data en base64). */
export interface DevisFichier {
  nom: string | null;
  mime: string | null;
  data: string;
}

export interface FacturePrestataire {
  kind: 'EXPENSE' | 'DOCUMENT';
  id: number;
  date: string | null;
  reference: string | null;
  categorie: string | null;
  tiers: string | null;
  amount: number | null;
  description: string | null;
  document_id: number | null;
  mime?: string | null;
}

export interface ProprietaireInterventionDetail extends ProprietaireInterventionSummary {
  description: string | null;
  dispo_jours: string | null;
  dispo_heures: string | null;
  contact_nom: string | null;
  contact_tel: string | null;
  intervenant_nom: string | null;
  date_cloture: string | null;
  photos: string[];
  rapport: string | null;
  devis: ProprietaireDevis[];
  factures_prestataire: FacturePrestataire[];
}

export interface DecompteBienRow {
  unite_id: number;
  reference: string;
  nom: string | null;
  encaisse: number;
  decaisse: number;
  commissions: number;
  net: number;
}

export interface ProprietaireDecompte {
  year: number;
  month: number;
  total_encaisse: number;
  total_decaisse: number;
  total_commissions: number;
  total_net: number;
  /** Reversements déjà payés au propriétaire sur la période */
  total_reverse: number;
  /** Solde réel = net - reverse (ce qu'il reste concrètement à verser) */
  total_solde: number;
  tsil_du?: number;
  biens: DecompteBienRow[];
}

// ── Décompte instant T (KPIs cumulés) ───────────────────────────────────────

export interface ProprietaireDecompteGlobal {
  total_encaisse: number;
  total_decaisse: number;
  total_commissions: number;
  total_net: number;
  total_reverse: number;
  total_solde: number;
  total_tsil_due: number;
  tsil_brut: number;
  tsil_paye: number;
  tsil_du: number;
}

// ── Décompte détaillé (structure identique au service web pour PDF) ─────────

export interface DecompteMouvementMois {
  label: string;        // "Mars 2026"
  pct: number | null;   // null = mois entièrement réglé, sinon % du mois couvert
}

export interface DecompteMouvement {
  date: string | null;
  type: 'entree' | 'sortie';
  motif: string;
  montant: number;
  mois?: DecompteMouvementMois[];
}

export interface DecompteUnite {
  id: number | null;
  nom: string;
  gestion_type: string | null;
  gestion_pourcent: number;
  encaisse: number;
  commission: number;
  decaisse: number;
  net: number;
  mouvements: DecompteMouvement[];
}

export interface DecompteImmeuble {
  id: number;
  nom: string;
  encaisse: number;
  commission: number;
  decaisse: number;
  net: number;
  tsil_reverse?: number;
  unites: DecompteUnite[];
}

export interface DecompteReversement {
  date: string | null;
  motif: string;
  montant: number;
}

export interface DecompteTsil {
  tsil_brut: number;
  tsil_paye: number;
  tsil_du: number;
}

export interface DecompteTotal {
  encaisse: number;
  decaisse: number;
  commission: number;
  net: number;
  reverse?: number;
  solde?: number;
  commission_facturee?: number;
  commission_nette?: number;
  tsil_due?: number;
  tsil_reverse?: number;
}

export interface DecompteSettings {
  company_name: string | null;
  telephone: string | null;
  email_societe: string | null;
  logo_base64: string | null;
}

export interface ProprietaireDecompteDetail {
  proprietaire: {
    id: number;
    nom: string;
    numero: string | null;
    email: string | null;
    telephone: string | null;
    infos_bancaires: string | null;
  };
  immeubles: DecompteImmeuble[];
  reversements: DecompteReversement[];
  tsil: DecompteTsil;
  total: DecompteTotal;
  settings: DecompteSettings;
  date_from: string | null;
  date_to: string | null;
}

// ── Unités possédées (pour multi-select) ────────────────────────────────────

export interface ProprietaireUnite {
  id: number;
  reference: string;
  immeuble_nom: string | null;
}

// ── Annonces (bandeau accueil locataire) ────────────────────────────────────

export interface Annonce {
  id: number;
  immeuble_id: number;
  message: string;
  niveau: 'IMPORTANT' | 'URGENT';
  created_at: string | null;
  expires_at: string | null;
}

// ── RDV à venir (bandeau accueil locataire) ─────────────────────────────────

export interface LocataireUpcomingRdv {
  id: number;
  objet: string;
  date_rdv: string;   // YYYY-MM-DD
  heure_rdv: string;  // HH:MM
  adresse: string | null;
}


// ── Prochaine échéance (mois de loyer impayés) ──────────────────────────────

export interface EcheanceMois {
  iso: string;          // 'YYYY-MM'
  label: string;        // 'Mai 2026'
  montant_du: number;
  facture_id: number | null;
  facture_numero: string | null;
  echeance: string | null;
}

export interface ProchaineEcheance {
  is_arrears: boolean;
  months: EcheanceMois[];
  total_du: number;
}


// ── Collaborateur ───────────────────────────────────────────────────────────

export interface RendezVousMobile {
  id: number;
  client_id: number | null;
  created_by: number;
  objet: string;
  date_rdv: string;     // YYYY-MM-DD
  heure_rdv: string;    // HH:MM
  adresse: string | null;
  notes: string | null;
  notification_mail: boolean;
  membres_ids: string | null;  // JSON list
  statut: string;
  client: { id: number; nom: string; email: string | null } | null;
  created_at: string;
}

export interface RendezVousCreatePayload {
  client_id?: number | null;
  // Interlocuteur polymorphique du RDV (locataire / propriétaire / prestataire / autre)
  tiers_type?: 'LOCATAIRE' | 'PROPRIETAIRE' | 'PRESTATAIRE' | 'AUTRE';
  tiers_id?: number;
  tiers_nom_libre?: string;
  tiers_contact_libre?: string;
  objet: string;
  date_rdv: string;
  heure_rdv: string;
  adresse?: string | null;
  notes?: string | null;
  notification_mail?: boolean;
  membres_ids?: number[];
  emails_externes?: string[];
}

export interface CollaborateurUserOption {
  id: number;
  nom: string;
  prenom: string;
  email: string | null;
  user_type: string;
}

export interface CollabInterventionSummary {
  id: number;
  reference: string | null;
  titre: string;
  categorie: string | null;
  priorite: string;
  statut: string;
  unite_id: number | null;
  unite_nom: string | null;
  locataire_nom: string | null;
  intervenant_nom: string | null;
  cout: number;
  created_at: string | null;
  date_cloture: string | null;
}

export interface InterventionMessage {
  id: number;
  intervention_id: number;
  user_id: number;
  user_name: string | null;
  from_role: 'COLLABORATEUR' | 'ADMIN' | 'LOCATAIRE';
  text: string;
  created_at: string | null;
}

export interface CollabDevis {
  id: number;
  intervention_id: number;
  lot: string | null;
  fournisseur_nom: string | null;
  montant: number;
  reference: string | null;
  commentaire: string | null;
  statut: string;
  a_fichier: boolean;
  fichier_nom: string | null;
}

export interface CollabInterventionDetail extends CollabInterventionSummary {
  description: string | null;
  rapport: string | null;
  messages: InterventionMessage[];
  devis: CollabDevis[];
}

export interface CatalogueUnite {
  id: number;
  reference: string;
  nom: string;
  type: string;
  surface: number | null;
  nombre_chambres: number;
  nombre_sdb: number;
  nb_parking: number;
  loyer: number;
  charges: number;
  etage: string | null;
  photo: string | null;  // data URL (1ère photo)
  immeuble: { id: number; nom: string | null; ville: string | null; quartier: string | null } | null;
}

export interface CatalogueUniteDetail extends CatalogueUnite {
  statut: string;
  charges_exceptionnelles: number;
  caution: number;
  commodites: string[];
  description: string | null;
  date_disponibilite: string | null;
  immeuble: (CatalogueUnite['immeuble'] & { adresse?: string | null; amenities?: string[] }) | null;
}

// ── WebSocket events ────────────────────────────────────────────────────────

export interface WsEvent {
  type: string;
  payload: Record<string, unknown>;
  ts: number;
}

// ── API error standard ──────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}
