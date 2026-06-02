import { EnqueteSatisfaction, EnqueteStageDto } from '../../services/enquete.service';

/** États visuels unifiés sur toute la plateforme. */
export type SatisfactionSurveyVisualState =
  | 'not_open_yet'
  | 'active'
  | 'unavailable'
  | 'closed';

export interface SatisfactionSurveyViewModel {
  visualState: SatisfactionSurveyVisualState;
  badgeLabel: string;
  stateTitle: string;
  stateDescription: string;
  detailMessage?: string;
  surveyTitle: string;
  surveyDescription: string;
  canRespond: boolean;
  showSurveyDetails: boolean;
  showInfoBlock: boolean;
}

export interface ResolveSatisfactionSurveyOptions {
  /** Afficher le bloc « À propos » (page dédiée). */
  showInfoBlock?: boolean;
}

const DEFAULT_SURVEY_TITLE = 'Enquête de satisfaction';

const COPY = {
  notOpenTitle: 'Période non commencée',
  notOpenDescription:
    "La période de participation à l'enquête n'a pas encore commencé. Elle sera accessible à partir de la date de fin de votre stage.",
  activeTitle: 'Enquête ouverte',
  activeDescription:
    "L'enquête de satisfaction est actuellement active. Vous pouvez répondre au formulaire pendant la période prévue.",
  unavailableTitle: 'Enquête indisponible',
  unavailableDescription:
    "L'enquête de satisfaction n'est pas accessible pour le moment.",
  notConfiguredDescription:
    "Le formulaire n'est pas encore configuré. Contactez le responsable des stages.",
  closedTitle: 'Période terminée',
  closedDescription:
    "La période de participation à l'enquête est clôturée.",
  badgeNotOpen: 'Pas encore ouverte',
  badgeActive: 'Enquête active',
  badgeUnavailable: 'Indisponible',
  badgeNotConfigured: 'Non configurée',
  badgeClosed: 'Période clôturée'
} as const;

function urlIsValid(url?: string | null): boolean {
  const value = (url ?? '').trim();
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Résout l'affichage unifié à partir de la réponse backend GET /enquete/stage/{id}.
 * Messages et libellés identiques pour tous les rôles.
 */
export function resolveSatisfactionSurveyView(
  enquete: EnqueteStageDto,
  options: ResolveSatisfactionSurveyOptions = {}
): SatisfactionSurveyViewModel {
  const surveyTitle = (enquete.titre ?? '').trim() || DEFAULT_SURVEY_TITLE;
  const surveyDescription = (enquete.description ?? '').trim();
  const detailMessage = (enquete.message ?? '').trim() || undefined;
  const canRespond =
    enquete.sectionEnqueteOuverte === true && urlIsValid(enquete.urlFormulaire);

  if (enquete.statut === 'Fermée') {
    return {
      visualState: 'closed',
      badgeLabel: COPY.badgeClosed,
      stateTitle: COPY.closedTitle,
      stateDescription: COPY.closedDescription,
      detailMessage,
      surveyTitle,
      surveyDescription,
      canRespond: false,
      showSurveyDetails: true,
      showInfoBlock: false
    };
  }

  if (enquete.statut === 'En attente') {
    return {
      visualState: 'not_open_yet',
      badgeLabel: COPY.badgeNotOpen,
      stateTitle: COPY.notOpenTitle,
      stateDescription: COPY.notOpenDescription,
      detailMessage,
      surveyTitle,
      surveyDescription,
      canRespond: false,
      showSurveyDetails: false,
      showInfoBlock: false
    };
  }

  if (canRespond && enquete.statut === 'Ouverte') {
    return {
      visualState: 'active',
      badgeLabel: COPY.badgeActive,
      stateTitle: COPY.activeTitle,
      stateDescription: COPY.activeDescription,
      detailMessage,
      surveyTitle,
      surveyDescription,
      canRespond: true,
      showSurveyDetails: true,
      showInfoBlock: options.showInfoBlock === true
    };
  }

  const notConfigured = enquete.statut === 'Non configurée';
  return {
    visualState: 'unavailable',
    badgeLabel: notConfigured ? COPY.badgeNotConfigured : COPY.badgeUnavailable,
    stateTitle: notConfigured ? 'Enquête non configurée' : COPY.unavailableTitle,
    stateDescription: notConfigured
      ? COPY.notConfiguredDescription
      : COPY.unavailableDescription,
    detailMessage,
    surveyTitle,
    surveyDescription,
    canRespond: false,
    showSurveyDetails: true,
    showInfoBlock: false
  };
}

/** Aperçu admin : état global sans action « Répondre ». */
export function resolveSatisfactionSurveyAdminPreview(
  enquete: EnqueteSatisfaction | null
): SatisfactionSurveyViewModel | null {
  if (!enquete) {
    return null;
  }

  const titre = (enquete.titre ?? '').trim();
  const description = (enquete.description ?? '').trim();
  const urlOk = urlIsValid(enquete.urlFormulaire);

  if (!titre || !description || !urlOk) {
    return {
      visualState: 'unavailable',
      badgeLabel: COPY.badgeNotConfigured,
      stateTitle: 'Enquête non configurée',
      stateDescription: COPY.notConfiguredDescription,
      surveyTitle: titre || DEFAULT_SURVEY_TITLE,
      surveyDescription: description,
      canRespond: false,
      showSurveyDetails: true,
      showInfoBlock: false
    };
  }

  if (!enquete.active) {
    return {
      visualState: 'unavailable',
      badgeLabel: COPY.badgeUnavailable,
      stateTitle: COPY.unavailableTitle,
      stateDescription: COPY.unavailableDescription,
      surveyTitle: titre,
      surveyDescription: description,
      canRespond: false,
      showSurveyDetails: true,
      showInfoBlock: false
    };
  }

  return {
    visualState: 'active',
    badgeLabel: COPY.badgeActive,
    stateTitle: COPY.activeTitle,
    stateDescription:
      "Configuration active : les utilisateurs verront cette enquête lorsque leur période de participation sera ouverte.",
    surveyTitle: titre,
    surveyDescription: description,
    canRespond: false,
    showSurveyDetails: true,
    showInfoBlock: false
  };
}

/** Fallback lorsqu'aucun stage n'est associé à l'utilisateur. */
export function buildPendingSurveyDto(message?: string): EnqueteStageDto {
  return {
    titre: DEFAULT_SURVEY_TITLE,
    description: '',
    urlFormulaire: '',
    statut: 'En attente',
    sectionEnqueteOuverte: false,
    message:
      message ??
      "Aucun stage actif trouvé. L'enquête sera accessible après la fin de votre stage."
  };
}
