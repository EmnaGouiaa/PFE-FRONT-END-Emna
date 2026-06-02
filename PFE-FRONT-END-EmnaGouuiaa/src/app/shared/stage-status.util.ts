/** Libellé français du statut technique d'un stage (API {@code statut}). */
export function formatStageStatutLabel(statut: string | null | undefined): string {
  switch (String(statut ?? '').trim().toUpperCase()) {
    case 'A_VENIR':
    case 'PAS_COMMENCE':
      return 'Non commencé';
    case 'EN_COURS':
      return 'En cours';
    case 'TERMINE':
      return 'Terminé';
    case 'ANNULE':
      return 'Annulé';
    case 'REFUSE':
      return 'Refusé';
    default:
      return String(statut ?? 'INCONNU').replace(/_/g, ' ');
  }
}
