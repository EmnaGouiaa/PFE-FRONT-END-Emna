import { DemandeStage, StatutDemande, StatutValidation } from '../models/demande-stage.model';

/** Mappe les statuts backend (VALIDEE, REFUSEE…) vers l’enum UI. */
export function mapBackendValidationStatus(value: unknown): StatutValidation {
  const status = String(value ?? '').trim().toUpperCase();

  switch (status) {
    case 'VALIDEE':
    case StatutValidation.APPROUVEE:
      return StatutValidation.APPROUVEE;
    case 'REFUSEE':
    case StatutValidation.REJETEE:
      return StatutValidation.REJETEE;
    case StatutValidation.EN_ATTENTE:
      return StatutValidation.EN_ATTENTE;
    default:
      return StatutValidation.EN_ATTENTE;
  }
}

export function mapBackendDemandeStatus(value: unknown): StatutDemande {
  const status = String(value ?? '').trim().toUpperCase();

  switch (status) {
    case 'VALIDEE':
      return StatutDemande.APPROUVEE;
    case 'REFUSEE':
      return StatutDemande.REJETEE;
    default:
      return (Object.values(StatutDemande) as string[]).includes(status)
        ? (status as StatutDemande)
        : StatutDemande.EN_ATTENTE;
  }
}

/** Statut responsable dérivé des champs API (y compris repli sur statut global VALIDEE). */
export function deriveResponsibleValidationStatus(raw: Record<string, unknown> | null | undefined): StatutValidation {
  const direct = mapBackendValidationStatus(
    raw?.['statutValidationResponsableStages'] ?? raw?.['statutResponsableStages']
  );
  if (direct !== StatutValidation.EN_ATTENTE) {
    return direct;
  }

  const global = String(raw?.['statut'] ?? '').trim().toUpperCase();
  if (global === 'VALIDEE' || global === 'APPROUVEE') {
    return StatutValidation.APPROUVEE;
  }
  if (global === 'REFUSEE' || global === 'REJETEE') {
    return StatutValidation.REJETEE;
  }

  return StatutValidation.EN_ATTENTE;
}

export function isResponsibleApproved(status: StatutValidation | undefined): boolean {
  return (status ?? StatutValidation.EN_ATTENTE) === StatutValidation.APPROUVEE;
}

export function canResponsibleActOnRequest(request: DemandeStage): boolean {
  return !isResponsibleApproved(request.statutValidationResponsableStages)
    && (request.statutValidationResponsableStages ?? StatutValidation.EN_ATTENTE) !== StatutValidation.REJETEE
    && request.statut !== StatutDemande.REJETEE
    && request.statut !== StatutDemande.APPROUVEE;
}

export function isCompanyRequestFullyApproved(request: DemandeStage): boolean {
  return isResponsibleApproved(request.statutValidationResponsableStages)
    || request.statut === StatutDemande.APPROUVEE;
}

export function formatResponsibleStatusLabel(status: StatutValidation | undefined): string {
  switch (status ?? StatutValidation.EN_ATTENTE) {
    case StatutValidation.APPROUVEE:
      return 'Approuvée';
    case StatutValidation.REJETEE:
      return 'Refusée';
    default:
      return 'En attente';
  }
}

export function formatStoredValidationLabel(value: StatutValidation | string | undefined | null): string {
  if (value != null && Object.values(StatutValidation).includes(value as StatutValidation)) {
    return formatResponsibleStatusLabel(value as StatutValidation);
  }
  return formatResponsibleStatusLabel(mapBackendValidationStatus(value));
}

export function formatStoredGlobalLabel(statut: unknown, responsableStatut?: unknown): string {
  const request = {
    statut: mapBackendDemandeStatus(statut),
    statutValidationResponsableStages: deriveResponsibleValidationStatus({
      statut,
      statutResponsableStages: responsableStatut,
      statutValidationResponsableStages: responsableStatut,
    }),
  } as DemandeStage;
  return formatCompanyRequestGlobalLabel(request);
}

export function formatCompanyRequestGlobalLabel(request: DemandeStage): string {
  if (request.statut === StatutDemande.REJETEE || request.statutValidationResponsableStages === StatutValidation.REJETEE) {
    return 'Refusée';
  }
  if (isCompanyRequestFullyApproved(request)) {
    return 'Validée';
  }
  return 'En attente';
}
