import { FacultyOffer } from '../../services/faculty/faculty.models';

/** Offre approuvée par le responsable des stages (modifiable). */
export function isFacultyOfferApproved(offer: FacultyOffer | null | undefined): boolean {
  if (!offer?.statut) {
    return false;
  }
  return offer.statut === 'PUBLIEE' || offer.statut === 'VALIDEE';
}

export function isFacultyOfferLockedForEdit(offer: FacultyOffer): boolean {
  return offer.stageTermine === true || offer.stageCree === true || offer.statut === 'AFFECTEE';
}

/** Boutons « Voir détails » + « Modifier » sur la carte. */
export function canShowFacultyOfferEditActions(offer: FacultyOffer): boolean {
  return isFacultyOfferApproved(offer);
}

export function canFacultyEditOffer(offer: FacultyOffer): boolean {
  return isFacultyOfferApproved(offer) && !isFacultyOfferLockedForEdit(offer);
}
