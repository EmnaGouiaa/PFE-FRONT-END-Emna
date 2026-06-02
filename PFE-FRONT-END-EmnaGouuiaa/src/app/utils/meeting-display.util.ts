/** Valeur affichable ou libellé de repli. */
export function meetingDisplayValue(
  value: string | null | undefined,
  fallback = 'Non renseigné'
): string {
  const trimmed = String(value ?? '').trim();
  return trimmed || fallback;
}

/** Normalise participantNoms (Set JSON → tableau) ou participantNames. */
export function normalizeParticipantNames(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  if (raw && typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>)
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);
  }
  return [];
}

export function formatPersonName(
  prenom?: string | null,
  nom?: string | null
): string {
  return `${prenom ?? ''} ${nom ?? ''}`.trim();
}

/** Nom complet depuis un objet utilisateur API (prenom/nom ou fullName). */
export function formatUserFullName(raw: unknown): string {
  if (!raw || typeof raw !== 'object') {
    return '';
  }
  const record = raw as Record<string, unknown>;
  const explicit = String(record['fullName'] ?? '').trim();
  if (explicit) {
    return explicit;
  }
  return formatPersonName(
    String(record['prenom'] ?? ''),
    String(record['nom'] ?? '')
  );
}

export interface MeetingCreatorFields {
  typeEncadrantCreateur: string;
  nomEncadrantCreateur: string;
  encadrantCreateurId: number | null;
}

export function pickMeetingCreatorFields(raw: unknown): MeetingCreatorFields {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const encadrantCreateurId = Number(record['encadrantCreateurId']);
  return {
    typeEncadrantCreateur: String(record['typeEncadrantCreateur'] ?? ''),
    nomEncadrantCreateur: String(record['nomEncadrantCreateur'] ?? ''),
    encadrantCreateurId:
      Number.isFinite(encadrantCreateurId) && encadrantCreateurId > 0
        ? encadrantCreateurId
        : null
  };
}

/** Nom du tuteur / responsable entreprise depuis la réponse API réunion. */
export function pickMeetingCompanySupervisorName(raw: unknown): string {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const direct = String(
    record['nomTuteurEntreprise'] ??
      record['tuteurEntrepriseNom'] ??
      record['nomResponsableEntreprise'] ??
      ''
  ).trim();
  if (direct) {
    return direct;
  }
  return formatUserFullName(record['tuteurEntreprise']);
}

export interface MeetingStageContext {
  academicSupervisor?: { id?: number | null; fullName?: string };
  professionalSupervisor?: { id?: number | null; fullName?: string };
  companySupervisor?: { fullName?: string };
  company?: { nom?: string };
}

export function resolveMeetingCreatorName(
  meeting: MeetingCreatorFields,
  stage?: MeetingStageContext | null
): string {
  const explicit = String(meeting.nomEncadrantCreateur ?? '').trim();
  if (explicit) {
    return explicit;
  }

  const type = String(meeting.typeEncadrantCreateur ?? '').trim().toUpperCase();
  if (stage) {
    if (type === 'ACADEMIQUE') {
      return meetingDisplayValue(stage.academicSupervisor?.fullName);
    }
    if (type === 'PROFESSIONNEL') {
      return meetingDisplayValue(stage.professionalSupervisor?.fullName);
    }
    if (meeting.encadrantCreateurId) {
      if (stage.academicSupervisor?.id === meeting.encadrantCreateurId) {
        return meetingDisplayValue(stage.academicSupervisor?.fullName);
      }
      if (stage.professionalSupervisor?.id === meeting.encadrantCreateurId) {
        return meetingDisplayValue(stage.professionalSupervisor?.fullName);
      }
    }
  }

  return 'Non renseigné';
}

export function resolveMeetingCreatorTypeLabel(
  typeEncadrantCreateur: string | null | undefined
): string {
  const type = String(typeEncadrantCreateur ?? '').trim().toUpperCase();
  if (type === 'ACADEMIQUE') {
    return 'Encadrant académique';
  }
  if (type === 'PROFESSIONNEL') {
    return 'Encadrant professionnel';
  }
  return type ? type : 'Non renseigné';
}

export function resolveMeetingCompanySupervisorName(
  apiName: string | null | undefined,
  stage?: MeetingStageContext | null
): string {
  const fromApi = String(apiName ?? '').trim();
  if (fromApi) {
    return fromApi;
  }
  return meetingDisplayValue(stage?.companySupervisor?.fullName);
}
