import { ProprietaireTabs } from './ProprietaireTabs';

// La pile racine de l'espace Propriétaire se limite désormais aux onglets.
// Les écrans de détail (BienDetail, FactureDetail, InterventionDetail,
// DevisDecision, Transactions) sont imbriqués DANS la pile de chaque onglet
// concerné — cf. ProprietaireTabs.tsx. La barre d'onglets reste ainsi visible
// sur toutes les pages.
export function ProprietaireStack() {
  return <ProprietaireTabs />;
}
