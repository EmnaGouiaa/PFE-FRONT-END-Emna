/** Statuts métier affichés dans le suivi des stages (Responsable des stages). */

export type FacultyStageSuiviStatut = 'NON_COMMENCE' | 'EN_COURS' | 'TERMINE' | 'REFUSE';



export type FacultyStageStatusFilter = 'ALL' | FacultyStageSuiviStatut;



export const FACULTY_STAGE_STATUS_FILTERS: ReadonlyArray<{

  value: FacultyStageStatusFilter;

  label: string;

}> = [

  { value: 'ALL', label: 'Tous les stages' },

  { value: 'EN_COURS', label: 'En cours' },

  { value: 'TERMINE', label: 'Terminé' },

  { value: 'REFUSE', label: 'Refusé' }

];



/** Regroupe un statut technique API vers le statut métier de suivi. */

export function resolveFacultyStageSuiviStatut(rawStatut: string | null | undefined): FacultyStageSuiviStatut {

  const statut = String(rawStatut ?? '').trim().toUpperCase();

  if (statut === 'TERMINE') {

    return 'TERMINE';

  }

  if (statut === 'REFUSE' || statut === 'ANNULE') {

    return 'REFUSE';

  }

  if (statut === 'EN_COURS') {

    return 'EN_COURS';

  }

  if (

    statut === 'NON_COMMENCE'

    || statut === 'A_VENIR'

    || statut === 'PAS_COMMENCE'

  ) {

    return 'NON_COMMENCE';

  }

  return 'NON_COMMENCE';

}



export function facultyStageSuiviLabel(statutSuivi: string | null | undefined): string {

  switch (resolveFacultyStageSuiviStatut(statutSuivi)) {

    case 'NON_COMMENCE':

      return 'Non commencé';

    case 'TERMINE':

      return 'Terminé';

    case 'REFUSE':

      return 'Refusé';

    default:

      return 'En cours';

  }

}



export function facultyStageSuiviChipClass(statutSuivi: string | null | undefined): string {

  return `status-chip--${resolveFacultyStageSuiviStatut(statutSuivi)}`;

}



export function matchesFacultyStageStatusFilter(

  internshipStatutSuivi: string,

  filter: FacultyStageStatusFilter

): boolean {

  if (filter === 'ALL') {

    return true;

  }

  return resolveFacultyStageSuiviStatut(internshipStatutSuivi) === filter;

}

