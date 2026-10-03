import { LocataireTabs } from './LocataireTabs';

// La pile racine de l'espace Locataire se limite désormais aux onglets.
// Les écrans de détail (Bien, BailDetail, FactureDetail, Attestation,
// InterventionDetail, InterventionCreate, EdlDetail) sont imbriqués DANS la
// pile de chaque onglet concerné — cf. LocataireTabs.tsx. La barre d'onglets
// reste ainsi visible sur toutes les pages.
export function LocataireStack() {
  return <LocataireTabs />;
}
