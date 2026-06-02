import { EvaluationNoteDto } from '../services/company/company.models';

/** Critères visibles et saisissables par l'encadrant professionnel (sans Ponctualité). */
export const ENCADRANT_PROFESSIONNEL_CRITERIA = [
  'Qualité du travail',
  'Communication professionnelle',
  'Respect des consignes',
  'Autonomie'
] as const;

/** Seul critère visible et saisissable par le responsable entreprise. */
export const RESPONSABLE_ENTREPRISE_CRITERIA = ['Ponctualité'] as const;

export interface RoleCriterionDraft {
  critereLibelle: string;
  critereEvaluationId: number | null;
  note: number | null;
  commentaire: string;
}

export interface EvaluationNoteLike {
  critereLibelle?: string | null;
  note?: number | null;
  bareme?: number | null;
  commentaire?: string | null;
}

export function normalizeCriterionLabel(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function isPonctualiteLabel(value: string | null | undefined): boolean {
  return normalizeCriterionLabel(value).includes('ponctual');
}

/** Aligné sur {@code EvaluationCriteriaCatalog#matchesCriterionLabel} côté backend. */
export function matchesRoleCriterionLabel(
  noteLabel: string | null | undefined,
  allowedLabel: string
): boolean {
  const note = normalizeCriterionLabel(noteLabel ?? '');
  const allowed = normalizeCriterionLabel(allowedLabel);
  if (!note || !allowed) {
    return false;
  }
  if (allowed.includes('ponctual') || note.includes('ponctual')) {
    return note.includes('ponctual');
  }
  return note === allowed;
}

export function buildRoleCriteriaDrafts(
  allowedLabels: readonly string[],
  notes: Array<{
    critereLibelle?: string | null;
    critereEvaluationId?: number | null;
    note?: number | null;
    commentaire?: string | null;
  }> = []
): RoleCriterionDraft[] {
  const byLabel = new Map<string, (typeof notes)[0]>();
  for (const note of notes) {
    for (const label of allowedLabels) {
      if (matchesRoleCriterionLabel(note.critereLibelle, label)) {
        byLabel.set(normalizeCriterionLabel(label), note);
      }
    }
  }

  return allowedLabels.map((label) => {
    const existing = byLabel.get(normalizeCriterionLabel(label));
    return {
      critereLibelle: label,
      critereEvaluationId: existing?.critereEvaluationId ?? null,
      note: existing?.note != null ? Number(existing.note) : null,
      commentaire: String(existing?.commentaire ?? '').trim()
    };
  });
}

export function countScoredCriteriaForRole(
  allowedLabels: readonly string[],
  notes: Array<{ critereLibelle?: string | null; note?: number | null }> = []
): number {
  return allowedLabels.filter((label) =>
    notes.some(
      (note) =>
        matchesRoleCriterionLabel(note.critereLibelle, label)
        && note.note != null
        && Number.isFinite(Number(note.note))
    )
  ).length;
}

/**
 * Moyenne des notes de critères sur /5.
 * FinalScore = (somme des notes) / (nombre de critères évalués)
 */
export function finalScoreOnFiveFromNotes(notes: EvaluationNoteLike[]): number {
  const valid = notes.filter((item) => item.note != null && Number.isFinite(Number(item.note)));
  if (!valid.length) {
    return 0;
  }
  const average = valid.reduce((total, item) => {
    const bareme = item.bareme != null && item.bareme > 0 ? Number(item.bareme) : 5;
    return total + (Number(item.note) / bareme) * 5;
  }, 0) / valid.length;
  return Math.round(average * 10) / 10;
}

export function formatFinalScoreOnFive(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(Number(score)) || Number(score) <= 0) {
    return '—';
  }
  const rounded = Math.round(Number(score) * 10) / 10;
  return `${rounded} / 5`;
}

/** @deprecated Utiliser finalScoreOnFiveFromNotes */
export function averageNormalizedScoreOnFive(notes: EvaluationNoteLike[]): number {
  return finalScoreOnFiveFromNotes(notes);
}

/** @deprecated Utiliser finalScoreOnFiveFromNotes */
export function finalScoreOn20FromNotes(notes: EvaluationNoteLike[]): number {
  return finalScoreOnFiveFromNotes(notes);
}

/** @deprecated Utiliser formatFinalScoreOnFive */
export function formatFinalScoreOn20(score: number | null | undefined): string {
  return formatFinalScoreOnFive(score);
}

/** Fusionne les brouillons du rôle courant avec les autres notes déjà enregistrées sur la fiche. */
export function mergeRoleDraftsWithFicheNotes(
  roleDrafts: RoleCriterionDraft[],
  ficheNotes: EvaluationNoteLike[],
  allowedRoleLabels: readonly string[]
): EvaluationNoteLike[] {
  const roleNotes: EvaluationNoteLike[] = roleDrafts
    .filter((item) => item.note != null && Number.isFinite(Number(item.note)))
    .map((item) => ({
      critereLibelle: item.critereLibelle,
      note: item.note,
      bareme: 5
    }));

  const otherNotes = (ficheNotes ?? []).filter((note) => {
    const matchesRole = allowedRoleLabels.some((label) =>
      matchesRoleCriterionLabel(note.critereLibelle, label)
    );
    return !matchesRole && note.note != null && Number.isFinite(Number(note.note));
  });

  return [...roleNotes, ...otherNotes];
}

export function buildNotesPayloadFromDrafts(drafts: RoleCriterionDraft[]): EvaluationNoteDto[] {
  return drafts.map((item) => ({
    critereEvaluationId: item.critereEvaluationId,
    critereLibelle: item.critereLibelle,
    note: Number(item.note ?? 0),
    poids: 1,
    bareme: 5,
    commentaire: String(item.commentaire ?? '').trim()
  }));
}

export function areAllCriteriaScoresValid(drafts: RoleCriterionDraft[]): boolean {
  return drafts.length > 0
    && drafts.every((item) => item.note != null && item.note >= 0 && item.note <= 5);
}

export const EVALUATION_SIGN_INCOMPLETE_MESSAGE =
  'Veuillez compléter la fiche avant de signer';

function isRequiredEvaluationText(value: string | null | undefined): boolean {
  return String(value ?? '').trim().length >= 4;
}

/** Partie encadrant pro : textes + notes EP + flag API. */
export function isEncadrantProfessionnelPartReadyForSign(
  evaluation: {
    pretSignatureEncadrantProfessionnel?: boolean;
    pointFortEncadrantPro?: string | null;
    axeAmeliorationEncadrantPro?: string | null;
  } | null | undefined,
  drafts?: RoleCriterionDraft[]
): boolean {
  if (!evaluation?.pretSignatureEncadrantProfessionnel) {
    return false;
  }
  const axes =
    String(evaluation.axeAmeliorationEncadrantPro ?? '').trim()
    || String(evaluation.pointFortEncadrantPro ?? '').trim();
  if (!isRequiredEvaluationText(evaluation.pointFortEncadrantPro) || !isRequiredEvaluationText(axes)) {
    return false;
  }
  if (drafts && !areAllCriteriaScoresValid(drafts)) {
    return false;
  }
  return true;
}

/** Partie responsable entreprise : textes + note Ponctualité + flag API. */
export function isResponsableEntreprisePartReadyForSign(
  evaluation: {
    pretSignatureResponsableEntreprise?: boolean;
    pointFortResponsableEntreprise?: string | null;
    axeAmeliorationResponsableEntreprise?: string | null;
  } | null | undefined,
  drafts?: RoleCriterionDraft[]
): boolean {
  if (!evaluation?.pretSignatureResponsableEntreprise) {
    return false;
  }
  const axes =
    String(evaluation.axeAmeliorationResponsableEntreprise ?? '').trim()
    || String(evaluation.pointFortResponsableEntreprise ?? '').trim();
  if (!isRequiredEvaluationText(evaluation.pointFortResponsableEntreprise) || !isRequiredEvaluationText(axes)) {
    return false;
  }
  if (drafts && !areAllCriteriaScoresValid(drafts)) {
    return false;
  }
  return true;
}

/** @deprecated Utiliser finalScoreOnFiveFromNotes */
export function averageScoreOverFive(scores: Array<number | null | undefined>): number {
  return finalScoreOnFiveFromNotes(scores.map((note) => ({ note, bareme: 5 })));
}
